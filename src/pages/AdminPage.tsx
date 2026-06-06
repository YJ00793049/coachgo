import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, getDoc, setDoc, query, orderBy, updateDoc, deleteDoc, getCountFromServer, where, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Loader2, ShieldAlert, Users, Calendar, DollarSign, TrendingUp, CheckCircle2, Clock, X, ChevronDown, ChevronUp, Star, Trash2, BarChart2, Settings, Eye } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { Link } from 'react-router-dom';

// Unified with firestore.rules isAdmin(): verified admin email OR users/{uid}.role === 'admin'
const ADMIN_EMAIL = 'yuvrajjindal2020@gmail.com';

export default function AdminPage() {
  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [profileViews, setProfileViews] = useState<number | null>(null);
  const [flags, setFlags] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'bookings' | 'coaches' | 'reviews' | 'settings'>('overview');
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      if (user.email === ADMIN_EMAIL && user.emailVerified) {
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
        const [bookingsSnap, coachesSnap, reviewsSnap, flagsSnap] = await Promise.all([
          getDocs(query(collection(db, 'bookings'), orderBy('created_at', 'desc'))),
          getDocs(collection(db, 'coach_profiles')),
          getDocs(query(collection(db, 'reviews'), orderBy('created_at', 'desc'))).catch(() => null),
          getDoc(doc(db, 'config', 'flags')).catch(() => null),
        ]);
        setBookings(bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCoaches(coachesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        if (reviewsSnap) setReviews(reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        if (flagsSnap && flagsSnap.exists()) { setFlags(flagsSnap.data()); setAnnouncement(flagsSnap.data().announcement || ''); }
        try {
          const vc = await getCountFromServer(collection(db, 'coach_views'));
          setProfileViews(vc.data().count);
        } catch { setProfileViews(null); }
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

  const toggleCoachActive = async (coachId: string, current: boolean) => {
    setUpdatingId(coachId);
    try {
      await updateDoc(doc(db, 'coach_profiles', coachId), { is_active: !current });
      setCoaches(prev => prev.map(c => c.id === coachId ? { ...c, is_active: !current } : c));
    } catch (err) { console.error(err); }
    finally { setUpdatingId(null); }
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Delete this review permanently?')) return;
    setUpdatingId(reviewId);
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err) { console.error(err); }
    finally { setUpdatingId(null); }
  };

  const saveFlags = async (next: Record<string, any>) => {
    setFlags(next);
    try { await setDoc(doc(db, 'config', 'flags'), { ...next, updated_at: serverTimestamp() }, { merge: true }); }
    catch (err) { console.error(err); }
  };
  const toggleFlag = (key: string) => saveFlags({ ...flags, [key]: !flags[key] });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F6F4EF' }}>
        <Link to="/auth" className="btn-primary py-3 px-8">Sign In</Link>
      </div>
    );
  }

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F6F4EF' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: '#1B1813' }} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4" style={{ background: '#F6F4EF' }}>
        <ShieldAlert size={56} style={{ color: 'rgba(188,90,72,0.6)' }} />
        <h1 className="font-display text-3xl text-ink">Access Denied</h1>
        <p style={{ color: 'rgba(27,24,19,0.4)' }}>This page is restricted to administrators.</p>
        <Link to="/dashboard" className="btn-primary py-3 px-8">Back to Dashboard</Link>
      </div>
    );
  }

  const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.total_price || 0), 0);
  const byStatus = (s: string) => bookings.filter(b => b.status === s).length;

  const statusColor: Record<string, string> = {
    pending: '#1B1813', confirmed: '#5E8C5A', completed: '#8A7BA8',
    cancelled: 'rgba(27,24,19,0.3)', declined: '#BC5A48', reschedule_requested: '#C79A57',
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
      <div className="min-h-screen pt-20" style={{ background: '#F6F4EF' }}>
        <div className="relative overflow-hidden" style={{ background: 'rgba(27,24,19,0.05)', borderBottom: '1px solid rgba(27,24,19,0.06)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(27,24,19,0.3)' }}>Admin Panel</p>
              <h1 className="font-display text-4xl md:text-5xl text-ink">Platform Overview</h1>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {overviewStats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="glass-card rounded-2xl p-5 border border-[rgba(27,24,19,0.10)]">
                <div className="mb-2" style={{ color: '#1B1813' }}>{s.icon}</div>
                <p className="text-2xl font-bold text-ink">{s.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(27,24,19,0.2)' }}>{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {(['overview', 'funnel', 'bookings', 'coaches', 'reviews', 'settings'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all"
                style={{
                  background: activeTab === tab ? 'rgba(27,24,19,0.15)' : 'rgba(27,24,19,0.03)',
                  color: activeTab === tab ? '#1B1813' : 'rgba(27,24,19,0.35)',
                  border: `1px solid ${activeTab === tab ? 'rgba(27,24,19,0.3)' : 'rgba(27,24,19,0.06)'}`,
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                <h3 className="font-display text-xl text-ink mb-6">Bookings by Status</h3>
                <div className="space-y-4">
                  {Object.entries(statusColor).map(([status, color]) => {
                    const count = byStatus(status);
                    const pct = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs font-bold capitalize" style={{ color: 'rgba(27,24,19,0.5)' }}>{status.replace('_', ' ')}</span>
                          <span className="text-xs font-bold" style={{ color }}>{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(27,24,19,0.06)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                <h3 className="font-display text-xl text-ink mb-6">Recent Bookings</h3>
                <div className="space-y-3">
                  {bookings.slice(0, 6).map(b => (
                    <div key={b.id} className="flex items-center justify-between gap-4 py-2 border-b border-[rgba(27,24,19,0.06)] last:border-0">
                      <div>
                        <p className="text-sm font-bold text-ink">{b.player_name || 'Player'}</p>
                        <p className="text-xs" style={{ color: 'rgba(27,24,19,0.35)' }}>{b.session_type} · {b.date}</p>
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

          {/* Funnel Tab */}
          {activeTab === 'funnel' && (() => {
            const views = profileViews ?? 0;
            const created = bookings.length;
            const confirmed = byStatus('confirmed') + byStatus('completed');
            const completed = byStatus('completed');
            const steps = [
              { label: 'Profile views', value: views, icon: <Eye size={18} /> },
              { label: 'Bookings created', value: created, icon: <Calendar size={18} /> },
              { label: 'Confirmed', value: confirmed, icon: <CheckCircle2 size={18} /> },
              { label: 'Completed (paid)', value: completed, icon: <DollarSign size={18} /> },
            ];
            const max = Math.max(views, created, 1);
            const conv = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
            return (
              <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                <h3 className="font-display text-xl text-ink mb-2">Conversion funnel</h3>
                <p className="text-sm mb-8" style={{ color: 'rgba(27,24,19,0.45)' }}>View → book → confirm → complete, across the platform.</p>
                <div className="space-y-5">
                  {steps.map((s, i) => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm flex items-center gap-2 text-ink">{s.icon} {s.label}</span>
                        <span className="text-sm font-bold text-ink">
                          {s.value}{i > 0 && <span className="ml-2 text-xs" style={{ color: 'rgba(27,24,19,0.4)' }}>{conv(s.value, steps[i - 1].value)}% of prev</span>}
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full" style={{ background: 'rgba(27,24,19,0.06)' }}>
                        <motion.div className="h-full rounded-full" style={{ background: '#16130E' }}
                          initial={{ width: 0 }} animate={{ width: `${Math.round((s.value / max) * 100)}%` }} transition={{ delay: i * 0.08, duration: 0.6 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-6" style={{ color: 'rgba(27,24,19,0.35)' }}>
                  Overall view→booking: <strong style={{ color: 'var(--ink)' }}>{conv(created, views)}%</strong> · booking→completed: <strong style={{ color: 'var(--ink)' }}>{conv(completed, created)}%</strong>
                </p>
              </div>
            );
          })()}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[rgba(27,24,19,0.04)] text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(27,24,19,0.3)' }}>
                  <tr>
                    <th className="px-6 py-4">Player</th>
                    <th className="px-6 py-4">Session</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(27,24,19,0.06)]">
                  {bookings.map(b => (
                    <>
                      <tr key={b.id} className="hover:bg-[rgba(27,24,19,0.03)] transition-colors cursor-pointer"
                        onClick={() => setExpandedBooking(expandedBooking === b.id ? null : b.id)}>
                        <td className="px-6 py-4 font-medium text-ink">{b.player_name || '—'}</td>
                        <td className="px-6 py-4" style={{ color: 'rgba(27,24,19,0.45)' }}>{b.session_type}</td>
                        <td className="px-6 py-4" style={{ color: 'rgba(27,24,19,0.45)' }}>{b.date}</td>
                        <td className="px-6 py-4 font-bold" style={{ color: '#1B1813' }}>${b.total_price}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full capitalize"
                            style={{ background: `${statusColor[b.status] || '#fff'}15`, color: statusColor[b.status] || '#fff' }}>
                            {b.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {expandedBooking === b.id ? <ChevronUp size={16} style={{ color: 'rgba(27,24,19,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(27,24,19,0.3)' }} />}
                        </td>
                      </tr>
                      {expandedBooking === b.id && (
                        <tr key={`${b.id}-exp`}>
                          <td colSpan={6} className="px-6 py-4" style={{ background: 'rgba(27,24,19,0.02)' }}>
                            <div className="flex flex-wrap gap-4 text-xs mb-4">
                              <div><span style={{ color: 'rgba(27,24,19,0.35)' }}>Coach ID: </span><span className="text-ink font-mono">{b.coach_id}</span></div>
                              <div><span style={{ color: 'rgba(27,24,19,0.35)' }}>Player ID: </span><span className="text-ink font-mono">{b.player_id}</span></div>
                              <div><span style={{ color: 'rgba(27,24,19,0.35)' }}>Time: </span><span className="text-ink">{b.time_slot}</span></div>
                              <div><span style={{ color: 'rgba(27,24,19,0.35)' }}>Level: </span><span className="text-ink">{b.skill_level}</span></div>
                              {b.notes && <div className="w-full"><span style={{ color: 'rgba(27,24,19,0.35)' }}>Notes: </span><span className="text-ink">{b.notes}</span></div>}
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
                <div className="py-16 text-center" style={{ color: 'rgba(27,24,19,0.3)' }}>No bookings yet.</div>
              )}
            </div>
          )}

          {/* Coaches Tab */}
          {activeTab === 'coaches' && (
            <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[rgba(27,24,19,0.04)] text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(27,24,19,0.3)' }}>
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Specialty</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Active</th>
                    <th className="px-6 py-4">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(27,24,19,0.06)]">
                  {coaches.map(c => (
                    <tr key={c.id} className="hover:bg-[rgba(27,24,19,0.03)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {c.photo_url && <img src={c.photo_url} alt="" className="w-8 h-8 rounded-xl object-cover" />}
                          <span className="font-medium text-ink">{c.name || c.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize" style={{ color: 'rgba(27,24,19,0.45)' }}>{c.specialty || '—'}</td>
                      <td className="px-6 py-4 font-bold" style={{ color: '#C79A57' }}>{c.rating ? `★ ${c.rating}` : '—'}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleCoachActive(c.id, c.is_active !== false)}
                          disabled={updatingId === c.id}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
                          title="Toggle active"
                          style={{ background: c.is_active !== false ? 'rgba(94,140,90,0.12)' : 'rgba(27,24,19,0.05)', color: c.is_active !== false ? '#5E8C5A' : 'rgba(27,24,19,0.4)', border: `1px solid ${c.is_active !== false ? 'rgba(94,140,90,0.3)' : 'var(--line-strong)'}` }}>
                          {updatingId === c.id ? '…' : (c.is_active !== false ? 'Active' : 'Inactive')}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`/coaches/${c.id}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-bold" style={{ color: '#1B1813' }}>View →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {coaches.length === 0 && (
                <div className="py-16 text-center" style={{ color: 'rgba(27,24,19,0.3)' }}>No coach profiles found.</div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] overflow-hidden">
              <div className="divide-y divide-[rgba(27,24,19,0.06)]">
                {reviews.map(r => (
                  <div key={r.id} className="p-6 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-ink">{r.player_name || 'Player'}</span>
                        <span className="inline-flex items-center gap-0.5 text-xs" style={{ color: '#C79A57' }}>
                          {Array.from({ length: r.rating || 0 }).map((_, i) => <Star key={i} size={11} fill="#C79A57" style={{ color: '#C79A57' }} />)}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: 'rgba(27,24,19,0.6)' }}>{r.comment}</p>
                      <p className="text-[11px] mt-1 font-mono" style={{ color: 'rgba(27,24,19,0.3)' }}>coach: {r.coach_id}</p>
                    </div>
                    <button onClick={() => deleteReview(r.id)} disabled={updatingId === r.id}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs transition-colors hover:bg-[rgba(188,90,72,0.1)] disabled:opacity-40"
                      style={{ border: '1px solid var(--line-strong)', color: '#BC5A48' }}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                ))}
              </div>
              {reviews.length === 0 && (
                <div className="py-16 text-center" style={{ color: 'rgba(27,24,19,0.3)' }}>No reviews found.</div>
              )}
            </div>
          )}

          {/* Settings / Feature flags Tab */}
          {activeTab === 'settings' && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                <h3 className="font-display text-xl text-ink mb-6 flex items-center gap-3"><Settings size={20} /> Feature flags</h3>
                {[
                  { key: 'maintenance', label: 'Maintenance banner', desc: 'Show a site-wide maintenance notice.' },
                  { key: 'ai_match_enabled', label: 'AI match', desc: 'Enable the AI coach-matching tool.' },
                  { key: 'instant_book_promo', label: 'Promote instant book', desc: 'Highlight instant-book coaches.' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between gap-4 py-3" style={{ borderTop: '1px solid var(--line)' }}>
                    <div>
                      <p className="text-sm font-medium text-ink">{f.label}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{f.desc}</p>
                    </div>
                    <button onClick={() => toggleFlag(f.key)} aria-pressed={!!flags[f.key]}
                      className="shrink-0 w-12 h-7 rounded-full flex items-center transition-colors"
                      style={{ background: flags[f.key] ? 'var(--black)' : 'rgba(27,24,19,0.16)', padding: 3 }}>
                      <span className="w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: flags[f.key] ? 'translateX(20px)' : 'translateX(0)' }} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                <h3 className="font-display text-xl text-ink mb-2 flex items-center gap-3"><BarChart2 size={20} /> Announcement</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--ink-soft)' }}>Shown in the maintenance banner when enabled.</p>
                <textarea
                  value={announcement}
                  onChange={e => setAnnouncement(e.target.value)}
                  rows={3}
                  placeholder="e.g. Scheduled maintenance Sunday 2–4am PT."
                  className="cg-input text-sm resize-none mb-3"
                />
                <button onClick={() => saveFlags({ ...flags, announcement })} className="btn-primary py-2.5 px-5 text-sm">Save announcement</button>
                <p className="text-xs mt-4" style={{ color: 'var(--ink-faint)' }}>
                  Admin identity is unified with security rules: verified <span className="font-mono">{ADMIN_EMAIL}</span> or a user with <span className="font-mono">role: 'admin'</span>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
