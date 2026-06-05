import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Loader2, User, Edit3, CheckCircle2, Calendar, Trophy, Heart, Star, Save } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { Link } from 'react-router-dom';

export default function PlayerProfilePage() {
  const [user] = useAuthState(auth);
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ sessions: 0, completed: 0, coaches: 0, reviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    const fetchStats = async () => {
      try {
        const [bookingsSnap, reviewsSnap, favsSnap] = await Promise.all([
          getDocs(query(collection(db, 'bookings'), where('player_id', '==', user.uid))),
          getDocs(query(collection(db, 'reviews'), where('player_id', '==', user.uid))),
          getDocs(query(collection(db, 'favorites'), where('user_id', '==', user.uid))),
        ]);
        const bookings = bookingsSnap.docs.map(d => d.data());
        const completed = bookings.filter(b => b.status === 'completed').length;
        const uniqueCoaches = new Set(bookings.map(b => b.coach_id)).size;
        setStats({
          sessions: bookings.length,
          completed,
          coaches: uniqueCoaches,
          reviews: reviewsSnap.size,
        });
      } catch { /* non-critical */ }
      finally { setLoading(false); }
    };
    fetchStats();
  }, [user]);

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { name: displayName.trim() });
      await updateProfile(user, { displayName: displayName.trim() });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F6F4EF' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: '#1B1813' }} />
      </div>
    );
  }

  const statCards = [
    { label: 'Sessions Booked', value: stats.sessions, icon: <Calendar size={20} /> },
    { label: 'Completed', value: stats.completed, icon: <CheckCircle2 size={20} /> },
    { label: 'Coaches Trained With', value: stats.coaches, icon: <Trophy size={20} /> },
    { label: 'Reviews Left', value: stats.reviews, icon: <Star size={20} /> },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen pt-20" style={{ background: '#F6F4EF' }}>
        {/* Header */}
        <div className="relative overflow-hidden" style={{ background: 'rgba(27,24,19,0.05)', borderBottom: '1px solid rgba(27,24,19,0.06)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(27,24,19,0.07) 0%, transparent 70%)' }} />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(27,24,19,0.3)' }}>My Profile</p>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--paper-warm)' }}>
                  <span className="text-3xl font-bold text-ink">{(displayName || user.email || 'P').charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h1 className="font-display text-4xl md:text-5xl text-ink">{displayName || 'Player'}</h1>
                  <p style={{ color: 'rgba(27,24,19,0.4)' }} className="mt-1">{user.email}</p>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              {statCards.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="glass-card rounded-2xl p-5 border border-[rgba(27,24,19,0.10)]">
                  <div className="mb-2" style={{ color: '#1B1813' }}>{s.icon}</div>
                  <p className="text-2xl font-bold text-ink">{s.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(27,24,19,0.2)' }}>{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Edit Name */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
              <h2 className="font-display text-2xl text-ink mb-6 flex items-center gap-3">
                <User size={20} style={{ color: '#1B1813' }} /> Display Name
              </h2>
              {editing ? (
                <div className="space-y-4">
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full rounded-2xl px-4 py-3 text-ink focus:outline-none"
                    style={{ background: 'rgba(27,24,19,0.04)', border: '1px solid rgba(27,24,19,0.4)' }}
                    placeholder="Your name"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                  />
                  <div className="flex gap-3">
                    <button onClick={handleSave} disabled={saving || !displayName.trim()}
                      className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setEditing(false); setDisplayName(user.displayName || ''); }}
                      className="px-4 py-3 rounded-2xl text-sm font-bold transition-all hover:bg-[rgba(27,24,19,0.04)]"
                      style={{ color: 'rgba(27,24,19,0.4)', border: '1px solid rgba(27,24,19,0.08)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-ink">{displayName || '—'}</p>
                    {saved && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#5E8C5A' }}>
                        <CheckCircle2 size={12} /> Saved!
                      </p>
                    )}
                  </div>
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-[rgba(27,24,19,0.04)]"
                    style={{ color: '#1B1813', border: '1px solid rgba(27,24,19,0.2)' }}>
                    <Edit3 size={14} /> Edit
                  </button>
                </div>
              )}
            </motion.div>

            {/* Account Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
              <h2 className="font-display text-2xl text-ink mb-6 flex items-center gap-3">
                <CheckCircle2 size={20} style={{ color: '#1B1813' }} /> Account
              </h2>
              <div className="space-y-4">
                {[
                  { label: 'Email', value: user.email || '—' },
                  { label: 'Verified', value: user.emailVerified ? 'Yes' : 'No' },
                  { label: 'Member Since', value: user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>{item.label}</span>
                    <span className="text-sm font-bold text-ink">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8 md:col-span-2">
              <h2 className="font-display text-2xl text-ink mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Browse Coaches', to: '/coaches', color: '#1B1813' },
                  { label: 'My Dashboard', to: '/dashboard', color: '#5E8C5A' },
                  { label: 'Saved Coaches', to: '/dashboard', color: '#C79A57', icon: <Heart size={16} /> },
                ].map(link => (
                  <Link key={link.label} to={link.to}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all hover:opacity-80 border border-[rgba(27,24,19,0.08)]"
                    style={{ background: `${link.color}15`, color: link.color }}>
                    {link.icon} {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
