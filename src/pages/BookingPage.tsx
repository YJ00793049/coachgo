import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Calendar, CreditCard, CheckCircle2, ArrowLeft, Loader2, ExternalLink, DollarSign, Clock, Package, Users, RefreshCw, Download } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import Confetti from '../components/Confetti';
import { SPRING, SPRING_BOUNCY } from '../tokens';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, getDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { notify } from '../utils/notifications';
import { track } from '../utils/analytics';
import { MOCK_COACHES } from './CoachesPage';
import type { LocationMode, LocationModes, PromoCode } from '../types';
import {
  addDaysISO, blockedSlots, buildICS, downloadICS,
  enabledLocationModes, LOCATION_MODE_META, getBrowserTimezone, tzAbbrev,
} from '../utils/scheduling';

function buildVenmoUrl(handle: string, amount: number): string {
  const note = encodeURIComponent('CoachGo Session');
  return `https://venmo.com/u/${handle}?txn=pay&amount=${amount}&note=${note}`;
}

function generateCalendarLink(date: string, time: string, sessionType: string, coachName: string, price: number) {
  const title = encodeURIComponent(`CoachGo: ${sessionType} with ${coachName}`);
  const dateStr = date.replace(/-/g, '');
  const timeMap: Record<string, string> = {
    '7:00 AM': '070000', '8:00 AM': '080000', '9:00 AM': '090000', '10:00 AM': '100000',
    '11:00 AM': '110000', '12:00 PM': '120000', '1:00 PM': '130000', '2:00 PM': '140000',
    '3:00 PM': '150000', '4:00 PM': '160000', '5:00 PM': '170000', '6:00 PM': '180000', '7:00 PM': '190000'
  };
  const startTime = timeMap[time] || '090000';
  const endHour = parseInt(startTime.slice(0, 2)) + 1;
  const endTime = `${String(endHour).padStart(2, '0')}${startTime.slice(2)}`;
  const details = encodeURIComponent(`Session: ${sessionType}\nCoach: ${coachName}\nPrice: $${price}\nBooked via CoachGo`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}T${startTime}/${dateStr}T${endTime}&details=${details}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BookingPage() {
  const { coachId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [coachVenmoHandle, setCoachVenmoHandle] = useState<string | null>(null);
  const [coachPackages, setCoachPackages] = useState<Array<{ sessions: number; discount_pct: number; label: string }>>([]);
  const [selectedPackage, setSelectedPackage] = useState<{ sessions: number; discount_pct: number; label: string } | null>(null);
  const [groupSpotsLeft, setGroupSpotsLeft] = useState<number | null>(null);
  const [firestoreCoach, setFirestoreCoach] = useState<any>(null);
  const [firestoreSessionOptions, setFirestoreSessionOptions] = useState<Array<{ label: string; price: number }> | null>(null);
  const [priceError, setPriceError] = useState('');
  const [nameError, setNameError] = useState('');
  const GROUP_CAPACITY = 6;
  // ── Scheduling settings (from coach_profiles) ──
  const [instantBook, setInstantBook] = useState(false);
  const [coachLocationModes, setCoachLocationModes] = useState<LocationModes | undefined>(undefined);
  const [coachBuffer, setCoachBuffer] = useState(0);
  const [coachTimezone, setCoachTimezone] = useState<string | undefined>(undefined);
  const [dayBookedSlots, setDayBookedSlots] = useState<string[]>([]); // taken 1-on-1 slots for buffer blocking
  const [recurringWeeks, setRecurringWeeks] = useState(1);
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [coachPromoCodes, setCoachPromoCodes] = useState<PromoCode[]>([]);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  const [bookingData, setBookingData] = useState({
    sessionType: '',
    date: '',
    time: '',
    playerName: '',
    playerAge: '',
    skillLevel: 'Developing',
    notes: '',
    locationMode: '' as LocationMode | '',
  });

  const locationOptions = enabledLocationModes(coachLocationModes);

  const mockCoach = MOCK_COACHES.find(c => c.id === coachId);
  const coach = mockCoach || firestoreCoach;
  const coachUid = mockCoach?.user_id ?? coachId ?? '';
  const privatePrice = coach?.price_per_session ?? 120;
  const groupPrice = Math.round(privatePrice * 0.4);

  const sessionOptions = firestoreSessionOptions || [
    { label: '1-on-1 Private', price: privatePrice },
    ...(['Robert Congalton', 'Casey Henderson', 'Brandon Decker'].includes(coach?.name || '')
      ? [{ label: 'Group Session', price: groupPrice }]
      : [])
  ];

  const selectedSession = sessionOptions.find(s => s.label === bookingData.sessionType);
  const basePrice = selectedSession?.price ?? privatePrice;
  const subtotal = selectedPackage
    ? Math.round(basePrice * selectedPackage.sessions * (1 - selectedPackage.discount_pct / 100))
    : basePrice;
  const discountAmount = appliedPromo
    ? (appliedPromo.type === 'percent'
        ? Math.round(subtotal * appliedPromo.value / 100)
        : Math.min(subtotal, appliedPromo.value))
    : 0;
  const totalPrice = Math.max(0, subtotal - discountAmount);

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const match = coachPromoCodes.find(p => p.active && p.code.toUpperCase() === code);
    if (!match) { setPromoError("That code isn't valid for this coach."); setAppliedPromo(null); return; }
    setPromoError(''); setAppliedPromo(match);
  };

  useEffect(() => {
    if (!coachId) return;
    const mockCoach = MOCK_COACHES.find(c => c.id === coachId);
    if (mockCoach?.venmo_handle) setCoachVenmoHandle(mockCoach.venmo_handle);

    const fetchCoachData = async () => {
      setLoadingAvailability(true);
      try {
        const snap = await getDoc(doc(db, 'coach_profiles', coachUid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.availability) setAvailability(d.availability);
          if (d.venmo_handle) setCoachVenmoHandle(d.venmo_handle);
          if (d.packages) setCoachPackages(d.packages);
          setInstantBook(d.instant_book === true);
          if (d.location_modes) setCoachLocationModes(d.location_modes);
          setCoachBuffer(Number(d.buffer_minutes) || 0);
          setCoachTimezone(d.timezone || undefined);
          if (Array.isArray(d.promo_codes)) setCoachPromoCodes(d.promo_codes);
          // Build fallback coach for real coaches not in MOCK_COACHES
          if (!mockCoach) {
            setFirestoreCoach({
              id: coachId, user_id: coachId, name: d.name || 'Coach',
              specialty: d.specialty || '', price_per_session: d.price_per_session || 0,
              avatar_url: d.photo_url || undefined, bio: d.bio || '',
              rating: d.rating || 0, reviews: d.reviews || 0,
              skills: d.skills || [], certifications: d.certifications || [],
              years_experience: d.years_experience || 0, session_types: [],
              availability: d.availability || {}, is_active: true,
              venmo_handle: d.venmo_handle || undefined, video_url: d.video_url || undefined,
            });
          }
          // Build session options from Firestore session_types_with_price if available
          if (d.session_types_with_price?.length > 0) {
            setFirestoreSessionOptions(d.session_types_with_price.map((s: any) => ({ label: s.label, price: s.price })));
          }
        }
      } catch {
        // fall through
      } finally {
        setLoadingAvailability(false);
      }
    };
    fetchCoachData();

    // Pre-select package from URL param (e.g. /book/123?pkg=3)
    const pkgSessions = searchParams.get('pkg');
    if (pkgSessions) {
      const matchPkg = coachPackages.find(p => p.sessions === Number(pkgSessions));
      if (matchPkg) setSelectedPackage(matchPkg);
    }
  }, [coachId, coachUid]);

  const availableDays = Object.entries(availability)
    .filter(([_, slots]) => (slots as string[]).length > 0)
    .map(([day]) => day);

  const isDateAvailable = (dateStr: string): boolean => {
    if (availableDays.length === 0) return true;
    const dayName = DAY_NAMES[new Date(dateStr + 'T12:00:00').getDay()];
    return availableDays.includes(dayName);
  };

  const getSlotsForDate = (dateStr: string): string[] => {
    if (!dateStr) return [];
    const dayName = DAY_NAMES[new Date(dateStr + 'T12:00:00').getDay()];
    return availability[dayName] || [];
  };

  const availableSlots = getSlotsForDate(bookingData.date);

  const isGroupSel = bookingData.sessionType.toLowerCase().includes('group');
  const selectedSlotFull = !!bookingData.time && (
    isGroupSel
      ? groupSpotsLeft === 0
      : blockedSlots(dayBookedSlots, coachBuffer, [bookingData.time]).has(bookingData.time)
  );

  const handleDateChange = (dateStr: string) => {
    setBookingData(prev => ({ ...prev, date: dateStr, time: '' }));
  };

  useEffect(() => {
    if (!bookingData.sessionType.toLowerCase().includes('group') || !bookingData.date || !bookingData.time) {
      setGroupSpotsLeft(null);
      return;
    }
    const checkGroupCapacity = async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'bookings'),
          where('coach_id', '==', coachUid),
          where('date', '==', bookingData.date),
          where('time_slot', '==', bookingData.time),
          where('session_type', '==', bookingData.sessionType),
        ));
        const taken = snap.docs.filter(d => ['pending', 'confirmed'].includes(d.data().status)).length;
        setGroupSpotsLeft(Math.max(0, GROUP_CAPACITY - taken));
      } catch { /* non-critical */ }
    };
    checkGroupCapacity();
  }, [bookingData.sessionType, bookingData.date, bookingData.time, coachUid]);

  // Default the location mode once we know what the coach offers
  useEffect(() => {
    const opts = enabledLocationModes(coachLocationModes);
    setBookingData(prev => prev.locationMode ? prev : { ...prev, locationMode: opts[0] });
  }, [coachLocationModes]);

  // Fetch the day's booked 1-on-1 slots (double-book + buffer prevention)
  useEffect(() => {
    if (!bookingData.date || bookingData.sessionType.toLowerCase().includes('group')) {
      setDayBookedSlots([]);
      return;
    }
    const fetchDay = async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'bookings'),
          where('coach_id', '==', coachUid),
          where('date', '==', bookingData.date),
        ));
        setDayBookedSlots(
          snap.docs
            .filter(d => ['pending', 'confirmed'].includes(d.data().status))
            .map(d => d.data().time_slot as string)
            .filter(Boolean)
        );
      } catch { setDayBookedSlots([]); }
    };
    fetchDay();
  }, [bookingData.date, bookingData.sessionType, coachUid]);

  const joinWaitlist = async () => {
    if (!auth.currentUser || !bookingData.date || !bookingData.time) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const playerName = bookingData.playerName.trim()
        || (userDoc.exists() ? userDoc.data().name : '')
        || auth.currentUser.displayName || 'Player';
      await addDoc(collection(db, 'waitlists'), {
        coach_id: coach?.user_id ?? coachId,
        player_id: auth.currentUser.uid,
        player_name: playerName,
        coach_name: coach?.name ?? '',
        date: bookingData.date,
        time_slot: bookingData.time,
        session_type: bookingData.sessionType || '1-on-1 Private',
        created_at: serverTimestamp(),
        notified: false,
      });
      setWaitlistJoined(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'waitlists');
    }
  };

  const nextStep = () => { setDir(1); setStep(s => s + 1); };
  const prevStep = () => { setDir(-1); setStep(s => s - 1); };

  const steps = [
    { id: 1, title: 'Session Type' },
    { id: 2, title: 'Date & Time' },
    { id: 3, title: 'Player Info' },
    { id: 4, title: 'Confirm' }
  ];

  const today = new Date().toISOString().split('T')[0];

  const getDateHint = () => {
    if (availableDays.length === 0) return '';
    return `Available: ${availableDays.join(', ')}`;
  };

  const prefersReduced = useReducedMotion();

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 py-16 pt-28" style={{ minHeight: '100vh', background: 'var(--paper)' }}>

        <Confetti active={step === 5} />

        {/* Progress Bar */}
        <div className="flex justify-between mb-12 relative">
          <div className="absolute top-5 left-0 w-full h-px z-0" style={{ background: 'var(--line-strong)' }} />
          <motion.div
            className="absolute top-5 left-0 h-px z-0 origin-left"
            style={{ background: 'var(--ink)' }}
            animate={{ width: `${((Math.min(step, steps.length) - 1) / (steps.length - 1)) * 100}%` }}
            transition={{ ...SPRING }}
          />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                animate={{
                  background: step >= s.id ? 'var(--black)' : 'var(--card-cream)',
                  borderColor: step >= s.id ? 'var(--black)' : 'var(--line-strong)',
                }}
                transition={{ ...SPRING }}
                className="w-10 h-10 rounded-full flex items-center justify-center border font-display text-base"
                style={{ color: step >= s.id ? 'var(--paper)' : 'var(--ink-faint)', willChange: 'transform' }}
              >
                {step > s.id ? (
                  <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <motion.path d="M5 13l4 4L19 7"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </motion.svg>
                ) : s.id}
              </motion.div>
              <span className="text-[11px] tracking-wide mt-2 hidden sm:block"
                style={{ color: step >= s.id ? 'var(--ink)' : 'var(--ink-faint)' }}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="cg-card p-7 md:p-10">
          <AnimatePresence mode="wait">

            {/* STEP 1 — Session Type */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: prefersReduced ? 0 : 40 * dir }} animate={{ opacity: 1, x: 0, transition: { ...SPRING } }} exit={{ opacity: 0, x: prefersReduced ? 0 : -40 * dir, transition: { duration: 0.18 } }}>
                <h2 className="display-md mb-1">Select session type</h2>
                {coach && <p className="text-sm mb-8" style={{ color: 'var(--ink-soft)' }}>with {coach.name}</p>}
                <div className="space-y-3 mb-8">
                  {sessionOptions.map(option => {
                    const isSelected = bookingData.sessionType === option.label;
                    return (
                      <button
                        key={option.label}
                        onClick={() => { setBookingData({ ...bookingData, sessionType: option.label }); setSelectedPackage(null); nextStep(); }}
                        className="relative w-full text-left p-5 rounded-2xl transition-colors"
                        style={{
                          border: `1px solid ${isSelected ? 'var(--ink)' : 'var(--line)'}`,
                          background: isSelected ? 'var(--paper-warm)' : 'var(--card-cream)',
                        }}
                      >
                        <div className="relative flex justify-between items-center gap-4">
                          <div>
                            <span className="font-display text-2xl" style={{ color: 'var(--ink)' }}>{option.label}</span>
                            <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                              {option.label === '1-on-1 Private'
                                ? 'Dedicated 1-hour session focused entirely on your development'
                                : 'Small group setting, great for teams and practice partners'}
                            </p>
                          </div>
                          <span className="font-display text-2xl shrink-0" style={{ color: 'var(--ink)' }}>${option.price}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {coachPackages.length > 0 && (
                  <div className="mb-10">
                    <p className="text-xs uppercase tracking-[0.14em] mb-4 flex items-center gap-2" style={{ color: 'var(--ink-faint)' }}>
                      <Package size={14} /> Package deals
                    </p>
                    <div className="space-y-3">
                      {coachPackages.map((pkg, i) => {
                        const pkgPrice = Math.round(privatePrice * pkg.sessions * (1 - pkg.discount_pct / 100));
                        const isSelected = selectedPackage?.sessions === pkg.sessions;
                        return (
                          <button key={i}
                            onClick={() => {
                              setSelectedPackage(isSelected ? null : pkg);
                              setBookingData({ ...bookingData, sessionType: '1-on-1 Private' });
                              nextStep();
                            }}
                            className="w-full text-left p-5 rounded-2xl transition-colors"
                            style={{
                              border: `1px solid ${isSelected ? 'var(--clay)' : 'var(--line)'}`,
                              background: isSelected ? 'rgba(219,167,132,0.12)' : 'var(--card-cream)',
                            }}>
                            <div className="flex justify-between items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-display text-xl" style={{ color: 'var(--ink)' }}>{pkg.label || `${pkg.sessions}-Session Pack`}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ background: 'rgba(94,140,90,0.15)', color: 'var(--c-confirmed)' }}>
                                    Save {pkg.discount_pct}%
                                  </span>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                                  {pkg.sessions} private sessions · ${Math.round(pkgPrice / pkg.sessions)}/session
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-display text-xl" style={{ color: 'var(--ink)' }}>${pkgPrice}</p>
                                <p className="text-xs line-through" style={{ color: 'var(--ink-faint)' }}>${privatePrice * pkg.sessions}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button onClick={() => navigate(`/coaches/${coachId}`)}
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: 'var(--ink-soft)' }}>
                  <ArrowLeft size={16} /> Back to coach profile
                </button>
              </motion.div>
            )}

            {/* STEP 2 — Date & Time */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: prefersReduced ? 0 : 40 * dir }} animate={{ opacity: 1, x: 0, transition: { ...SPRING } }} exit={{ opacity: 0, x: prefersReduced ? 0 : -40 * dir, transition: { duration: 0.18 } }}>
                <h2 className="display-md mb-2">Select date & time</h2>

                {/* Location mode */}
                {locationOptions.length > 1 && (
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--ink-faint)' }}>Where</p>
                    <div className="flex flex-wrap gap-2">
                      {locationOptions.map(m => (
                        <button key={m} type="button"
                          onClick={() => setBookingData({ ...bookingData, locationMode: m })}
                          className="px-4 py-2 rounded-full text-sm transition-colors"
                          style={{
                            background: bookingData.locationMode === m ? 'var(--black)' : 'var(--card-cream)',
                            border: `1px solid ${bookingData.locationMode === m ? 'var(--black)' : 'var(--line-strong)'}`,
                            color: bookingData.locationMode === m ? 'var(--paper)' : 'var(--ink)',
                          }}>
                          {LOCATION_MODE_META[m].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {availableDays.length === 0 ? (
                  <div className="mb-8 p-4 rounded-xl text-sm" style={{ background: 'rgba(199,154,87,0.10)', border: '1px solid rgba(199,154,87,0.3)', color: 'var(--c-reschedule)' }}>
                    This coach hasn't set their availability yet — they'll confirm your preferred time manually.
                  </div>
                ) : (
                  <p className="text-sm mb-8" style={{ color: 'var(--ink-soft)' }}>{getDateHint()}</p>
                )}

                {loadingAvailability ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin" size={30} style={{ color: 'var(--ink-soft)' }} />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--ink-faint)' }}>
                        Select date
                      </label>
                      <input
                        type="date"
                        min={today}
                        value={bookingData.date}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="cg-input"
                      />
                      {availableDays.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {DAY_NAMES.map(day => (
                            <span key={day} className="text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full"
                              style={{
                                background: availableDays.includes(day) ? 'var(--paper-warm)' : 'transparent',
                                color: availableDays.includes(day) ? 'var(--ink)' : 'var(--ink-faint)',
                                border: `1px solid ${availableDays.includes(day) ? 'var(--line-strong)' : 'var(--line)'}`,
                              }}>
                              {day.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      )}
                      {bookingData.date && availableDays.length > 0 && !isDateAvailable(bookingData.date) && (
                        <p className="text-xs mt-2" style={{ color: 'var(--c-reschedule)' }}>
                          Coach is not typically available on {DAY_NAMES[new Date(bookingData.date + 'T12:00:00').getDay()]}s. You can still request this date.
                        </p>
                      )}
                    </div>

                    {bookingData.date && (
                      <div>
                        <label className="block text-xs uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--ink-faint)' }}>
                          <Clock size={12} className="inline mr-1" />
                          Available time slots
                        </label>
                        {(() => {
                          const slots = availableSlots.length > 0 ? availableSlots : ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
                          const isGroup = bookingData.sessionType.toLowerCase().includes('group');
                          const blocked = isGroup ? new Set<string>() : blockedSlots(dayBookedSlots, coachBuffer, slots);
                          return (
                            <>
                              {availableSlots.length === 0 && (
                                <p className="text-xs mb-3" style={{ color: 'var(--ink-faint)' }}>
                                  {availableDays.length > 0 ? 'No slots set for this day — select a time to request anyway:' : 'Select a preferred time:'}
                                </p>
                              )}
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {slots.map(t => {
                                  const isFull = blocked.has(t);
                                  const selected = bookingData.time === t;
                                  return (
                                    <button key={t}
                                      onClick={() => { setBookingData({ ...bookingData, time: t }); setWaitlistJoined(false); }}
                                      className="p-3 rounded-xl text-sm transition-colors relative"
                                      style={{
                                        background: selected ? 'var(--black)' : 'var(--card-cream)',
                                        border: `1px solid ${selected ? 'var(--black)' : 'var(--line-strong)'}`,
                                        color: selected ? 'var(--paper)' : (isFull ? 'var(--ink-faint)' : 'var(--ink)'),
                                        textDecoration: isFull && !selected ? 'line-through' : 'none',
                                        opacity: isFull && !selected ? 0.7 : 1,
                                      }}>
                                      {t}
                                      {isFull && (
                                        <span className="block text-[8px] uppercase tracking-wide mt-0.5" style={{ color: selected ? 'var(--paper)' : 'var(--c-declined)' }}>full</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Group capacity indicator */}
                {isGroupSel && bookingData.time && (
                  <div className="mt-4 p-4 rounded-xl flex items-center gap-3"
                    style={{
                      background: groupSpotsLeft === 0 ? 'rgba(188,90,72,0.08)' : 'rgba(94,140,90,0.08)',
                      border: `1px solid ${groupSpotsLeft === 0 ? 'rgba(188,90,72,0.25)' : 'rgba(94,140,90,0.2)'}`,
                    }}>
                    <Users size={16} style={{ color: groupSpotsLeft === 0 ? 'var(--c-declined)' : 'var(--c-confirmed)' }} />
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>
                      {groupSpotsLeft === null ? 'Checking availability...' :
                       groupSpotsLeft === 0 ? 'This time slot is full — join the waitlist below.' :
                       `${groupSpotsLeft} of ${GROUP_CAPACITY} spots remaining`}
                    </p>
                  </div>
                )}

                {/* Waitlist (slot full) */}
                {selectedSlotFull && (
                  <div className="mt-4 p-5 rounded-2xl" style={{ background: 'var(--card-cream)', border: '1px solid var(--line-strong)' }}>
                    {waitlistJoined ? (
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={18} style={{ color: 'var(--c-confirmed)' }} />
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>
                          You're on the waitlist for {bookingData.time}. We'll let you know if a spot opens.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                          This time is full. Join the waitlist and we'll notify you if it frees up.
                        </p>
                        <button onClick={joinWaitlist} className="btn-secondary py-2.5 px-5 text-sm shrink-0">
                          <Users size={15} /> Join waitlist
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center mt-12">
                  <button onClick={prevStep} className="text-sm" style={{ color: 'var(--ink-soft)' }}>Back</button>
                  <button onClick={nextStep}
                    disabled={!bookingData.date || !bookingData.time || selectedSlotFull}
                    className="btn-primary py-3 px-8 text-sm disabled:opacity-40">
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Player Info */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: prefersReduced ? 0 : 40 * dir }} animate={{ opacity: 1, x: 0, transition: { ...SPRING } }} exit={{ opacity: 0, x: prefersReduced ? 0 : -40 * dir, transition: { duration: 0.18 } }}>
                <h2 className="display-md mb-8">Player information</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--ink-faint)' }}>Player name</label>
                    <input
                      type="text"
                      className="cg-input"
                      placeholder="Enter full name"
                      value={bookingData.playerName}
                      onChange={(e) => setBookingData({ ...bookingData, playerName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--ink-faint)' }}>Age</label>
                      <input
                        type="number"
                        min="5" max="99"
                        className="cg-input"
                        placeholder="Age"
                        value={bookingData.playerAge}
                        onChange={(e) => setBookingData({ ...bookingData, playerAge: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--ink-faint)' }}>Skill level</label>
                      <select
                        className="cg-input cursor-pointer"
                        value={bookingData.skillLevel}
                        onChange={(e) => setBookingData({ ...bookingData, skillLevel: e.target.value })}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Developing">Developing</option>
                        <option value="Competitive">Competitive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--ink-faint)' }}>
                      Tell us about yourself & goals
                    </label>
                    <textarea
                      rows={4}
                      required
                      className="cg-input text-sm resize-none"
                      placeholder="Your position, experience level, what you want to work on, any injuries the coach should know about..."
                      value={bookingData.notes}
                      onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                    />
                    {!bookingData.notes && (
                      <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-faint)' }}>
                        Required — helps your coach prepare for the session
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-12">
                  <button onClick={prevStep} className="text-sm" style={{ color: 'var(--ink-soft)' }}>Back</button>
                  <button
                    onClick={() => {
                      const parts = bookingData.playerName.trim().split(/\s+/);
                      if (parts.length < 2) { setNameError('Please enter your full name (first and last).'); return; }
                      setNameError('');
                      nextStep();
                    }}
                    disabled={!bookingData.playerName || !bookingData.playerAge || !bookingData.notes.trim()}
                    className="btn-primary py-3 px-8 text-sm disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
                {nameError && <p className="text-xs mt-2 text-right" style={{ color: 'var(--c-declined)' }}>{nameError}</p>}
              </motion.div>
            )}

            {/* STEP 4 — Confirm */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: prefersReduced ? 0 : 40 * dir }} animate={{ opacity: 1, x: 0, transition: { ...SPRING } }} exit={{ opacity: 0, x: prefersReduced ? 0 : -40 * dir, transition: { duration: 0.18 } }}>
                <h2 className="display-md mb-8">Review & confirm</h2>

                <div className="rounded-2xl mb-6 overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                  {coach && (
                    <div className="p-5 flex items-center gap-4" style={{ background: 'var(--paper-warm)', borderBottom: '1px solid var(--line)' }}>
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--card-cream)' }}>
                        {coach.avatar_url && <img src={coach.avatar_url} alt="" className="w-full h-full object-cover object-top" />}
                      </div>
                      <div>
                        <p className="font-display text-xl" style={{ color: 'var(--ink)' }}>{coach.name}</p>
                        <p className="text-xs capitalize" style={{ color: 'var(--ink-soft)' }}>{coach.specialty} specialist</p>
                      </div>
                    </div>
                  )}
                  <div className="p-6 space-y-3" style={{ background: 'var(--card-cream)' }}>
                    {[
                      { label: 'Session Type', value: bookingData.sessionType },
                      ...(bookingData.locationMode ? [{ label: 'Location', value: LOCATION_MODE_META[bookingData.locationMode].label }] : []),
                      { label: 'Date', value: new Date(bookingData.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) },
                      { label: 'Time', value: `${bookingData.time}${coachTimezone ? ' ' + tzAbbrev(coachTimezone) : ''}` },
                      ...(recurringWeeks > 1 ? [{ label: 'Repeats', value: `Weekly × ${recurringWeeks}` }] : []),
                      { label: 'Player', value: `${bookingData.playerName}, Age ${bookingData.playerAge}` },
                      { label: 'Level', value: bookingData.skillLevel },
                      { label: 'Notes', value: bookingData.notes },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-sm gap-4">
                        <span className="shrink-0" style={{ color: 'var(--ink-soft)' }}>{item.label}</span>
                        <span className="text-right" style={{ color: 'var(--ink)' }}>{item.value}</span>
                      </div>
                    ))}
                    {selectedPackage && (
                      <div className="flex justify-between text-sm gap-4">
                        <span className="shrink-0" style={{ color: 'var(--ink-soft)' }}>Package</span>
                        <span className="text-right" style={{ color: 'var(--ink)' }}>
                          {selectedPackage.sessions} sessions · Save {selectedPackage.discount_pct}%
                        </span>
                      </div>
                    )}
                    {appliedPromo && (
                      <div className="flex justify-between text-sm gap-4">
                        <span className="shrink-0" style={{ color: 'var(--ink-soft)' }}>Promo · {appliedPromo.code}</span>
                        <span className="text-right" style={{ color: 'var(--c-confirmed)' }}>
                          −${discountAmount}{appliedPromo.type === 'percent' ? ` (${appliedPromo.value}% off)` : ''}
                        </span>
                      </div>
                    )}
                    <div className="pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--line)' }}>
                      <span className="font-display text-2xl" style={{ color: 'var(--ink)' }}>Total</span>
                      <div className="flex flex-col items-end">
                        <span className="font-display text-3xl" style={{ color: 'var(--ink)' }}>${totalPrice}</span>
                        {(selectedPackage || appliedPromo) && (
                          <p className="text-xs line-through mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            ${selectedPackage ? basePrice * selectedPackage.sessions : subtotal}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promo code */}
                {coachPromoCodes.some(p => p.active) && (
                  <div className="mb-4">
                    {appliedPromo ? (
                      <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(94,140,90,0.08)', border: '1px solid rgba(94,140,90,0.25)' }}>
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>
                          <CheckCircle2 size={15} className="inline mr-1.5 -mt-0.5" style={{ color: 'var(--c-confirmed)' }} />
                          Code <strong>{appliedPromo.code}</strong> applied.
                        </p>
                        <button onClick={() => { setAppliedPromo(null); setPromoInput(''); }} className="text-sm" style={{ color: 'var(--ink-soft)' }}>Remove</button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                          onKeyDown={e => { if (e.key === 'Enter') applyPromo(); }}
                          placeholder="Have a promo code?"
                          className="cg-input sm:flex-1 font-mono"
                        />
                        <button onClick={applyPromo} className="btn-secondary py-2.5 px-5 text-sm shrink-0">Apply</button>
                      </div>
                    )}
                    {promoError && <p className="text-xs mt-2" style={{ color: 'var(--c-declined)' }}>{promoError}</p>}
                  </div>
                )}

                {/* Recurring / standing appointment */}
                {!selectedPackage && (
                  <div className="p-5 rounded-2xl mb-4" style={{ background: 'var(--card-cream)', border: '1px solid var(--line)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <RefreshCw size={15} style={{ color: 'var(--ink-soft)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Make it a standing session</p>
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>Repeat this booking weekly at the same time.</p>
                    <div className="flex flex-wrap gap-2">
                      {[1, 4, 8, 12].map(n => (
                        <button key={n} type="button"
                          onClick={() => setRecurringWeeks(n)}
                          className="px-4 py-2 rounded-full text-sm transition-colors"
                          style={{
                            background: recurringWeeks === n ? 'var(--black)' : 'var(--paper-warm)',
                            border: `1px solid ${recurringWeeks === n ? 'var(--black)' : 'var(--line-strong)'}`,
                            color: recurringWeeks === n ? 'var(--paper)' : 'var(--ink)',
                          }}>
                          {n === 1 ? 'Just once' : `${n} weeks`}
                        </button>
                      ))}
                    </div>
                    {recurringWeeks > 1 && (
                      <p className="text-xs mt-3" style={{ color: 'var(--ink-faint)' }}>
                        Creates {recurringWeeks} sessions · {recurringWeeks}× ${totalPrice} = ${totalPrice * recurringWeeks} total over {recurringWeeks} weeks.
                      </p>
                    )}
                  </div>
                )}

                <div className="p-4 rounded-xl flex items-center gap-4 mb-4" style={{ background: 'rgba(199,154,87,0.08)', border: '1px solid rgba(199,154,87,0.2)' }}>
                  <CreditCard size={20} style={{ color: 'var(--c-reschedule)' }} />
                  <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                    {instantBook
                      ? 'This coach has instant booking — your session confirms immediately. Pay via Venmo after.'
                      : "Payment is collected after the coach confirms your booking. You won't be charged until then."}
                  </p>
                </div>

                <div className="p-4 rounded-xl flex items-center gap-4 mb-6" style={{ background: 'rgba(94,140,90,0.08)', border: '1px solid rgba(94,140,90,0.2)' }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--c-confirmed)' }} />
                  <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                    <span style={{ color: 'var(--ink)' }}>Good Fit Guarantee</span> — if your first session isn't the right fit, we'll connect you with another coach. No questions asked.
                  </p>
                </div>

                {priceError && (
                  <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: 'rgba(188,90,72,0.1)', border: '1px solid rgba(188,90,72,0.25)', color: 'var(--c-declined)' }}>
                    {priceError}
                  </div>
                )}

                <button
                  className="btn-primary w-full py-4 text-base justify-center mb-4 disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!auth.currentUser) return;
                    if (submittingRef.current) return;
                    if (totalPrice <= 0) { setPriceError('Session price not set. Please contact the coach.'); return; }
                    setPriceError('');
                    submittingRef.current = true;
                    setIsSubmitting(true);
                    const bookingStatus = instantBook ? 'confirmed' : 'pending';
                    const weeks = (!selectedPackage && recurringWeeks > 1) ? recurringWeeks : 1;
                    const recurringGroupId = weeks > 1 ? `rec-${auth.currentUser.uid}-${Date.now()}` : null;
                    try {
                      for (let i = 0; i < weeks; i++) {
                        await addDoc(collection(db, 'bookings'), {
                          player_id: auth.currentUser.uid,
                          coach_id: coach?.user_id ?? coachId,
                          coach_name: coach?.name ?? '',
                          session_type: bookingData.sessionType,
                          date: addDaysISO(bookingData.date, i * 7),
                          time_slot: bookingData.time,
                          player_name: bookingData.playerName,
                          player_age: Number(bookingData.playerAge),
                          skill_level: bookingData.skillLevel,
                          notes: bookingData.notes,
                          status: bookingStatus,
                          total_price: totalPrice,
                          is_package: !!selectedPackage,
                          session_count: selectedPackage?.sessions ?? 1,
                          coach_venmo_handle: coachVenmoHandle || null,
                          location_mode: bookingData.locationMode || 'facility',
                          timezone: coachTimezone || getBrowserTimezone(),
                          ...(appliedPromo && { promo_code: appliedPromo.code, discount_amount: discountAmount }),
                          ...(recurringGroupId && { recurring_group_id: recurringGroupId, is_recurring: true }),
                          created_at: serverTimestamp(),
                        });
                      }

                      try {
                        const mail = await import('../utils/sendEmail');
                        const sessionLabel = bookingData.sessionType + (weeks > 1 ? ` (weekly × ${weeks})` : '');

                        // → Coach: new booking request (accept/decline)
                        const coachUserDoc = await getDoc(doc(db, 'users', coach?.user_id ?? coachId!));
                        const coachEmail = coachUserDoc.exists() ? coachUserDoc.data().email : null;
                        if (coachEmail) {
                          await mail.notifyCoachNewBooking({
                            coachEmail,
                            coachName: coach?.name ?? 'Coach',
                            playerName: bookingData.playerName,
                            sessionType: sessionLabel,
                            date: bookingData.date,
                            timeSlot: bookingData.time,
                            totalPrice,
                            skillLevel: bookingData.skillLevel,
                            notes: bookingData.notes,
                            duration: '1 hour',
                          });
                        }

                        // → Player: "request sent" (pending) or "confirmed + Venmo" (instant book)
                        const playerDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                        const playerEmail = playerDoc.exists() ? playerDoc.data().email : auth.currentUser.email;
                        if (playerEmail) {
                          if (instantBook) {
                            await mail.notifyPlayerBookingConfirmed({
                              playerEmail,
                              playerName: bookingData.playerName,
                              coachName: coach?.name ?? 'Coach',
                              sessionType: sessionLabel,
                              date: bookingData.date,
                              timeSlot: bookingData.time,
                              totalPrice,
                              venmoHandle: coachVenmoHandle || undefined,
                            });
                          } else {
                            await mail.notifyPlayerBookingRequested({
                              playerEmail,
                              playerName: bookingData.playerName,
                              coachName: coach?.name ?? 'Coach',
                              sessionType: sessionLabel,
                              date: bookingData.date,
                              timeSlot: bookingData.time,
                            });
                          }
                        }
                      } catch (emailErr) {
                        console.error('Email notification failed:', emailErr);
                      }

                      track('booking_created', { coach_id: coach?.user_id ?? coachId, total_price: totalPrice, instant: instantBook, weeks });

                      // In-app notifications
                      const dateLabel = new Date(bookingData.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      notify(coach?.user_id ?? coachId, {
                        type: 'booking_request',
                        title: instantBook ? 'New booking' : 'New booking request',
                        body: `${bookingData.playerName} · ${bookingData.sessionType} · ${dateLabel} at ${bookingData.time}`,
                        link: '/dashboard',
                      });
                      if (instantBook) {
                        notify(auth.currentUser.uid, {
                          type: 'booking_confirmed',
                          title: `Confirmed with ${coach?.name ?? 'your coach'}`,
                          body: `${bookingData.sessionType} · ${dateLabel} at ${bookingData.time}`,
                          link: '/dashboard',
                        });
                      }

                      setStep(5);
                    } catch (error) {
                      handleFirestoreError(error, OperationType.CREATE, 'bookings');
                    } finally {
                      setIsSubmitting(false);
                      submittingRef.current = false;
                    }
                  }}
                >
                  {isSubmitting ? (
                    <><Loader2 className="animate-spin" size={20} /> {instantBook ? 'Booking…' : 'Sending request…'}</>
                  ) : (
                    <>{instantBook ? 'Confirm booking' : 'Confirm booking request'} — ${totalPrice}{recurringWeeks > 1 ? `/wk` : ''}</>
                  )}
                </button>
                <button onClick={prevStep} disabled={isSubmitting}
                  className="w-full py-3 text-sm disabled:opacity-50"
                  style={{ color: 'var(--ink-soft)' }}>
                  Back
                </button>
              </motion.div>
            )}

            {/* STEP 5 — Confirmation */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.97 }} animate={{ opacity: 1, scale: 1, transition: { ...SPRING } }} className="text-center py-6">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...SPRING, delay: 0.15 }}
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--black)' }}
                  >
                    <svg viewBox="0 0 52 52" className="w-12 h-12">
                      <motion.circle cx="26" cy="26" r="25" fill="none" stroke="rgba(246,244,239,0.25)" strokeWidth="2" />
                      <motion.path
                        d="M14 26l8 8 16-16"
                        fill="none" stroke="#F6F4EF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
                      />
                    </svg>
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    initial={{ scale: 1, opacity: 0.4 }}
                    animate={{ scale: 1.7, opacity: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    style={{ border: '2px solid var(--line-strong)' }}
                  />
                </div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.45 }}>
                  <p className="eyebrow mb-4 inline-flex">{instantBook ? 'Booking confirmed' : 'Request sent'}</p>
                  <h2 className="display-lg mb-4">You're all set!</h2>
                  <p className="mb-1" style={{ color: 'var(--ink-soft)' }}>
                    {instantBook
                      ? <>Your session with <strong style={{ color: 'var(--ink)' }}>{coach?.name}</strong> is confirmed.</>
                      : <>Your request has been sent to <strong style={{ color: 'var(--ink)' }}>{coach?.name}</strong>.</>}
                  </p>
                  <p className="mb-1" style={{ color: 'var(--ink-soft)' }}>
                    {new Date(bookingData.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {bookingData.time}
                    {coachTimezone ? ` ${tzAbbrev(coachTimezone)}` : ''}
                    {recurringWeeks > 1 ? ` · repeats weekly × ${recurringWeeks}` : ''}
                  </p>
                  <p className="mb-8 text-sm" style={{ color: 'var(--ink-faint)' }}>
                    {instantBook
                      ? 'Pay via Venmo below. A calendar invite is ready to add.'
                      : `You'll receive an email once ${coach?.name?.split(' ')[0]} confirms. Payment is due after confirmation.`}
                  </p>
                </motion.div>

                {/* Venmo Payment CTA */}
                {coachVenmoHandle && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-sm mx-auto mb-6 rounded-2xl p-6"
                    style={{ background: 'rgba(0,140,255,0.06)', border: '1px solid rgba(0,140,255,0.25)' }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-white text-sm"
                        style={{ background: 'var(--c-venmo)' }}>
                        V
                      </div>
                      <div className="text-left">
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>Pay via Venmo</p>
                        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>Send payment once your coach confirms</p>
                      </div>
                    </div>
                    <a
                      href={buildVenmoUrl(coachVenmoHandle, totalPrice)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track('payment_clicked', { coach_id: coach?.user_id ?? coachId, amount: totalPrice })}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ background: 'var(--c-venmo)', color: 'white' }}
                    >
                      <ExternalLink size={15} />
                      Pay @{coachVenmoHandle} — ${totalPrice}
                    </a>
                    <p className="text-xs mt-2 text-center" style={{ color: 'var(--ink-faint)' }}>
                      Only send payment AFTER the coach confirms your booking.
                    </p>
                  </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: coachVenmoHandle ? 0.65 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col gap-3 max-w-sm mx-auto">
                  <a
                    href={generateCalendarLink(bookingData.date, bookingData.time, bookingData.sessionType, coach?.name || 'Coach', totalPrice)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary py-3 flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} /> Add to Google Calendar
                  </a>
                  <button
                    onClick={() => downloadICS(
                      `coachgo-${bookingData.date}`,
                      buildICS({
                        title: `CoachGo: ${bookingData.sessionType} with ${coach?.name || 'Coach'}`,
                        description: `Session with ${coach?.name || 'your coach'} booked via CoachGo.`,
                        location: bookingData.locationMode ? LOCATION_MODE_META[bookingData.locationMode].label : undefined,
                        date: bookingData.date,
                        slot: bookingData.time,
                        recurrenceWeeks: recurringWeeks > 1 ? recurringWeeks : undefined,
                      })
                    )}
                    className="btn-secondary py-3 flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Apple / Outlook (.ics)
                  </button>
                  <Link to="/dashboard" className="btn-primary py-3 text-center justify-center">Go to dashboard</Link>
                  <Link to="/coaches" className="py-3 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>
                    Browse more coaches
                  </Link>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}