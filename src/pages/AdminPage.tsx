import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Loader2, ShieldAlert, Users, Calendar, DollarSign, TrendingUp, CheckCircle2, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { Link } from 'react-router-dom';

const ADMIN_UIDS = ['EgFXaheIIDPYcX3Mx2blDtSqHe02'];

export default function AdminPage() {
  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'coaches'>('overview');
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      if (ADMIN_UIDS.includes(user.uid)) {
        setIsAdmin(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        setIsAdmin(snap.exists() && snap.data().role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    };
    check();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchAll = async () => {
      try {
        const [bookingsSnap, coachesSnap] = await Promise.all([
          getDocs(query(collection(db, 'bookings'), orderBy('created_at', 'desc'))),
          getDocs(collection(db, 'coach_profiles')),
        ]);
        setBookings(bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCoaches(coachesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [isAdmin]);

  const overrideStatus = async (bookingId: string, status: string) => {
    setUpdatingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
    } catch (err) { console.error(err); }
    finally { setUpdatingId(null); }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
        <Link to="/auth" className="btn-primary py-3 px-8">Sign In</Link>
      </div>
    );
  }

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: '#4F8EF7' }} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4" style={{ background: '#0A0F1E' }}>
        <ShieldAlert size={56} style={{ color: 'rgba(239,68,68,0.6)' }} />
        <h1 className="font-display text-3xl text-white">Access Denied</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>This page is restricted to administrators.</p>
        <Link to="/dashboard" className="btn-primary py-3 px-8">Back to Dashboard</Link>
      </div>
    );
  }

  const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.total_price || 0), 0);
  const byStatus = (s: string) => bookings.filter(b => b.status === s).length;

  const statusColor: Record<string, string> = {
    pending: '#4F8EF7', confirmed: '#22c55e', completed: '#a855f7',
    cancelled: 'rgba(255,255,255,0.3)', declined: '#ef4444', reschedule_requested: '#F59E0B',
  };

  const overviewStats = [
    { label: 'Total Bookings', value: bookings.length, icon: <Calendar size={22} /> },
    { label: 'Total Revenue', value: `$${totalRevenue}`, icon: <DollarSign size={22} /> },
    { label: 'Active Coaches', value: coaches.length, icon: <Users size={22} /> },
    { label: 'Pending', value: byStatus('pending'), icon: <Clock size={22} /> },
    { label: 'Confirmed', value: byStatus('confirmed'), icon: <CheckCircle2 size={22} /> },
    { label: 'Completed', value: byStatus('completed'), icon: <TrendingUp size={22} /> },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen pt-20" style={{ background: '#0A0F1E' }}>
        <div className="relative overflow-hidden" style={{ background: 'rgba(79,142,247,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Admin Panel</p>
              <h1 className="font-display text-4xl md:text-5xl text-white">Platform Overview</h1>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {overviewStats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="glass-card rounded-2xl p-5 border border-white/10">
                <div className="mb-2" style={{ color: '#4F8EF7' }}>{s.icon}</div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            {(['overview', 'bookings', 'coaches'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all"
                style={{
                  background: activeTab === tab ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)',
                  color: activeTab === tab ? '#4F8EF7' : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${activeTab === tab ? 'rgba(79,142,247,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-3xl border border-white/10 p-8">
                <h3 className="font-display text-xl text-white mb-6">Bookings by Status</h3>
                <div className="space-y-4">
                  {Object.entries(statusColor).map(([status, color]) => {
                    const count = byStatus(status);
                    const pct = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs font-bold capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>{status.replace('_', ' ')}</span>
                          <span className="text-xs font-bold" style={{ color }}>{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card rounded-3xl border border-white/10 p-8">
                <h3 className="font-display text-xl text-white mb-6">Recent Bookings</h3>
                <div className="space-y-3">
                  {bookings.slice(0, 6).map(b => (
                    <div key={b.id} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-sm font-bold text-white">{b.player_name || 'Player'}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{b.session_type} · {b.date}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full capitalize"
                        style={{ background: `${statusColor[b.status] || '#fff'}15`, color: statusColor[b.status] || '#fff' }}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <tr>
                    <th className="px-6 py-4">Player</th>
                    <th className="px-6 py-4">Session</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bookings.map(b => (
                    <>
                      <tr key={b.id} className="hover:bg-white/3 transition-colors cursor-pointer"
                        onClick={() => setExpandedBooking(expandedBooking === b.id ? null : b.id)}>
                        <td className="px-6 py-4 font-medium text-white">{b.player_name || '—'}</td>
                        <td className="px-6 py-4" style={{ color: 'rgba(255,255,255,0.45)' }}>{b.session_type}</td>
                        <td className="px-6 py-4" style={{ color: 'rgba(255,255,255,0.45)' }}>{b.date}</td>
                        <td className="px-6 py-4 font-bold" style={{ color: '#4F8EF7' }}>${b.total_price}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full capitalize"
                            style={{ background: `${statusColor[b.status] || '#fff'}15`, color: statusColor[b.status] || '#fff' }}>
                            {b.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {expandedBooking === b.id ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                        </td>
                      </tr>
                      {expandedBooking === b.id && (
                        <tr key={`${b.id}-exp`}>
                          <td colSpan={6} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <div className="flex flex-wrap gap-4 text-xs mb-4">
                              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Coach ID: </span><span className="text-white font-mono">{b.coach_id}</span></div>
                              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Player ID: </span><span className="text-white font-mono">{b.player_id}</span></div>
                              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Time: </span><span className="text-white">{b.time_slot}</span></div>
                              <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Level: </span><span className="text-white">{b.skill_level}</span></div>
                              {b.notes && <div className="w-full"><span style={{ color: 'rgba(255,255,255,0.35)' }}>Notes: </span><span className="text-white">{b.notes}</span></div>}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {['pending','confirmed','completed','cancelled','declined'].map(s => (
                                <button key={s} disabled={b.status === s || updatingId === b.id}
                                  onClick={() => overrideStatus(b.id, s)}
                                  className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 hover:opacity-80"
                                  style={{ background: `${statusColor[s] || '#fff'}15`, color: statusColor[s] || '#fff', border: `1px solid ${statusColor[s] || '#fff'}30` }}>
                                  {updatingId === b.id ? '...' : `→ ${s}`}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 && (
                <div className="py-16 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No bookings yet.</div>
              )}
            </div>
          )}

          {/* Coaches Tab */}
          {activeTab === 'coaches' && (
            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Specialty</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Active</th>
                    <th className="px-6 py-4">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {coaches.map(c => (
                    <tr key={c.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {c.photo_url && <img src={c.photo_url} alt="" className="w-8 h-8 rounded-xl object-cover" />}
                          <span className="font-medium text-white">{c.name || c.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize" style={{ color: 'rgba(255,255,255,0.45)' }}>{c.specialty || '—'}</td>
                      <td className="px-6 py-4 font-bold" style={{ color: '#F59E0B' }}>{c.rating ? `★ ${c.rating}` : '—'}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{ background: c.is_active !== false ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', color: c.is_active !== false ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>
                          {c.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`/coaches/${c.id}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-bold" style={{ color: '#4F8EF7' }}>View →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {coaches.length === 0 && (
                <div className="py-16 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>No coach profiles found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
