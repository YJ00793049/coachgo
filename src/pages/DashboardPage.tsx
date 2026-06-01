import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { Calendar, Star, Plus, ChevronRight, Loader2, Trophy, Target, Clock, DollarSign, Users, TrendingUp, CheckCircle2, ExternalLink, BarChart2, Zap, Heart, X, Edit, CalendarDays, MessageSquare, CreditCard, RefreshCw, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import AnimatedCounter from '../components/AnimatedCounter';
import { SPRING } from '../tokens';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { MOCK_COACHES } from './CoachesPage';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { GlowingEffect } from '@/components/ui/glowing-effect-card';

function buildVenmoUrl(handle: string, amount: number): string {
  const note = encodeURIComponent('CoachGo Session');
  return `https://venmo.com/u/${handle}?txn=pay&amount=${amount}&note=${note}`;
}

function generateCalendarLink(session: any, coachName: string) {
  const title = encodeURIComponent(`CoachGo: ${session.session_type} with ${coachName}`);
  const date = session.date?.replace(/-/g, '');
  const timeMap: Record<string, string> = {
    '7:00 AM': '070000', '8:00 AM': '080000', '9:00 AM': '090000', '10:00 AM': '100000',
    '10:30 AM': '103000', '11:00 AM': '110000', '12:00 PM': '120000', '1:00 PM': '130000',
    '2:00 PM': '140000', '3:00 PM': '150000', '3:30 PM': '153000', '4:00 PM': '160000',
    '5:00 PM': '170000', '6:00 PM': '180000', '7:00 PM': '190000',
  };
  const startTime = timeMap[session.time_slot] || '090000';
  const endHour = parseInt(startTime.slice(0, 2)) + 1;
  const endTime = `${String(endHour).padStart(2, '0')}${startTime.slice(2)}`;
  const details = encodeURIComponent(`Session Type: ${session.session_type}\nCoach: ${coachName}\nBooked via CoachGo`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}T${startTime}/${date}T${endTime}&details=${details}`;
}

// ─── REVIEW MODAL ───────────────────────────────────────────────────
interface ReviewModalProps {
  session: any;
  coachName: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

function ReviewModal({ session, coachName, onClose, onSubmit }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || !comment.trim()) return;
    setSubmitting(true);
    await onSubmit(rating, comment.trim());
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(onClose, 1500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl p-8"
          style={{ background: '#0F1628', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: '#22c55e' }} />
              <p className="font-bold text-white text-xl mb-2">Review Submitted!</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Thanks for sharing your feedback.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#4F8EF7' }}>Leave a Review</p>
                  <h3 className="font-display text-2xl text-white">{coachName}</h3>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{session.session_type} · {session.date}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-all" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Stars */}
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Your Rating</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        fill={star <= (hovered || rating) ? '#F59E0B' : 'transparent'}
                        style={{ color: star <= (hovered || rating) ? '#F59E0B' : 'rgba(255,255,255,0.15)', transition: 'all 0.15s' }}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-xs mt-2 font-medium" style={{ color: '#F59E0B' }}>
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Your Review</p>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="How was your session? What did you improve?"
                  rows={4}
                  className="w-full rounded-2xl px-4 py-3 text-sm text-white resize-none focus:outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}
                />
                <p className="text-[10px] mt-1 text-right" style={{ color: 'rgba(255,255,255,0.2)' }}>{comment.length}/500</p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={rating === 0 || !comment.trim() || submitting}
                className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} />}
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── RESCHEDULE MODAL ───────────────────────────────────────────────
const TIME_SLOTS = [
  '7:00 AM','8:00 AM','9:00 AM','10:00 AM','10:30 AM','11:00 AM',
  '12:00 PM','1:00 PM','2:00 PM','3:00 PM','3:30 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM',
];

interface RescheduleModalProps {
  session: any;
  coachName: string;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  date: string; setDate: (v: string) => void;
  time: string; setTime: (v: string) => void;
  note: string; setNote: (v: string) => void;
  submitting: boolean;
}

function RescheduleModal({ session, coachName, onClose, onSubmit, date, setDate, time, setTime, note, setNote, submitting }: RescheduleModalProps) {
  const today = new Date().toISOString().split('T')[0];
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl p-8"
          style={{ background: '#0F1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#4F8EF7' }}>Request Reschedule</p>
              <h3 className="font-display text-2xl text-white">{session.session_type}</h3>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>with {coachName} · currently {session.date} at {session.time_slot}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-all" style={{ color: 'rgba(255,255,255,0.4)' }}><X size={20} /></button>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.3)' }}>New Date</label>
              <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-sm text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.3)' }}>New Time</label>
              <select value={time} onChange={e => setTime(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-sm text-white focus:outline-none"
                style={{ background: '#0F1628', border: '1px solid rgba(255,255,255,0.08)' }}>
                <option value="">Select time...</option>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(255,255,255,0.3)' }}>Note (optional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Reason for reschedule..."
                rows={3}
                className="w-full rounded-2xl px-4 py-3 text-sm text-white resize-none focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
          </div>
          <button onClick={onSubmit} disabled={!date || !time || submitting}
            className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {submitting ? 'Submitting...' : 'Request Reschedule'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── MAIN DASHBOARD ─────────────────────────────────────────────────
export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const [userRole, setUserRole] = useState<'player' | 'coach' | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [coachBookings, setCoachBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [coachProfilePhoto, setCoachProfilePhoto] = useState<string | null>(null);
  const [coachProfilesCache, setCoachProfilesCache] = useState<Record<string, { name: string; specialty: string; avatar_url: string }>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const reminderSentIds = useRef<Set<string>>(new Set());
  const fetchedCoachIds = useRef<Set<string>>(new Set());
  const [reviewSession, setReviewSession] = useState<any | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [rescheduleSession, setRescheduleSession] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchRole = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.exists() ? (userDoc.data().role || 'player') : 'player';
        setUserRole(role);
        if (role === 'coach') {
          try {
            const coachDoc = await getDoc(doc(db, 'coach_profiles', user.uid));
            if (coachDoc.exists()) setCoachProfilePhoto(coachDoc.data().photo_url || null);
          } catch { /* non-critical */ }
        }
      } catch {
        setUserRole('player');
      } finally {
        setRoleLoading(false);
      }
    };
    fetchRole();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const qPlayer = query(collection(db, 'bookings'), where('player_id', '==', user.uid));
    const unsubPlayer = onSnapshot(qPlayer, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBookings(data.sort((a: any, b: any) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'bookings'));

    const qCoach = query(collection(db, 'bookings'), where('coach_id', '==', user.uid));
    const unsubCoach = onSnapshot(qCoach, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCoachBookings(data.sort((a: any, b: any) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'bookings'));

    const qFav = query(collection(db, 'favorites'), where('user_id', '==', user.uid));
    const unsubFav = onSnapshot(qFav, (snap) => {
      const data = snap.docs.map(d => {
        const d2 = d.data();
        const coach = MOCK_COACHES.find(c => c.id === d2.coach_id || c.user_id === d2.coach_id);
        return { id: d.id, ...d2, coach };
      }).filter(f => f.coach);
      setFavorites(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'favorites'));

    // Track which bookings this player has already reviewed
    const qReviews = query(collection(db, 'reviews'), where('player_id', '==', user.uid));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setReviewedBookingIds(new Set(snap.docs.map(d => d.data().booking_id)));
    });

    return () => { unsubPlayer(); unsubCoach(); unsubFav(); unsubReviews(); };
  }, [user]);

  useEffect(() => {
    if (!user || !userRole || (bookings.length === 0 && coachBookings.length === 0)) return;
    const sendReminders = async () => {
      const now = new Date();
      const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      const sessions = userRole === 'coach' ? coachBookings : bookings;
      const timeMap: Record<string, [number, number]> = {
        '7:00 AM':[7,0],'8:00 AM':[8,0],'9:00 AM':[9,0],'10:00 AM':[10,0],
        '10:30 AM':[10,30],'11:00 AM':[11,0],'12:00 PM':[12,0],'1:00 PM':[13,0],
        '2:00 PM':[14,0],'3:00 PM':[15,0],'3:30 PM':[15,30],'4:00 PM':[16,0],
        '5:00 PM':[17,0],'6:00 PM':[18,0],'7:00 PM':[19,0],
      };
      for (const session of sessions) {
        if (session.status !== 'confirmed' || session.reminder_sent_24h || reminderSentIds.current.has(session.id)) continue;
        try {
          const parts = session.date?.split('-').map(Number);
          if (!parts || parts.length < 3) continue;
          const [h, m] = timeMap[session.time_slot] || [9, 0];
          const sessionDate = new Date(parts[0], parts[1] - 1, parts[2], h, m);
          if (sessionDate >= in23h && sessionDate <= in25h) {
            reminderSentIds.current.add(session.id);
            await updateDoc(doc(db, 'bookings', session.id), { reminder_sent_24h: true });
            const { notifySessionReminder } = await import('../utils/sendEmail');
            await notifySessionReminder({
              email: user.email || '',
              name: user.displayName || 'User',
              coachName: userRole === 'coach' ? (session.player_name || 'Player') : getCoachName(session.coach_id),
              sessionType: session.session_type,
              date: session.date,
              timeSlot: session.time_slot,
              isCoach: userRole === 'coach',
            });
          }
        } catch { /* non-critical */ }
      }
    };
    sendReminders();
  }, [bookings, coachBookings, userRole]);

  const cancelBooking = async (bookingId: string) => {
    setUpdatingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled' });
      // Notify the coach of cancellation
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        try {
          const coachUserDoc = await getDoc(doc(db, 'users', booking.coach_id));
          const coachEmail = coachUserDoc.exists() ? coachUserDoc.data().email : null;
          if (coachEmail) {
            const { notifyCoachBookingCancelled } = await import('../utils/sendEmail');
            await notifyCoachBookingCancelled?.({
              coachEmail,
              coachName: getCoachName(booking.coach_id),
              playerName: booking.player_name || 'Player',
              sessionType: booking.session_type,
              date: booking.date,
            });
          }
        } catch { /* non-critical */ }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const requestReschedule = async () => {
    if (!rescheduleSession || !rescheduleDate || !rescheduleTime) return;
    setRescheduling(true);
    try {
      await updateDoc(doc(db, 'bookings', rescheduleSession.id), {
        status: 'reschedule_requested',
        reschedule_date: rescheduleDate,
        reschedule_time: rescheduleTime,
        reschedule_note: rescheduleNote,
      });
      setRescheduleSession(null);
      setRescheduleDate(''); setRescheduleTime(''); setRescheduleNote('');
    } catch (err) { console.error(err); }
    finally { setRescheduling(false); }
  };

  const acceptReschedule = async (bookingId: string, newDate: string, newTime: string) => {
    setUpdatingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'confirmed',
        date: newDate,
        time_slot: newTime,
        reschedule_date: null,
        reschedule_time: null,
        reschedule_note: null,
      });
    } catch (err) { console.error(err); }
    finally { setUpdatingId(null); }
  };

  const declineReschedule = async (bookingId: string) => {
    setUpdatingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'confirmed',
        reschedule_date: null,
        reschedule_time: null,
        reschedule_note: null,
      });
    } catch (err) { console.error(err); }
    finally { setUpdatingId(null); }
  };

  const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'declined' | 'completed') => {
    setUpdatingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status });

      const booking = coachBookings.find(b => b.id === bookingId);
      if (booking && status !== 'completed') {
        const playerDoc = await getDoc(doc(db, 'users', booking.player_id));
        const playerEmail = playerDoc.exists() ? playerDoc.data().email : null;
        // Fetch coach name from profile for emails (more reliable than displayName)
        let coachName = user?.displayName || 'Your Coach';
        try {
          const coachDoc = await getDoc(doc(db, 'coach_profiles', user!.uid));
          if (coachDoc.exists()) coachName = coachDoc.data().name || coachName;
        } catch { /* fall back to displayName */ }

        if (status === 'confirmed' && playerEmail) {
          const { notifyPlayerBookingConfirmed } = await import('../utils/sendEmail');
          await notifyPlayerBookingConfirmed({
            playerEmail,
            playerName: booking.player_name || 'Player',
            coachName,
            sessionType: booking.session_type,
            date: booking.date,
            timeSlot: booking.time_slot,
            totalPrice: booking.total_price,
          });
        }

        if (status === 'declined' && playerEmail) {
          const { notifyPlayerBookingDeclined } = await import('../utils/sendEmail');
          await notifyPlayerBookingDeclined({
            playerEmail,
            playerName: booking.player_name || 'Player',
            coachName,
            sessionType: booking.session_type,
            date: booking.date,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const submitReview = async (rating: number, comment: string) => {
  if (!user || !reviewSession) return;
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const playerName = userDoc.exists()
      ? userDoc.data().name || user.displayName || 'Player'
      : user.displayName || 'Player';

    // Write the review
    await addDoc(collection(db, 'reviews'), {
      booking_id: reviewSession.id,
      coach_id: reviewSession.coach_id,
      player_id: user.uid,
      player_name: playerName,
      rating,
      comment,
      created_at: serverTimestamp(),
    });

    // Recalculate and update coach's avg rating in Firestore
    try {
      const reviewsSnap = await getDocs(
        query(collection(db, 'reviews'), where('coach_id', '==', reviewSession.coach_id))
      );
      // Include the new rating in case Firestore hasn't replicated it yet
      const allRatings = [...reviewsSnap.docs.map(d => d.data().rating as number), rating];
      const avgRating = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
      await updateDoc(doc(db, 'coach_profiles', reviewSession.coach_id), {
        rating: Math.round(avgRating * 10) / 10,
        reviews: allRatings.length,
      });
    } catch (ratingErr) {
      console.warn('Rating update blocked by Firestore rules:', ratingErr);
    }
  } catch (err) {
    console.error('Failed to submit review:', err);
  }
};

  // Fetch Firestore coach profiles for any coach not in MOCK_COACHES
  useEffect(() => {
    const allCoachIds = [...new Set([...bookings, ...coachBookings].map(b => b.coach_id).filter(Boolean))];
    const unknownIds = allCoachIds.filter(id => !MOCK_COACHES.find(c => c.user_id === id) && !fetchedCoachIds.current.has(id));
    if (unknownIds.length === 0) return;
    const fetchUnknown = async () => {
      unknownIds.forEach(id => fetchedCoachIds.current.add(id));
      const results: Record<string, { name: string; specialty: string; avatar_url: string }> = {};
      await Promise.all(unknownIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'coach_profiles', id));
          if (snap.exists()) {
            const d = snap.data();
            results[id] = { name: d.name || 'Coach', specialty: d.specialty || '', avatar_url: d.photo_url || '' };
          }
        } catch { /* non-critical */ }
      }));
      if (Object.keys(results).length > 0) setCoachProfilesCache(prev => ({ ...prev, ...results }));
    };
    fetchUnknown();
  }, [bookings, coachBookings]);

  const getCoachName = (coachId: string) =>
    MOCK_COACHES.find(c => c.user_id === coachId)?.name || coachProfilesCache[coachId]?.name || 'Unknown Coach';
  const getCoachSpecialty = (coachId: string) =>
    MOCK_COACHES.find(c => c.user_id === coachId)?.specialty || coachProfilesCache[coachId]?.specialty || '';
  const getCoachAvatar = (coachId: string) =>
    MOCK_COACHES.find(c => c.user_id === coachId)?.avatar_url || coachProfilesCache[coachId]?.avatar_url || '';

  const upcomingSessions = bookings.filter(b => ['confirmed', 'pending', 'reschedule_requested'].includes(b.status));
  const pastSessions = bookings.filter(b => b.status === 'completed');
  const today = new Date().toISOString().split('T')[0];

  const completionItems = [
    { label: 'Account created', done: true },
    { label: 'Display name set', done: !!user?.displayName },
    { label: 'First session booked', done: bookings.length > 0 },
    { label: 'Favorite a coach', done: favorites.length > 0 },
    user?.providerData?.[0]?.providerId === 'google.com'
      ? { label: 'Google account connected', done: true }
      : { label: 'Email verified', done: !!user?.emailVerified },
  ];
  const completionPct = Math.round((completionItems.filter(i => i.done).length / completionItems.length) * 100);
  const nextStep = completionItems.find(i => !i.done);

  const pendingCoachSessions = coachBookings.filter(b => b.status === 'pending');
  const rescheduleRequestsForCoach = coachBookings.filter(b => b.status === 'reschedule_requested');
  const upcomingCoachSessions = coachBookings.filter(b => b.status === 'confirmed');
  const completedCoachSessions = coachBookings.filter(b => b.status === 'completed');
  const totalRevenue = completedCoachSessions.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const uniquePlayers = new Set(coachBookings.filter(b => ['confirmed', 'completed'].includes(b.status)).map(b => b.player_id)).size;

  const monthlyRevenue = completedCoachSessions.reduce((acc: Record<string, number>, b) => {
    if (!b.date) return acc;
    const [y, mo] = b.date.split('-');
    const key = `${y}-${mo}`;
    acc[key] = (acc[key] || 0) + (b.total_price || 0);
    return acc;
  }, {} as Record<string, number>);
  const MONTH_NAMES: Record<string, string> = {
    '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun',
    '07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec',
  };
  const sortedMonths: { label: string; value: number }[] = Object.entries(monthlyRevenue)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 4)
    .map(([k, v]) => ({ label: `${MONTH_NAMES[k.split('-')[1]]} ${k.split('-')[0]}`, value: Number(v) }));

  if (loading || roleLoading) return (
    <div className="min-h-screen pt-20" style={{ background: '#0A0F1E' }}>
      <div className="relative overflow-hidden" style={{ background: 'rgba(79,142,247,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="skeleton h-4 w-32 rounded-full mb-4" />
          <div className="skeleton h-14 w-80 rounded-2xl mb-3" />
          <div className="skeleton h-5 w-64 rounded-xl mb-12" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl p-6 border border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="skeleton h-5 w-5 rounded-lg mb-3" />
                <div className="skeleton h-8 w-16 rounded-xl mb-2" />
                <div className="skeleton h-3 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── COACH DASHBOARD ───────────────────────────────────────────────
  if (userRole === 'coach') {
    return (
      <PageTransition>
        <div className="min-h-screen pt-20" style={{ background: '#0A0F1E' }}>
          <div className="relative overflow-hidden" style={{ background: 'rgba(79,142,247,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(79,142,247,0.08) 0%, transparent 70%)' }} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Coach Portal</p>
                <h1 className="font-display text-5xl md:text-6xl text-white mb-3">
                  Welcome back, {user?.displayName?.split(' ')[0] || 'Coach'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.45)' }} className="text-lg">Here's what's happening with your sessions.</p>
              </motion.div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12" style={{ perspective: '1000px' }}>
                {[
                  { label: 'Total Sessions', value: coachBookings.length, icon: <Calendar size={20} />, prefix: '' },
                  { label: 'Pending', value: pendingCoachSessions.length, icon: <Clock size={20} />, prefix: '' },
                  { label: 'Total Players', value: uniquePlayers, icon: <Users size={20} />, prefix: '' },
                  { label: 'Revenue', value: totalRevenue, icon: <DollarSign size={20} />, prefix: '$' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, rotateY: 90, scale: 0.9 }}
                    animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                    transition={{ ...SPRING, delay: i * 0.1 }}
                    whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(79,142,247,0.2)' }}
                    className="glass-card rounded-2xl p-6 border border-white/10 cursor-default"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="mb-3" style={{ color: '#4F8EF7' }}>{stat.icon}</div>
                    <p className="text-2xl font-bold text-white">
                      {stat.prefix}<AnimatedCounter to={stat.value} />
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-12">

                {pendingCoachSessions.length > 0 && (
                  <section>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="font-display text-3xl text-white">Booking Requests</h2>
                      <span className="tag-badge animate-pulse">{pendingCoachSessions.length} pending</span>
                    </div>
                    <div className="space-y-4">
                      {pendingCoachSessions.map((session, i) => (
                        <motion.div key={session.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="rounded-2xl p-6" style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)' }}>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
                              style={{ background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.25)', color: '#4F8EF7' }}>
                              <span className="text-[10px] font-bold uppercase">{session.date ? new Date(session.date).toLocaleString('default', { month: 'short' }) : '—'}</span>
                              <span className="text-xl font-bold leading-none">{session.date?.split('-')[2] || '—'}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-bold text-white text-lg">{session.player_name || 'Player'}</h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{session.skill_level}</span>
                              </div>
                              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{session.session_type} · {session.date} at {session.time_slot}</p>
                              <p className="text-sm font-bold mt-1" style={{ color: '#4F8EF7' }}>${session.total_price}</p>
                            </div>
                            <div className="flex gap-3 shrink-0">
                              <button onClick={() => updateBookingStatus(session.id, 'confirmed')} disabled={updatingId === session.id}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                                {updatingId === session.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                Accept
                              </button>
                              <button onClick={() => updateBookingStatus(session.id, 'declined')} disabled={updatingId === session.id}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                                <X size={14} /> Decline
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {rescheduleRequestsForCoach.length > 0 && (
                  <section>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="font-display text-3xl text-white">Reschedule Requests</h2>
                      <span className="tag-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)' }}>{rescheduleRequestsForCoach.length} pending</span>
                    </div>
                    <div className="space-y-4">
                      {rescheduleRequestsForCoach.map((session, i) => (
                        <motion.div key={session.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="rounded-2xl p-6" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <RefreshCw size={16} style={{ color: '#F59E0B' }} />
                                <h4 className="font-bold text-white">{session.player_name || 'Player'}</h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>reschedule request</span>
                              </div>
                              <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Original: {session.date} at {session.time_slot}
                              </p>
                              <p className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                                Requested: {session.reschedule_date} at {session.reschedule_time}
                              </p>
                              {session.reschedule_note && (
                                <p className="text-xs mt-2 italic" style={{ color: 'rgba(255,255,255,0.35)' }}>"{session.reschedule_note}"</p>
                              )}
                            </div>
                            <div className="flex gap-3 shrink-0">
                              <button onClick={() => acceptReschedule(session.id, session.reschedule_date, session.reschedule_time)} disabled={updatingId === session.id}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                                {updatingId === session.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Accept
                              </button>
                              <button onClick={() => declineReschedule(session.id)} disabled={updatingId === session.id}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                                <X size={14} /> Decline
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-display text-3xl text-white">Confirmed Sessions</h2>
                    <span className="tag-badge">{upcomingCoachSessions.length} confirmed</span>
                  </div>
                  {upcomingCoachSessions.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingCoachSessions.map((session, i) => (
                        <motion.div key={session.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="glass-card rounded-2xl border border-white/5 p-6 flex flex-col sm:flex-row sm:items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
                            style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#4F8EF7' }}>
                            <span className="text-[10px] font-bold uppercase">{session.date ? new Date(session.date).toLocaleString('default', { month: 'short' }) : '—'}</span>
                            <span className="text-xl font-bold leading-none">{session.date?.split('-')[2] || '—'}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-bold text-white text-lg">{session.player_name || 'Player'}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{session.skill_level}</span>
                            </div>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{session.session_type} · {session.date} at {session.time_slot}</p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <p className="font-bold text-xl text-white">${session.total_price}</p>
                            <button
                              onClick={() => {
                                if (session.date && new Date(session.date + 'T23:59:59') > new Date()) {
                                  if (!confirm('This session is scheduled for the future. Mark as complete anyway?')) return;
                                }
                                updateBookingStatus(session.id, 'completed');
                              }}
                              disabled={updatingId === session.id}
                              className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                              Mark Complete
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass-card rounded-3xl border border-dashed border-white/10 p-16 text-center">
                      <Calendar size={40} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
                      <p className="font-bold mb-2 text-white">No confirmed sessions</p>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Accepted bookings will appear here.</p>
                    </div>
                  )}
                </section>

                {completedCoachSessions.length > 0 && (
                  <section>
                    <h2 className="font-display text-3xl text-white mb-6">Session History</h2>
                    <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          <tr>
                            <th className="px-6 py-4">Player</th>
                            <th className="px-6 py-4">Session</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                          {completedCoachSessions.map(row => (
                            <tr key={row.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 font-medium text-white">{row.player_name || '—'}</td>
                              <td className="px-6 py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{row.session_type}</td>
                              <td className="px-6 py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{row.date}</td>
                              <td className="px-6 py-4 font-bold" style={{ color: '#4F8EF7' }}>${row.total_price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'linear-gradient(135deg, #4F8EF7, #2563EB)', boxShadow: '0 20px 60px rgba(79,142,247,0.3)' }}>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl overflow-hidden flex items-center justify-center mb-6">
                    {coachProfilePhoto ? (
                      <img src={coachProfilePhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-2xl font-bold text-white">{user?.displayName?.charAt(0) || 'C'}</span>
                    )}
                  </div>
                  <h3 className="font-display text-2xl text-white mb-1">{user?.displayName || 'Coach'}</h3>
                  <p className="text-white/60 text-sm mb-6">{user?.email}</p>
                  <div className="space-y-3">
                    <Link to="/coach-edit-profile" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10">
                      <Edit size={16} /> Edit Profile
                    </Link>
                    <Link to="/coach-availability" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10">
                      <CalendarDays size={16} /> Set Availability
                    </Link>
                    <Link to="/messages" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all rounded-xl px-4 py-3 text-sm font-bold text-white border border-white/10">
                      <MessageSquare size={16} /> Messages
                    </Link>
                  </div>
                </div>

                <div className="glass-card rounded-3xl border border-white/10 p-8">
                  <h3 className="font-display text-xl text-white mb-6 flex items-center gap-3">
                    <BarChart2 size={20} style={{ color: '#4F8EF7' }} /> REVENUE
                  </h3>
                  <div className="space-y-4 mb-6">
                    {[
                      { label: 'Total Earned', value: `$${totalRevenue}` },
                      { label: 'Completed Sessions', value: completedCoachSessions.length },
                      { label: 'Avg Per Session', value: `$${completedCoachSessions.length > 0 ? Math.round(totalRevenue / completedCoachSessions.length) : 0}` },
                      { label: 'Unique Players', value: uniquePlayers },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
                        <span className="font-bold text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  {sortedMonths.length > 0 && (
                    <>
                      <div className="border-t border-white/8 pt-6">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Monthly Breakdown</p>
                        <div className="space-y-3">
                          {sortedMonths.map(({ label, value }) => {
                            const maxVal = sortedMonths[0].value || 1;
                            const pct = Math.round((value / maxVal) * 100);
                            return (
                              <div key={label}>
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                                  <span className="text-xs font-bold" style={{ color: '#4F8EF7' }}>${value}</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                  <motion.div
                                    className="h-full rounded-full"
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${pct}%` }}
                                    viewport={{ once: true }}
                                    transition={{ ...SPRING, delay: 0.2 }}
                                    style={{ background: 'linear-gradient(90deg, #4F8EF7, #7C3AED)' }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="glass-card rounded-3xl border border-white/10 p-8">
                  <h3 className="font-display text-xl text-white mb-6 flex items-center gap-3">
                    <Trophy size={20} style={{ color: '#F59E0B' }} /> TIPS
                  </h3>
                  <ul className="space-y-4 text-sm">
                    {['Keep your availability up to date', 'Accept bookings within 24 hours', 'Add certifications to your profile'].map((tip, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: 'rgba(79,142,247,0.4)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.45)' }}>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ─── PLAYER DASHBOARD ──────────────────────────────────────────────
  return (
    <PageTransition>
      <div className="min-h-screen pt-20" style={{ background: '#0A0F1E' }}>
        <div className="relative overflow-hidden" style={{ background: 'rgba(79,142,247,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(79,142,247,0.05) 0%, transparent 70%)' }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Player Dashboard</p>
              <h1 className="font-display text-5xl md:text-6xl text-white mb-3">Welcome back, {user?.displayName?.split(' ')[0] || 'Player'}</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)' }} className="text-lg">Your development journey is in full swing.</p>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12" style={{ perspective: '1000px' }}>
              {[
                { label: 'Sessions Booked', value: bookings.length, icon: <Calendar size={20} /> },
                { label: 'Upcoming', value: upcomingSessions.length, icon: <Clock size={20} /> },
                { label: 'Completed', value: pastSessions.length, icon: <CheckCircle2 size={20} /> },
                { label: 'Fav Coaches', value: favorites.length, icon: <Heart size={20} /> },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, rotateY: 90, scale: 0.9 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  transition={{ ...SPRING, delay: i * 0.1 }}
                  whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(79,142,247,0.2)' }}
                  className="glass-card rounded-2xl p-6 border border-white/10 cursor-default"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="mb-3" style={{ color: '#4F8EF7' }}>{stat.icon}</div>
                  <p className="text-2xl font-bold text-white"><AnimatedCounter to={stat.value} /></p>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl border border-white/10 p-8">
                <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
                  {/* SVG ring — animates from 0 to completionPct */}
                  <div className="relative w-36 h-36 shrink-0">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <defs>
                        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%"  stopColor="#4F8EF7" />
                          <stop offset="55%" stopColor="#7C3AED" />
                          <stop offset="100%" stopColor="#06B6D4" />
                        </linearGradient>
                      </defs>
                      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                      <motion.circle
                        cx="60" cy="60" r="52" fill="none"
                        stroke="url(#ringGradient)"
                        strokeWidth="9"
                        strokeLinecap="round"
                        pathLength={1}
                        strokeDasharray={1}
                        initial={{ strokeDashoffset: 1 }}
                        animate={{ strokeDashoffset: 1 - (completionPct / 100) }}
                        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(79,142,247,0.45))' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-4xl leading-none" style={{ color: '#4F8EF7' }}>
                        <AnimatedCounter to={completionPct} suffix="%" />
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Complete</span>
                    </div>
                    {/* pulsing aura behind ring */}
                    <motion.div
                      aria-hidden
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{ background: 'radial-gradient(circle, rgba(79,142,247,0.25) 0%, transparent 60%)' }}
                      animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.92, 1.05, 0.92] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>

                  <div className="flex-1 w-full">
                    <h3 className="font-display text-2xl text-white mb-1">Profile Completion</h3>
                    <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {nextStep ? `Next: ${nextStep.label}` : 'Profile complete!'}
                    </p>
                    <motion.div
                      variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.4 } } }}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      {completionItems.map((item) => (
                        <motion.div
                          key={item.label}
                          variants={{
                            hidden: { opacity: 0, x: -10 },
                            visible: { opacity: 1, x: 0, transition: { ...SPRING } },
                          }}
                          className="flex items-center gap-3 text-sm"
                        >
                          <CheckCircle2 size={16} style={{ color: item.done ? '#4F8EF7' : 'rgba(255,255,255,0.1)' }} fill={item.done ? '#4F8EF7' : 'none'} />
                          <span style={{ color: item.done ? 'white' : 'rgba(255,255,255,0.3)' }} className={item.done ? 'font-medium' : ''}>{item.label}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              <section>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-display text-3xl text-white">Upcoming Sessions</h2>
                  <Link to="/coaches" className="btn-primary py-2 px-6 text-xs flex items-center gap-2"><Plus size={14} /> Book New</Link>
                </div>
                {upcomingSessions.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingSessions.map((session, i) => {
                      const coachAvatar = getCoachAvatar(session.coach_id);
                      const isToday = session.date === today;
                      return (
                        <div key={session.id} className="relative rounded-2xl">
                          <GlowingEffect disabled={false} spread={40} borderWidth={1} proximity={64} />
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...SPRING, delay: i * 0.05 }}
                            className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-6 transition-all relative"
                            style={{
                              border: isToday ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.05)',
                              boxShadow: isToday ? '0 0 28px rgba(245,158,11,0.25), inset 0 0 30px rgba(245,158,11,0.06)' : 'none',
                              background: isToday ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(255,255,255,0.03))' : undefined,
                            }}
                          >
                            {isToday && (
                              <motion.span
                                aria-label="Today"
                                className="absolute -top-2 -right-2 flex items-center gap-1 px-2.5 py-1 rounded-full z-10"
                                style={{
                                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                  border: '1px solid rgba(245,158,11,0.6)',
                                  boxShadow: '0 4px 16px rgba(245,158,11,0.45)',
                                }}
                                animate={{ scale: [1, 1.06, 1] }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                <span className="text-[9px] font-extrabold uppercase tracking-widest text-white">Today</span>
                              </motion.span>
                            )}
                          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            {coachAvatar ? <img src={coachAvatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : (
                              <div className="w-full h-full flex items-center justify-center font-bold" style={{ color: '#4F8EF7' }}>{getCoachName(session.coach_id).charAt(0)}</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-white text-lg mb-1">{session.session_type}</h4>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>with {getCoachName(session.coach_id)} · <span className="capitalize">{getCoachSpecialty(session.coach_id)}</span></p>
                            <p className="text-xs font-bold mt-1" style={{ color: '#4F8EF7' }}>{session.date} at {session.time_slot}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                            {session.status === 'confirmed' && (() => {
                              const mockCoach = MOCK_COACHES.find(c => c.user_id === session.coach_id);
                              const venmoHandle = mockCoach?.venmo_handle || session.coach_venmo_handle;
                              return venmoHandle ? (
                                <a
                                  href={buildVenmoUrl(venmoHandle, session.total_price)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all hover:opacity-90"
                                  style={{ background: '#008DF5', color: 'white', boxShadow: '0 2px 12px rgba(0,141,245,0.35)' }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span className="text-xs font-extrabold">V</span> Pay ${session.total_price}
                                </a>
                              ) : null;
                            })()}
                            <a href={generateCalendarLink(session, getCoachName(session.coach_id))} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-xl px-4 py-2 hover:bg-white/5"
                              style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <ExternalLink size={12} /> Calendar
                            </a>
                            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
                              style={{
                                color: session.status === 'confirmed' ? '#22c55e' : session.status === 'reschedule_requested' ? '#F59E0B' : '#4F8EF7',
                                background: session.status === 'confirmed' ? 'rgba(34,197,94,0.1)' : session.status === 'reschedule_requested' ? 'rgba(245,158,11,0.1)' : 'rgba(79,142,247,0.1)',
                                borderColor: session.status === 'confirmed' ? 'rgba(34,197,94,0.2)' : session.status === 'reschedule_requested' ? 'rgba(245,158,11,0.2)' : 'rgba(79,142,247,0.2)',
                              }}>
                              {session.status === 'reschedule_requested' ? 'Reschedule Req.' : session.status}
                            </span>
                            {session.status === 'confirmed' && (
                              <button
                                onClick={() => setRescheduleSession(session)}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all hover:bg-white/5"
                                style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <RefreshCw size={11} /> Reschedule
                              </button>
                            )}
                            {session.status === 'pending' && (
                              <button
                                onClick={() => cancelBooking(session.id)}
                                disabled={updatingId === session.id}
                                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all hover:bg-red-500/10 disabled:opacity-40"
                                style={{ color: 'rgba(239,68,68,0.7)', borderColor: 'rgba(239,68,68,0.2)' }}
                              >
                                {updatingId === session.id ? '...' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </motion.div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="glass-card rounded-3xl border border-dashed border-white/10 p-16 text-center">
                    <Calendar size={40} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="font-bold mb-2 text-white">No upcoming sessions</p>
                    <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Book your first session with an elite specialist.</p>
                    <Link to="/coaches" className="btn-primary py-2 px-8 text-sm">Browse Coaches</Link>
                  </div>
                )}
              </section>

              {/* Session History with Leave Review */}
              {pastSessions.length > 0 && (
                <section>
                  <h2 className="font-display text-3xl text-white mb-6">Session History</h2>
                  <div className="space-y-4">
                    {pastSessions.map((row, i) => {
                      const alreadyReviewed = reviewedBookingIds.has(row.id);
                      return (
                        <div key={row.id} className="relative rounded-2xl">
                          <GlowingEffect disabled={false} spread={30} borderWidth={1} proximity={50} />
                          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="glass-card rounded-2xl border border-white/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-white mb-1">{getCoachName(row.coach_id)}</h4>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{row.session_type} · {row.date}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border"
                              style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' }}>
                              {row.status}
                            </span>
                            {alreadyReviewed ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl"
                                style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                <Star size={11} fill="#F59E0B" /> Reviewed
                              </span>
                            ) : (
                              <button
                                onClick={() => setReviewSession(row)}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all hover:bg-white/10"
                                style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Star size={11} /> Leave Review
                              </button>
                            )}
                          </div>
                        </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass-card rounded-3xl border border-white/10 p-8">
                <h3 className="font-display text-xl text-white mb-6 flex items-center gap-3"><Star size={20} fill="#F59E0B" style={{ color: '#F59E0B' }} />SAVED COACHES</h3>
                {favorites.length > 0 ? (
                  <div className="space-y-5">
                    {favorites.map(fav => (
                      <div key={fav.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            {fav.coach.avatar_url ? <img src={fav.coach.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: '#4F8EF7' }}>{fav.coach.name?.charAt(0)}</div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{fav.coach.name}</p>
                            <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{fav.coach.specialty}</p>
                          </div>
                        </div>
                        <Link to={`/coaches/${fav.coach.id}`} className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all" style={{ color: '#4F8EF7' }}>View →</Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart size={32} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>No saved coaches yet.</p>
                    <Link to="/coaches" className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4F8EF7' }}>Browse coaches →</Link>
                  </div>
                )}
              </div>

              <div className="glass-card rounded-3xl border border-white/10 p-6">
                <Link to="/messages" className="flex items-center gap-3 w-full">
                  <MessageSquare size={20} style={{ color: '#4F8EF7' }} />
                  <div>
                    <p className="font-bold text-white text-sm">Messages</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Chat with your coaches</p>
                  </div>
                </Link>
              </div>

              <div className="glass-card rounded-3xl border border-white/10 p-8">
                <h3 className="font-display text-xl text-white mb-6 flex items-center gap-3"><Target size={20} style={{ color: '#4F8EF7' }} />BY SPECIALTY</h3>
                <div className="space-y-2">
                  {['hitting', 'pitching', 'fielding', 'strength'].map(spec => (
                    <Link key={spec} to={`/coaches?specialty=${spec}`} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
                      <span className="text-sm font-bold capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>{spec}</span>
                      <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'linear-gradient(135deg, #4F8EF7, #2563EB)', boxShadow: '0 20px 60px rgba(79,142,247,0.25)' }}>
                <TrendingUp size={32} className="mb-6 text-white/40" />
                <h3 className="font-display text-2xl text-white mb-3">Ready to level up?</h3>
                <p className="text-white/60 text-sm mb-8 leading-relaxed">Book a session with an elite specialist today.</p>
                <Link to="/coaches" className="bg-white font-bold py-4 px-6 rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-all uppercase tracking-widest" style={{ color: '#2563EB' }}>
                  Browse Marketplace <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewSession && (
        <ReviewModal
          session={reviewSession}
          coachName={getCoachName(reviewSession.coach_id)}
          onClose={() => setReviewSession(null)}
          onSubmit={submitReview}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleSession && (
        <RescheduleModal
          session={rescheduleSession}
          coachName={getCoachName(rescheduleSession.coach_id)}
          onClose={() => { setRescheduleSession(null); setRescheduleDate(''); setRescheduleTime(''); setRescheduleNote(''); }}
          onSubmit={requestReschedule}
          date={rescheduleDate} setDate={setRescheduleDate}
          time={rescheduleTime} setTime={setRescheduleTime}
          note={rescheduleNote} setNote={setRescheduleNote}
          submitting={rescheduling}
        />
      )}
    </PageTransition>
  );
}