import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Calendar, CreditCard, CheckCircle2, ArrowLeft, Loader2, ExternalLink, DollarSign, Clock, Package, Users } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import Confetti from '../components/Confetti';
import { SPRING, SPRING_BOUNCY } from '../tokens';
import { GlowingEffect } from '@/components/ui/glowing-effect-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, getDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { MOCK_COACHES } from './CoachesPage';

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
  const [bookingData, setBookingData] = useState({
    sessionType: '',
    date: '',
    time: '',
    playerName: '',
    playerAge: '',
    skillLevel: 'Developing',
    notes: '',
  });

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
  const totalPrice = selectedPackage
    ? Math.round(basePrice * selectedPackage.sessions * (1 - selectedPackage.discount_pct / 100))
    : basePrice;

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

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

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
      <div className="max-w-3xl mx-auto px-4 py-16 pt-28" style={{ minHeight: '100vh', background: '#080B14' }}>

        <Confetti active={step === 5} />

        {/* Progress Bar */}
        <div className="flex justify-between mb-12 relative">
          {/* Track line */}
          <div className="absolute top-5 left-0 w-full h-px z-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
          {/* Filled progress line */}
          <motion.div
            className="absolute top-5 left-0 h-px z-0 origin-left"
            style={{ background: 'linear-gradient(90deg, #4F8EF7, #7C3AED)' }}
            animate={{ width: `${((Math.min(step, steps.length) - 1) / (steps.length - 1)) * 100}%` }}
            transition={{ ...SPRING }}
          />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                animate={{
                  background: step >= s.id ? '#4F8EF7' : 'rgba(255,255,255,0.05)',
                  borderColor: step >= s.id ? '#4F8EF7' : 'rgba(255,255,255,0.1)',
                  scale: step === s.id ? [1, 1.18, 1] : 1,
                  boxShadow: step === s.id ? '0 0 16px rgba(79,142,247,0.7)' : '0 0 0px rgba(79,142,247,0)',
                }}
                transition={step === s.id ? { scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }, ...SPRING } : { ...SPRING }}
                className="w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm"
                style={{ color: step >= s.id ? 'white' : 'rgba(255,255,255,0.3)', willChange: 'transform' }}
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
              <span className="text-[10px] uppercase tracking-widest mt-2 font-bold hidden sm:block"
                style={{ color: step >= s.id ? '#4F8EF7' : 'rgba(255,255,255,0.3)' }}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="relative rounded-3xl">
          <GlowingEffect disabled={false} spread={60} borderWidth={2} proximity={100} />
          <div className="rounded-3xl p-8 md:p-12" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <AnimatePresence mode="wait">

            {/* STEP 1 — Session Type */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: prefersReduced ? 0 : 60 }} animate={{ opacity: 1, x: 0, transition: { ...SPRING } }} exit={{ opacity: 0, x: prefersReduced ? 0 : -60, transition: { duration: 0.18 } }}>
                <h2 className="text-2xl font-bold mb-2 text-white">Select Session Type</h2>
                {coach && <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>with {coach.name}</p>}
                <div className="space-y-4 mb-8">
                  {sessionOptions.map(option => {
                    const isSelected = bookingData.sessionType === option.label;
                    return (
                      <motion.button
                        key={option.label}
                        onClick={() => { setBookingData({ ...bookingData, sessionType: option.label }); setSelectedPackage(null); nextStep(); }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        animate={{
                          background: isSelected ? 'rgba(79,142,247,0.1)' : 'rgba(255,255,255,0.02)',
                        }}
                        transition={SPRING}
                        className="relative w-full text-left p-6 rounded-2xl overflow-hidden"
                        style={{
                          border: '2px solid',
                          borderColor: isSelected ? 'transparent' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        {/* Animated gradient border on select */}
                        {isSelected && (
                          <svg
                            aria-hidden
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            preserveAspectRatio="none"
                            style={{ borderRadius: '1rem' }}
                          >
                            <defs>
                              <linearGradient id={`bdr-${option.label.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%"  stopColor="#4F8EF7" />
                                <stop offset="50%" stopColor="#7C3AED" />
                                <stop offset="100%" stopColor="#06B6D4" />
                              </linearGradient>
                            </defs>
                            <motion.rect
                              x="1" y="1"
                              width="calc(100% - 2px)"
                              height="calc(100% - 2px)"
                              rx="14"
                              fill="none"
                              stroke={`url(#bdr-${option.label.replace(/\s/g, '')})`}
                              strokeWidth="2"
                              pathLength={1}
                              strokeDasharray={1}
                              initial={{ strokeDashoffset: 1 }}
                              animate={{ strokeDashoffset: 0 }}
                              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </svg>
                        )}
                        <div className="relative flex justify-between items-center">
                          <div>
                            <span className="font-bold text-white text-lg">{option.label}</span>
                            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              {option.label === '1-on-1 Private'
                                ? 'Dedicated 1-hour session focused entirely on your development'
                                : 'Small group setting, great for teams and practice partners'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 font-bold text-xl shrink-0 ml-4" style={{ color: '#4F8EF7' }}>
                            <DollarSign size={16} />
                            <span>{option.price}</span>
                          </div>
                        </div>

                        {/* SVG checkmark — drawn on select, top-right corner */}
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={SPRING_BOUNCY}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(135deg, #4F8EF7, #2563EB)',
                              boxShadow: '0 4px 16px rgba(79,142,247,0.45)',
                            }}
                          >
                            <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                              <motion.path
                                d="M5 13l4 4L19 7"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
                              />
                            </motion.svg>
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {coachPackages.length > 0 && (
                  <div className="mb-12">
                    <p className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <Package size={14} /> Package Deals
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
                            className="w-full text-left p-5 rounded-2xl border-2 transition-all hover:scale-[1.01]"
                            style={{
                              borderColor: isSelected ? '#F59E0B' : 'rgba(245,158,11,0.2)',
                              background: isSelected ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.04)',
                            }}>
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-white">{pkg.label || `${pkg.sessions}-Session Pack`}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                                    Save {pkg.discount_pct}%
                                  </span>
                                </div>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                  {pkg.sessions} private sessions · ${Math.round(pkgPrice / pkg.sessions)}/session
                                </p>
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                <p className="font-bold text-lg" style={{ color: '#F59E0B' }}>${pkgPrice}</p>
                                <p className="text-xs line-through" style={{ color: 'rgba(255,255,255,0.25)' }}>${privatePrice * pkg.sessions}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button onClick={() => navigate(`/coaches/${coachId}`)}
                  className="flex items-center gap-2 text-sm font-bold transition-colors"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <ArrowLeft size={16} /> Back to Coach Profile
                </button>
              </motion.div>
            )}

            {/* STEP 2 — Date & Time */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: prefersReduced ? 0 : 60 }} animate={{ opacity: 1, x: 0, transition: { ...SPRING } }} exit={{ opacity: 0, x: prefersReduced ? 0 : -60, transition: { duration: 0.18 } }}>
                <h2 className="text-2xl font-bold mb-2 text-white">Select Date & Time</h2>
                {availableDays.length === 0 ? (
                  <div className="mb-8 p-4 rounded-xl text-sm" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                    This coach hasn't set their availability yet — they'll confirm your preferred time manually.
                  </div>
                ) : (
                  <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>{getDateHint()}</p>
                )}

                {loadingAvailability ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin" size={32} style={{ color: '#4F8EF7' }} />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Select Date
                      </label>
                      <input
                        type="date"
                        min={today}
                        value={bookingData.date}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full rounded-xl p-4 focus:outline-none text-white"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                      />
                      {availableDays.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {DAY_NAMES.map(day => (
                            <span key={day} className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg"
                              style={{
                                background: availableDays.includes(day) ? 'rgba(79,142,247,0.12)' : 'rgba(255,255,255,0.03)',
                                color: availableDays.includes(day) ? '#4F8EF7' : 'rgba(255,255,255,0.15)',
                                border: `1px solid ${availableDays.includes(day) ? 'rgba(79,142,247,0.25)' : 'rgba(255,255,255,0.05)'}`,
                              }}>
                              {day.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      )}
                      {bookingData.date && availableDays.length > 0 && !isDateAvailable(bookingData.date) && (
                        <p className="text-xs mt-2 font-medium" style={{ color: '#f59e0b' }}>
                          ⚠ Coach is not typically available on {DAY_NAMES[new Date(bookingData.date + 'T12:00:00').getDay()]}s. You can still request this date.
                        </p>
                      )}
                    </div>

                    {bookingData.date && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          <Clock size={12} className="inline mr-1" />
                          Available Time Slots
                        </label>
                        {availableSlots.length > 0 ? (
                          <motion.div
                            className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                            initial="hidden"
                            animate="visible"
                          >
                            {availableSlots.map(t => (
                              <motion.button key={t}
                                variants={{ hidden: { opacity: 0, scale: 0.7 }, visible: { opacity: 1, scale: [0.7, 1.08, 1], transition: { ...SPRING_BOUNCY } } }}
                                whileHover={prefersReduced ? {} : { scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setBookingData({ ...bookingData, time: t })}
                                className="p-3 rounded-xl text-xs font-bold transition-colors"
                                style={{
                                  background: bookingData.time === t ? '#4F8EF7' : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${bookingData.time === t ? '#4F8EF7' : 'rgba(255,255,255,0.08)'}`,
                                  color: bookingData.time === t ? 'white' : 'rgba(255,255,255,0.5)',
                                }}>
                                {t}
                              </motion.button>
                            ))}
                          </motion.div>
                        ) : (
                          <div>
                            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {availableDays.length > 0 ? 'No slots set for this day — select a time to request anyway:' : 'Select a preferred time:'}
                            </p>
                            <motion.div
                              className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                              variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                              initial="hidden"
                              animate="visible"
                            >
                              {['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'].map(t => (
                                <motion.button key={t}
                                  variants={{ hidden: { opacity: 0, scale: 0.7 }, visible: { opacity: 1, scale: [0.7, 1.08, 1], transition: { ...SPRING_BOUNCY } } }}
                                  whileHover={prefersReduced ? {} : { scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setBookingData({ ...bookingData, time: t })}
                                  className="p-3 rounded-xl text-xs font-bold transition-colors"
                                  style={{
                                    background: bookingData.time === t ? '#4F8EF7' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${bookingData.time === t ? '#4F8EF7' : 'rgba(255,255,255,0.08)'}`,
                                    color: bookingData.time === t ? 'white' : 'rgba(255,255,255,0.5)',
                                  }}>
                                  {t}
                                </motion.button>
                              ))}
                            </motion.div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Group capacity indicator */}
                {bookingData.sessionType.toLowerCase().includes('group') && bookingData.time && (
                  <div className="mt-4 p-4 rounded-xl flex items-center gap-3"
                    style={{
                      background: groupSpotsLeft === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.06)',
                      border: `1px solid ${groupSpotsLeft === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`,
                    }}>
                    <Users size={16} style={{ color: groupSpotsLeft === 0 ? '#ef4444' : '#22c55e' }} />
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {groupSpotsLeft === null ? 'Checking availability...' :
                       groupSpotsLeft === 0 ? 'This time slot is full. Please choose another time.' :
                       `${groupSpotsLeft} of ${GROUP_CAPACITY} spots remaining`}
                    </p>
                  </div>
                )}

                <div className="flex justify-between mt-12">
                  <button onClick={prevStep} className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Back</button>
                  <button onClick={nextStep}
                    disabled={!bookingData.date || !bookingData.time || groupSpotsLeft === 0}
                    className="btn-primary py-3 px-8 text-sm disabled:opacity-50">
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Player Info */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: prefersReduced ? 0 : 60 }} animate={{ opacity: 1, x: 0, transition: { ...SPRING } }} exit={{ opacity: 0, x: prefersReduced ? 0 : -60, transition: { duration: 0.18 } }}>
                <h2 className="text-2xl font-bold mb-8 text-white">Player Information</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Player Name</label>
                    <input
                      type="text"
                      className="w-full rounded-xl p-4 focus:outline-none text-white"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                      placeholder="Enter full name"
                      value={bookingData.playerName}
                      onChange={(e) => setBookingData({ ...bookingData, playerName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Age</label>
                      <input
                        type="number"
                        min="5" max="99"
                        className="w-full rounded-xl p-4 focus:outline-none text-white"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                        placeholder="Age"
                        value={bookingData.playerAge}
                        onChange={(e) => setBookingData({ ...bookingData, playerAge: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Skill Level</label>
                      <select
                        className="w-full rounded-xl p-4 focus:outline-none text-white"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                        value={bookingData.skillLevel}
                        onChange={(e) => setBookingData({ ...bookingData, skillLevel: e.target.value })}
                      >
                        <option value="Beginner" className="bg-gray-900">Beginner</option>
                        <option value="Developing" className="bg-gray-900">Developing</option>
                        <option value="Competitive" className="bg-gray-900">Competitive</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes — now mandatory */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Tell Us About Yourself & Goals
                    </label>
                    <textarea
                      rows={4}
                      required
                      className="w-full rounded-xl p-4 focus:outline-none text-sm resize-none text-white"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                      placeholder="Your position, experience level, what you want to work on, any injuries the coach should know about..."
                      value={bookingData.notes}
                      onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                    />
                    {!bookingData.notes && (
                      <p className="text-[10px] mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Required — helps your coach prepare for the session
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-12">
                  <button onClick={prevStep} className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Back</button>
                  <button
                    onClick={() => {
                      const parts = bookingData.playerName.trim().split(/\s+/);
                      if (parts.length < 2) { setNameError('Please enter your full name (first and last).'); return; }
                      setNameError('');
                      nextStep();
                    }}
                    disabled={!bookingData.playerName || !bookingData.playerAge || !bookingData.notes.trim()}
                    className="btn-primary py-3 px-8 text-sm disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
                {nameError && <p className="text-xs mt-2 text-right font-medium" style={{ color: '#f87171' }}>{nameError}</p>}
              </motion.div>
            )}

            {/* STEP 4 — Confirm */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: prefersReduced ? 0 : 60 }} animate={{ opacity: 1, x: 0, transition: { ...SPRING } }} exit={{ opacity: 0, x: prefersReduced ? 0 : -60, transition: { duration: 0.18 } }}>
                <h2 className="text-2xl font-bold mb-8 text-white">Review & Confirm</h2>

                <div className="rounded-2xl mb-6 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  {coach && (
                    <div className="p-5 flex items-center gap-4" style={{ background: 'rgba(79,142,247,0.06)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        {coach.avatar_url && <img src={coach.avatar_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="font-bold text-white">{coach.name}</p>
                        <p className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{coach.specialty} specialist</p>
                      </div>
                    </div>
                  )}
                  <div className="p-6 space-y-3">
                    {[
                      { label: 'Session Type', value: bookingData.sessionType },
                      { label: 'Date', value: new Date(bookingData.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) },
                      { label: 'Time', value: bookingData.time },
                      { label: 'Player', value: `${bookingData.playerName}, Age ${bookingData.playerAge}` },
                      { label: 'Level', value: bookingData.skillLevel },
                      { label: 'Notes', value: bookingData.notes },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-sm gap-4">
                        <span className="shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
                        <span className="font-bold text-white text-right">{item.value}</span>
                      </div>
                    ))}
                    {selectedPackage && (
                      <div className="flex justify-between text-sm gap-4">
                        <span className="shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>Package</span>
                        <span className="font-bold text-right" style={{ color: '#F59E0B' }}>
                          {selectedPackage.sessions} sessions · Save {selectedPackage.discount_pct}%
                        </span>
                      </div>
                    )}
                    <div className="pt-4 flex justify-between items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="font-bold text-white text-lg">Total</span>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 font-bold text-2xl" style={{ color: '#4F8EF7' }}>
                          <DollarSign size={20} /><span>{totalPrice}</span>
                        </div>
                        {selectedPackage && (
                          <p className="text-xs line-through mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            ${basePrice * selectedPackage.sessions}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl flex items-center gap-4 mb-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <CreditCard size={20} style={{ color: '#F59E0B' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Payment is collected after the coach confirms your booking. You won't be charged until then.
                  </p>
                </div>

                <div className="p-4 rounded-xl flex items-center gap-4 mb-6" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span className="text-white font-semibold">Good Fit Guarantee</span> — if your first session isn't the right fit, we'll connect you with another coach. No questions asked.
                  </p>
                </div>

                {priceError && (
                  <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                    {priceError}
                  </div>
                )}

                <ShimmerButton
                  shimmerColor="#4F8EF7"
                  shimmerDuration="2.5s"
                  borderRadius="12px"
                  background="linear-gradient(135deg, #4F8EF7 0%, #2563EB 100%)"
                  className="w-full py-4 text-lg font-bold flex items-center justify-center gap-2 mb-4 disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!auth.currentUser) return;
                    if (submittingRef.current) return;
                    if (totalPrice <= 0) { setPriceError('Session price not set. Please contact the coach.'); return; }
                    setPriceError('');
                    submittingRef.current = true;
                    setIsSubmitting(true);
                    try {
                      await addDoc(collection(db, 'bookings'), {
                        player_id: auth.currentUser.uid,
                        coach_id: coach?.user_id ?? coachId,
                        coach_name: coach?.name ?? '',
                        session_type: bookingData.sessionType,
                        date: bookingData.date,
                        time_slot: bookingData.time,
                        player_name: bookingData.playerName,
                        player_age: Number(bookingData.playerAge),
                        skill_level: bookingData.skillLevel,
                        notes: bookingData.notes,
                        status: 'pending',
                        total_price: totalPrice,
                        is_package: !!selectedPackage,
                        session_count: selectedPackage?.sessions ?? 1,
                        coach_venmo_handle: coachVenmoHandle || null,
                        created_at: serverTimestamp(),
                      });

                      try {
                        const coachUserDoc = await getDoc(doc(db, 'users', coach?.user_id ?? coachId!));
                        const coachEmail = coachUserDoc.exists() ? coachUserDoc.data().email : null;
                        if (coachEmail) {
                          const { notifyCoachNewBooking } = await import('../utils/sendEmail');
                          await notifyCoachNewBooking({
                            coachEmail,
                            coachName: coach?.name ?? 'Coach',
                            playerName: bookingData.playerName,
                            sessionType: bookingData.sessionType,
                            date: bookingData.date,
                            timeSlot: bookingData.time,
                            totalPrice,
                          });
                        }
                      } catch (emailErr) {
                        console.error('Email notification failed:', emailErr);
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
                    <><Loader2 className="animate-spin" size={20} /> Sending Request...</>
                  ) : (
                    <>Confirm Booking Request — ${totalPrice}</>
                  )}
                </ShimmerButton>
                <button onClick={prevStep} disabled={isSubmitting}
                  className="w-full py-3 text-sm font-bold disabled:opacity-50"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Back
                </button>
              </motion.div>
            )}

            {/* STEP 5 — Confirmation */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.95 }} animate={{ opacity: 1, scale: 1, transition: { ...SPRING } }} className="text-center py-8">
                {/* Animated check circle with SVG stroke */}
                <div className="relative w-28 h-28 mx-auto mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...SPRING, delay: 0.15 }}
                    className="w-28 h-28 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #4F8EF7, #2563EB)', boxShadow: '0 0 60px rgba(79,142,247,0.5)' }}
                  >
                    <svg viewBox="0 0 52 52" className="w-14 h-14">
                      <motion.circle cx="26" cy="26" r="25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                      <motion.path
                        d="M14 26l8 8 16-16"
                        fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
                      />
                    </svg>
                  </motion.div>
                  {/* Radiate ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    style={{ border: '2px solid rgba(79,142,247,0.5)' }}
                  />
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.45 }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#4F8EF7' }}>Request Sent</p>
                  {/* Character-by-character stagger */}
                  <motion.h2
                    className="text-3xl font-bold mb-4 text-white"
                    variants={{ visible: { transition: { staggerChildren: 0.04, delayChildren: 0.55 } } }}
                    initial="hidden"
                    animate="visible"
                  >
                    {"You're all set!".split('').map((ch, i) => (
                      <motion.span key={i} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { ...SPRING } } }}
                        className="inline-block" style={{ whiteSpace: ch === ' ' ? 'pre' : undefined }}>
                        {ch}
                      </motion.span>
                    ))}
                  </motion.h2>
                  <p className="mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Your request has been sent to <strong className="text-white">{coach?.name}</strong>.
                  </p>
                  <p className="mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {new Date(bookingData.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {bookingData.time}
                  </p>
                  <p className="mb-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    You'll receive an email once {coach?.name?.split(' ')[0]} confirms. Payment is due after confirmation.
                  </p>
                </motion.div>

                {/* Venmo Payment CTA */}
                {coachVenmoHandle && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-sm mx-auto mb-6 rounded-2xl p-6"
                    style={{ background: 'rgba(0,130,245,0.08)', border: '1px solid rgba(0,130,245,0.25)' }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-white text-sm"
                        style={{ background: '#008DF5' }}>
                        V
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white text-sm">Pay via Venmo</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Send payment once your coach confirms</p>
                      </div>
                    </div>
                    <a
                      href={buildVenmoUrl(coachVenmoHandle, totalPrice)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ background: '#008DF5', color: 'white', boxShadow: '0 4px 20px rgba(0,141,245,0.35)' }}
                    >
                      <ExternalLink size={15} />
                      Pay @{coachVenmoHandle} — ${totalPrice}
                    </a>
                    <p className="text-xs mt-2 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Only send payment AFTER the coach confirms your booking.
                    </p>
                  </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: coachVenmoHandle ? 0.65 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col gap-3 max-w-sm mx-auto">
                  <a
                    href={generateCalendarLink(bookingData.date, bookingData.time, bookingData.sessionType, coach?.name || 'Coach', totalPrice)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary py-3 flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} /> Add to Google Calendar
                  </a>
                  <Link to="/dashboard" className="btn-primary py-3 text-center">Go to Dashboard</Link>
                  <Link to="/coaches" className="py-3 text-sm font-bold text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Browse More Coaches
                  </Link>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}