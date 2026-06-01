import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft, Save, CheckCircle2, Loader2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import PageTransition from '../components/PageTransition';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'];

type Availability = Record<string, string[]>;

export default function CoachAvailabilityPage() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [availability, setAvailability] = useState<Availability>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'coach_profiles', user.uid));
        if (snap.exists() && snap.data().availability) setAvailability(snap.data().availability);
      } catch (e) { 
        handleFirestoreError(e, OperationType.GET, 'coach_profiles');
      } finally { setLoading(false); }
    };
    fetch();
  }, [user]);

  const toggleSlot = (day: string, slot: string) => setAvailability(prev => {
    const daySlots = prev[day] || [];
    return { ...prev, [day]: daySlots.includes(slot) ? daySlots.filter(s => s !== slot) : [...daySlots, slot] };
  });

  const toggleDay = (day: string) => {
    const daySlots = availability[day] || [];
    setAvailability(prev => ({ ...prev, [day]: daySlots.length === TIME_SLOTS.length ? [] : [...TIME_SLOTS] }));
  };

  const totalSlots = Object.values(availability).flat().length;

  const handleSave = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'coach_profiles', user.uid), { availability, updated_at: serverTimestamp() }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { 
      handleFirestoreError(e, OperationType.WRITE, 'coach_profiles');
    } finally { setIsSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}><Loader2 className="animate-spin" size={40} style={{ color: '#4F8EF7' }} /></div>;

  return (
    <PageTransition>
      <div className="min-h-screen" style={{ background: '#0A0F1E' }}>
        <div className="py-12 pt-28" style={{ background: 'rgba(79,142,247,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-4xl mx-auto px-4">
            <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium mb-6 w-fit" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#4F8EF7' }}>Availability</p>
            <h1 className="text-3xl font-bold text-white">Set Your Schedule</h1>
            <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Select your available days and time slots. Players will see this on your profile.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8 p-4 rounded-2xl" style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.15)' }}>
            <div className="flex items-center gap-3">
              <Clock size={18} style={{ color: '#4F8EF7' }} />
              <span className="text-sm font-bold text-white">{totalSlots} time slots selected</span>
            </div>
            <button onClick={() => setAvailability({})} className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Clear All</button>
          </div>

          <div className="space-y-4 mb-12">
            {DAYS.map((day, di) => {
              const daySlots = availability[day] || [];
              const isFullDay = daySlots.length === TIME_SLOTS.length;
              const hasSlots = daySlots.length > 0;
              return (
                <motion.div key={day} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.05 }}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: hasSlots ? '1px solid rgba(79,142,247,0.2)' : '1px solid rgba(255,255,255,0.06)', background: hasSlots ? 'rgba(79,142,247,0.04)' : 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleDay(day)}
                        className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all"
                        style={{ borderColor: hasSlots ? '#4F8EF7' : 'rgba(255,255,255,0.2)', background: isFullDay ? '#4F8EF7' : 'transparent' }}>
                        {hasSlots && <CheckCircle2 size={14} className="text-white" />}
                      </button>
                      <span className="font-bold text-white">{day}</span>
                      {hasSlots && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(79,142,247,0.15)', color: '#4F8EF7' }}>{daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}</span>}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {isFullDay ? 'All day' : hasSlots ? 'Custom' : 'Unavailable'}
                    </span>
                  </div>
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    {TIME_SLOTS.map(slot => {
                      const active = daySlots.includes(slot);
                      return (
                        <button key={slot} onClick={() => toggleSlot(day, slot)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{ background: active ? 'rgba(79,142,247,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? 'rgba(79,142,247,0.4)' : 'rgba(255,255,255,0.06)'}`, color: active ? '#4F8EF7' : 'rgba(255,255,255,0.35)' }}>
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pb-12">
            <Link to="/dashboard" className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</Link>
            <button onClick={handleSave} disabled={isSubmitting} className="btn-primary py-4 px-10 flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : saved ? <><CheckCircle2 size={16} /> Saved!</> : <><Save size={16} /> Save Availability</>}
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}