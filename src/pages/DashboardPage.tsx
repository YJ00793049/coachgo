import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import {
  Loader2, Users, Clock, CheckCircle2, Heart, Star, MessageSquare, Edit, Target,
  ChevronRight, Phone, Mail, TrendingUp, Trophy, Zap, Link2, UserCircle, Eye, X, Check,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import AnimatedCounter from '../components/AnimatedCounter';
import MarketingToolkit from '../components/MarketingToolkit';
import { notify } from '../utils/notifications';
import { SPRING } from '../tokens';
import { offeringLabels } from '../utils/offerings';
import {
  collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc,
  serverTimestamp, getDocs, getCountFromServer,
} from 'firebase/firestore';
import { MOCK_COACHES } from './CoachesPage';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

// ─── MAIN DASHBOARD ─────────────────────────────────────────────────
export default function DashboardPage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<'player' | 'coach' | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const [sentConnections, setSentConnections] = useState<any[]>([]);   // player → coaches
  const [incomingConnections, setIncomingConnections] = useState<any[]>([]); // coach ← players
  const [favorites, setFavorites] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [coachProfilePhoto, setCoachProfilePhoto] = useState<string | null>(null);
  const [coachProfileData, setCoachProfileData] = useState<any>(null);
  const [profileViews, setProfileViews] = useState<number | null>(null);
  const [playerProfile, setPlayerProfile] = useState<any>(null);
  const [playerName, setPlayerName] = useState('');

  // Role + own profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.exists() ? (userDoc.data().role || 'player') : 'player';
        setUserRole(role);
        setPlayerName(userDoc.exists() ? (userDoc.data().name || user.displayName || 'Player') : (user.displayName || 'Player'));
        if (role === 'coach') {
          try {
            const coachDoc = await getDoc(doc(db, 'coach_profiles', user.uid));
            if (coachDoc.exists()) {
              setCoachProfilePhoto(coachDoc.data().photo_url || null);
              setCoachProfileData(coachDoc.data());
            }
          } catch { /* non-critical */ }
        } else {
          try {
            const pDoc = await getDoc(doc(db, 'players', user.uid));
            if (pDoc.exists()) setPlayerProfile(pDoc.data());
          } catch { /* non-critical */ }
        }
      } catch {
        setUserRole('player');
      } finally {
        setRoleLoading(false);
      }
    })();
  }, [user]);

  // Connections + favorites listeners
  useEffect(() => {
    if (!user) return;
    const byCreated = (a: any, b: any) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0);

    const unsubSent = onSnapshot(
      query(collection(db, 'connections'), where('player_id', '==', user.uid)),
      (snap) => { setSentConnections(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreated)); setLoading(false); },
      (err) => { handleFirestoreError(err, OperationType.GET, 'connections'); setLoading(false); },
    );

    const unsubIncoming = onSnapshot(
      query(collection(db, 'connections'), where('coach_user_id', '==', user.uid)),
      (snap) => { setIncomingConnections(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byCreated)); setLoading(false); },
      (err) => { handleFirestoreError(err, OperationType.GET, 'connections'); setLoading(false); },
    );

    const unsubFav = onSnapshot(
      query(collection(db, 'favorites'), where('user_id', '==', user.uid)),
      (snap) => {
        const data = snap.docs.map(d => {
          const d2 = d.data();
          const coach = MOCK_COACHES.find(c => c.id === d2.coach_id || c.user_id === d2.coach_id);
          return { id: d.id, ...d2, coach };
        }).filter(f => f.coach);
        setFavorites(data);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'favorites'),
    );

    return () => { unsubSent(); unsubIncoming(); unsubFav(); };
  }, [user]);

  // Profile view count (coach analytics)
  useEffect(() => {
    if (!user || userRole !== 'coach') return;
    (async () => {
      try {
        const c = await getCountFromServer(query(collection(db, 'coach_views'), where('coach_id', '==', user.uid)));
        setProfileViews(c.data().count);
      } catch { setProfileViews(null); }
    })();
  }, [user, userRole]);

  // ── Coach: accept / ignore a connection ──
  const respondToConnection = async (conn: any, status: 'accepted' | 'ignored') => {
    setUpdatingId(conn.id);
    try {
      await updateDoc(doc(db, 'connections', conn.id), { status, updated_at: serverTimestamp() });
      notify(conn.player_id, {
        type: status === 'accepted' ? 'connection_accepted' : 'connection_ignored',
        title: status === 'accepted'
          ? `${conn.coach_name || 'Your coach'} accepted your request`
          : 'Update on your connection request',
        body: status === 'accepted'
          ? 'You can now message them in the app to plan your training.'
          : `${conn.coach_name || 'The coach'} isn't able to take you on right now.`,
        link: '/dashboard',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'connections');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Open (or create) a conversation, then go to it ──
  const openConversation = async (coachUid: string, playerUid: string, coachName: string, pName: string) => {
    try {
      const snap = await getDocs(query(
        collection(db, 'conversations'),
        where('coach_id', '==', coachUid),
        where('player_id', '==', playerUid),
      ));
      const convoId = !snap.empty ? snap.docs[0].id : (await addDoc(collection(db, 'conversations'), {
        coach_id: coachUid,
        player_id: playerUid,
        participants: [coachUid, playerUid],
        last_message: '',
        last_message_at: serverTimestamp(),
        unread_count_coach: 0,
        unread_count_player: 0,
        coach_name: coachName,
        player_name: pName,
      })).id;
      navigate(`/messages/${convoId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'conversations');
    }
  };

  const getMockCoach = (conn: any) =>
    MOCK_COACHES.find(c => c.id === conn.coach_id || c.user_id === conn.coach_user_id);

  // Derived
  const pendingIncoming = incomingConnections.filter(c => c.status === 'pending');
  const acceptedIncoming = incomingConnections.filter(c => c.status === 'accepted');
  const uniquePlayers = new Set(acceptedIncoming.map(c => c.player_id)).size;
  const acceptRate = incomingConnections.length > 0
    ? Math.round((acceptedIncoming.length / incomingConnections.length) * 100)
    : 0;

  const acceptedSent = sentConnections.filter(c => c.status === 'accepted');
  const pendingSent = sentConnections.filter(c => c.status === 'pending');

  // Coach profile strength (booking fields removed)
  const cp = coachProfileData || {};
  const completenessItems = [
    { label: 'Profile photo', done: !!(cp.photo_url || coachProfilePhoto), nudge: 'Players skim photos first — add a clear headshot.' },
    { label: 'Intro video', done: !!cp.video_url, nudge: 'Coaches with an intro video get 3× more connections.' },
    { label: 'Bio', done: (cp.bio || '').length >= 20, nudge: 'A short bio builds trust with parents and players.' },
    { label: 'Skill tags', done: Array.isArray(cp.skills) && cp.skills.length > 0, nudge: 'Tag what you teach so the right players find you.' },
    { label: 'What you offer', done: Array.isArray(cp.session_offerings) && cp.session_offerings.length > 0, nudge: 'Let players know if you do 1-on-1, group, or both.' },
    { label: 'Starting price', done: (cp.price_per_session || 0) > 0, nudge: 'Show a starting price so players know what to expect.' },
    { label: 'Affiliations', done: Array.isArray(cp.affiliations) && cp.affiliations.length > 0, nudge: 'Show teams/schools to back up your credentials.' },
  ];
  const profileStrength = Math.round(completenessItems.filter(i => i.done).length / completenessItems.length * 100);
  const topNudge = completenessItems.find(i => !i.done);

  // Player profile completion
  const pp = playerProfile || {};
  const playerItems = [
    { label: 'Account created', done: true },
    { label: 'Name set', done: !!(pp.name || user?.displayName) },
    { label: 'Profile details added', done: !!(pp.primary_position || pp.age || pp.grade || pp.goals) },
    { label: 'Connected with a coach', done: acceptedSent.length > 0 },
    { label: 'Favorite a coach', done: favorites.length > 0 },
  ];
  const completionPct = Math.round((playerItems.filter(i => i.done).length / playerItems.length) * 100);
  const nextStep = playerItems.find(i => !i.done);

  if (loading || roleLoading) return (
    <div className="min-h-screen pt-20 flex items-center justify-center" style={{ background: '#F6F4EF' }}>
      <Loader2 size={36} className="animate-spin" style={{ color: 'var(--ink-soft)' }} />
    </div>
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; fg: string; border: string; label: string }> = {
      pending:  { bg: 'rgba(27,24,19,0.06)', fg: '#1B1813', border: 'rgba(27,24,19,0.16)', label: 'Pending' },
      accepted: { bg: 'rgba(94,140,90,0.12)', fg: '#5E8C5A', border: 'rgba(94,140,90,0.25)', label: 'Connected' },
      ignored:  { bg: 'rgba(27,24,19,0.04)', fg: 'rgba(27,24,19,0.4)', border: 'rgba(27,24,19,0.1)', label: 'Not now' },
    };
    const s = map[status] || map.pending;
    return (
      <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
        style={{ color: s.fg, background: s.bg, borderColor: s.border }}>
        {s.label}
      </span>
    );
  };

  const contactRow = (conn: any) => (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {conn.player_phone && (
        <a href={`tel:${conn.player_phone}`} className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-soft)' }}>
          <Phone size={13} /> {conn.player_phone}
        </a>
      )}
      {conn.player_email && (
        <a href={`mailto:${conn.player_email}`} className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-soft)' }}>
          <Mail size={13} /> {conn.player_email}
        </a>
      )}
    </div>
  );

  // ─── COACH DASHBOARD ───────────────────────────────────────────────
  if (userRole === 'coach') {
    return (
      <PageTransition>
        <div className="min-h-screen pt-20" style={{ background: '#F6F4EF' }}>
          <div className="relative overflow-hidden" style={{ background: 'rgba(27,24,19,0.05)', borderBottom: '1px solid rgba(27,24,19,0.06)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(27,24,19,0.08) 0%, transparent 70%)' }} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(27,24,19,0.3)' }}>Coach Portal</p>
                <h1 className="font-display text-5xl md:text-6xl text-ink mb-3">
                  Welcome back, {user?.displayName?.split(' ')[0] || 'Coach'}
                </h1>
                <p style={{ color: 'rgba(27,24,19,0.45)' }} className="text-lg">Players who want to train with you are below.</p>
              </motion.div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12" style={{ perspective: '1000px' }}>
                {[
                  { label: 'Total Requests', value: incomingConnections.length, icon: <Link2 size={20} />, suffix: '' },
                  { label: 'Pending', value: pendingIncoming.length, icon: <Clock size={20} />, suffix: '' },
                  { label: 'Connected Players', value: uniquePlayers, icon: <Users size={20} />, suffix: '' },
                  { label: 'Profile Views', value: profileViews ?? 0, icon: <Eye size={20} />, suffix: '' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, rotateY: 90, scale: 0.9 }}
                    animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                    transition={{ ...SPRING, delay: i * 0.1 }}
                    whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(27,24,19,0.2)' }}
                    className="glass-card rounded-2xl p-6 border border-[rgba(27,24,19,0.10)] cursor-default"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="mb-3" style={{ color: '#1B1813' }}>{stat.icon}</div>
                    <p className="text-2xl font-bold text-ink"><AnimatedCounter to={stat.value} /></p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: 'rgba(27,24,19,0.2)' }}>{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-12">

                {/* Incoming requests */}
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-display text-3xl text-ink">Connection requests</h2>
                    {pendingIncoming.length > 0 && <span className="tag-badge animate-pulse">{pendingIncoming.length} pending</span>}
                  </div>
                  {pendingIncoming.length > 0 ? (
                    <div className="space-y-4">
                      {pendingIncoming.map((conn, i) => (
                        <motion.div key={conn.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="rounded-2xl p-6" style={{ background: 'rgba(27,24,19,0.06)', border: '1px solid rgba(27,24,19,0.2)' }}>
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(27,24,19,0.12)', color: '#1B1813' }}>
                              <UserCircle size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-ink text-lg">{conn.player_name || 'Player'}</h4>
                              {conn.player_note && (
                                <p className="text-sm mt-1 italic" style={{ color: 'rgba(27,24,19,0.55)' }}>“{conn.player_note}”</p>
                              )}
                              {contactRow(conn)}
                              <Link to={`/players/${conn.player_id}`} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest mt-3 transition-colors hover:text-[var(--ink)]" style={{ color: 'rgba(27,24,19,0.45)' }}>
                                View their profile <ChevronRight size={13} />
                              </Link>
                            </div>
                            <div className="flex gap-3 shrink-0">
                              <button onClick={() => respondToConnection(conn, 'accepted')} disabled={updatingId === conn.id}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                style={{ background: 'rgba(94,140,90,0.15)', border: '1px solid rgba(94,140,90,0.3)', color: '#5E8C5A' }}>
                                {updatingId === conn.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Accept
                              </button>
                              <button onClick={() => respondToConnection(conn, 'ignored')} disabled={updatingId === conn.id}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                style={{ background: 'rgba(188,90,72,0.1)', border: '1px solid rgba(188,90,72,0.2)', color: '#BC5A48' }}>
                                <X size={14} /> Ignore
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass-card rounded-3xl border border-dashed border-[rgba(27,24,19,0.10)] p-16 text-center">
                      <Link2 size={40} className="mx-auto mb-4" style={{ color: 'rgba(27,24,19,0.1)' }} />
                      <p className="font-bold mb-2 text-ink">No pending requests</p>
                      <p className="text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>When a player asks to connect, they'll show up here with their contact info.</p>
                    </div>
                  )}
                </section>

                {/* Accepted connections */}
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-display text-3xl text-ink">Your players</h2>
                    <span className="tag-badge">{acceptedIncoming.length} connected</span>
                  </div>
                  {acceptedIncoming.length > 0 ? (
                    <div className="space-y-4">
                      {acceptedIncoming.map((conn, i) => (
                        <motion.div key={conn.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="glass-card rounded-2xl border border-[rgba(27,24,19,0.06)] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(27,24,19,0.06)', color: '#1B1813' }}>
                            <UserCircle size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-ink">{conn.player_name || 'Player'}</h4>
                            {contactRow(conn)}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Link to={`/players/${conn.player_id}`} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors hover:bg-[rgba(27,24,19,0.05)]"
                              style={{ border: '1px solid var(--line-strong)', color: 'var(--ink-soft)' }}>
                              <UserCircle size={14} /> Profile
                            </Link>
                            <button onClick={() => openConversation(user!.uid, conn.player_id, conn.coach_name || (user?.displayName || 'Coach'), conn.player_name || 'Player')}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors"
                              style={{ background: 'var(--black)', color: 'var(--paper)' }}>
                              <MessageSquare size={14} /> Message
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass-card rounded-3xl border border-dashed border-[rgba(27,24,19,0.10)] p-12 text-center">
                      <Users size={36} className="mx-auto mb-4" style={{ color: 'rgba(27,24,19,0.1)' }} />
                      <p className="text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>Players you accept will appear here, and messaging opens up.</p>
                    </div>
                  )}
                </section>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'var(--paper-warm)', boxShadow: '0 20px 60px rgba(27,24,19,0.3)' }}>
                  <div className="w-16 h-16 bg-[rgba(27,24,19,0.06)] rounded-2xl overflow-hidden flex items-center justify-center mb-6">
                    {coachProfilePhoto ? (
                      <img src={coachProfilePhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-2xl font-bold text-ink">{user?.displayName?.charAt(0) || 'C'}</span>
                    )}
                  </div>
                  <h3 className="font-display text-2xl text-ink mb-1">{user?.displayName || 'Coach'}</h3>
                  <p className="text-ink-soft text-sm mb-6">{user?.email}</p>
                  <div className="space-y-3">
                    <Link to="/coach-edit-profile" className="flex items-center gap-2 bg-[rgba(27,24,19,0.05)] hover:bg-[rgba(27,24,19,0.06)] transition-all rounded-xl px-4 py-3 text-sm font-bold text-ink border border-[rgba(27,24,19,0.10)]">
                      <Edit size={16} /> Edit Profile
                    </Link>
                    <Link to="/messages" className="flex items-center gap-2 bg-[rgba(27,24,19,0.05)] hover:bg-[rgba(27,24,19,0.06)] transition-all rounded-xl px-4 py-3 text-sm font-bold text-ink border border-[rgba(27,24,19,0.10)]">
                      <MessageSquare size={16} /> Messages
                    </Link>
                  </div>
                </div>

                <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                  <h3 className="font-display text-xl text-ink mb-2 flex items-center gap-3">
                    <Zap size={20} style={{ color: '#1B1813' }} /> Profile strength
                  </h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-display text-4xl" style={{ color: 'var(--ink)' }}>{profileStrength}%</span>
                    <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>complete</span>
                  </div>
                  <div className="w-full h-2 rounded-full mb-5" style={{ background: 'rgba(27,24,19,0.08)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: 'var(--black)' }}
                      initial={{ width: 0 }} animate={{ width: `${profileStrength}%` }} transition={{ ...SPRING, delay: 0.2 }} />
                  </div>
                  {topNudge ? (
                    <>
                      <div className="p-4 rounded-2xl mb-4" style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)' }}>
                        <p className="text-sm" style={{ color: 'var(--ink)' }}><strong>Next:</strong> add your {topNudge.label.toLowerCase()}.</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{topNudge.nudge}</p>
                      </div>
                      <Link to="/coach-edit-profile" className="btn-primary py-2 px-4 text-sm w-full justify-center">Complete profile</Link>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 p-4 rounded-2xl" style={{ background: 'rgba(94,140,90,0.08)', border: '1px solid rgba(94,140,90,0.2)' }}>
                      <CheckCircle2 size={18} style={{ color: 'var(--c-confirmed)' }} />
                      <p className="text-sm" style={{ color: 'var(--ink)' }}>Your profile is complete — nice work.</p>
                    </div>
                  )}
                </div>

                <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                  <h3 className="font-display text-xl text-ink mb-6 flex items-center gap-3">
                    <TrendingUp size={20} style={{ color: '#1B1813' }} /> Analytics
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Profile views', value: profileViews == null ? '—' : String(profileViews) },
                      { label: 'Requests', value: String(incomingConnections.length) },
                      { label: 'Accepted', value: String(acceptedIncoming.length) },
                      { label: 'Accept rate', value: `${acceptRate}%` },
                    ].map(s => (
                      <div key={s.label} className="rounded-2xl p-4" style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)' }}>
                        <p className="font-display text-3xl leading-none" style={{ color: 'var(--ink)' }}>{s.value}</p>
                        <p className="text-[11px] uppercase tracking-wide mt-1.5" style={{ color: 'var(--ink-soft)' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <MarketingToolkit
                  coachName={user?.displayName || 'me'}
                  profilePath={`/coaches/${MOCK_COACHES.find(c => c.user_id === user?.uid)?.id || user?.uid || ''}`}
                />

                <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                  <h3 className="font-display text-xl text-ink mb-6 flex items-center gap-3">
                    <Trophy size={20} style={{ color: '#C79A57' }} /> Tips
                  </h3>
                  <ul className="space-y-4 text-sm">
                    {['Respond to connection requests within 24 hours', 'Reach out by phone or email to plan training', 'Add an intro video to stand out'].map((tip, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: 'rgba(27,24,19,0.4)' }} />
                        <span style={{ color: 'rgba(27,24,19,0.45)' }}>{tip}</span>
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
      <div className="min-h-screen pt-20" style={{ background: '#F6F4EF' }}>
        <div className="relative overflow-hidden" style={{ background: 'rgba(27,24,19,0.05)', borderBottom: '1px solid rgba(27,24,19,0.06)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(27,24,19,0.05) 0%, transparent 70%)' }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(27,24,19,0.3)' }}>Player Dashboard</p>
              <h1 className="font-display text-5xl md:text-6xl text-ink mb-3">Welcome back, {user?.displayName?.split(' ')[0] || playerName.split(' ')[0] || 'Player'}</h1>
              <p style={{ color: 'rgba(27,24,19,0.45)' }} className="text-lg">Track your coaches and connection requests.</p>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12" style={{ perspective: '1000px' }}>
              {[
                { label: 'Requests Sent', value: sentConnections.length, icon: <Link2 size={20} /> },
                { label: 'Pending', value: pendingSent.length, icon: <Clock size={20} /> },
                { label: 'Connected', value: acceptedSent.length, icon: <CheckCircle2 size={20} /> },
                { label: 'Saved Coaches', value: favorites.length, icon: <Heart size={20} /> },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, rotateY: 90, scale: 0.9 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  transition={{ ...SPRING, delay: i * 0.1 }}
                  whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(27,24,19,0.2)' }}
                  className="glass-card rounded-2xl p-6 border border-[rgba(27,24,19,0.10)] cursor-default"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="mb-3" style={{ color: '#1B1813' }}>{stat.icon}</div>
                  <p className="text-2xl font-bold text-ink"><AnimatedCounter to={stat.value} /></p>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: 'rgba(27,24,19,0.2)' }}>{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">

              {/* Profile completion */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
                  <div className="relative w-36 h-36 shrink-0">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(27,24,19,0.06)" strokeWidth="9" />
                      <motion.circle
                        cx="60" cy="60" r="52" fill="none"
                        stroke="#1B1813" strokeWidth="9" strokeLinecap="round"
                        pathLength={1} strokeDasharray={1}
                        initial={{ strokeDashoffset: 1 }}
                        animate={{ strokeDashoffset: 1 - (completionPct / 100) }}
                        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-4xl leading-none" style={{ color: '#1B1813' }}>
                        <AnimatedCounter to={completionPct} suffix="%" />
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(27,24,19,0.35)' }}>Complete</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="font-display text-2xl text-ink mb-1">Your profile</h3>
                    <p className="text-sm mb-6" style={{ color: 'rgba(27,24,19,0.4)' }}>
                      {nextStep ? `Next: ${nextStep.label}` : 'Profile complete!'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {playerItems.map((item) => (
                        <div key={item.label} className="flex items-center gap-3 text-sm">
                          <CheckCircle2 size={16} style={{ color: item.done ? '#1B1813' : 'rgba(27,24,19,0.1)' }} fill={item.done ? '#1B1813' : 'none'} />
                          <span style={{ color: item.done ? 'var(--ink)' : 'rgba(27,24,19,0.4)' }} className={item.done ? 'font-medium' : ''}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <Link to="/profile" className="btn-secondary py-2 px-5 text-sm mt-6 inline-flex"><Edit size={14} /> Edit my profile</Link>
                  </div>
                </div>
              </motion.div>

              {/* Sent connection requests */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-display text-3xl text-ink">Your connections</h2>
                  <Link to="/coaches" className="btn-primary py-2 px-6 text-xs flex items-center gap-2"><Link2 size={14} /> Find a coach</Link>
                </div>
                {sentConnections.length > 0 ? (
                  <div className="space-y-4">
                    {sentConnections.map((conn, i) => {
                      const mock = getMockCoach(conn);
                      return (
                        <motion.div key={conn.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: i * 0.05 }}
                          className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5 border border-[rgba(27,24,19,0.06)]">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-[rgba(27,24,19,0.10)]" style={{ background: 'rgba(27,24,19,0.05)' }}>
                            {mock?.avatar_url
                              ? <img src={mock.avatar_url} alt="" className="w-full h-full object-cover" style={{ objectPosition: mock.avatar_position || 'center' }} referrerPolicy="no-referrer" />
                              : <div className="w-full h-full flex items-center justify-center font-bold" style={{ color: '#1B1813' }}>{(conn.coach_name || 'C').charAt(0)}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="font-bold text-ink text-lg">{conn.coach_name || 'Coach'}</h4>
                              {statusBadge(conn.status)}
                            </div>
                            {mock && <p className="text-sm capitalize" style={{ color: 'rgba(27,24,19,0.4)' }}>{mock.specialty}</p>}
                            {conn.status === 'pending' && <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>Waiting for {conn.coach_name?.split(' ')[0] || 'the coach'} to reach out.</p>}
                            {conn.status === 'ignored' && <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>This coach isn't taking new players right now.</p>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {mock && (
                              <Link to={`/coaches/${conn.coach_id}`} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors hover:bg-[rgba(27,24,19,0.05)]"
                                style={{ border: '1px solid var(--line-strong)', color: 'var(--ink-soft)' }}>
                                View
                              </Link>
                            )}
                            {conn.status === 'accepted' && (
                              <button onClick={() => openConversation(conn.coach_user_id, user!.uid, conn.coach_name || 'Coach', playerName)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors"
                                style={{ background: 'var(--black)', color: 'var(--paper)' }}>
                                <MessageSquare size={14} /> Message
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="glass-card rounded-3xl border border-dashed border-[rgba(27,24,19,0.10)] p-16 text-center">
                    <Link2 size={40} className="mx-auto mb-4" style={{ color: 'rgba(27,24,19,0.1)' }} />
                    <p className="font-bold mb-2 text-ink">No connections yet</p>
                    <p className="text-sm mb-8" style={{ color: 'rgba(27,24,19,0.4)' }}>Find a specialist and click Connect — they'll reach out to plan your training.</p>
                    <Link to="/coaches" className="btn-primary py-2 px-8 text-sm">Browse Coaches</Link>
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                <h3 className="font-display text-xl text-ink mb-6 flex items-center gap-3"><Star size={20} fill="#C79A57" style={{ color: '#C79A57' }} />Saved coaches</h3>
                {favorites.length > 0 ? (
                  <div className="space-y-5">
                    {favorites.map(fav => (
                      <div key={fav.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[rgba(27,24,19,0.10)]" style={{ background: 'rgba(27,24,19,0.05)' }}>
                            {fav.coach.avatar_url ? <img src={fav.coach.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: '#1B1813' }}>{fav.coach.name?.charAt(0)}</div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-ink">{fav.coach.name}</p>
                            <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: 'rgba(27,24,19,0.3)' }}>{fav.coach.specialty}</p>
                          </div>
                        </div>
                        <Link to={`/coaches/${fav.coach.id}`} className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all" style={{ color: '#1B1813' }}>View →</Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart size={32} className="mx-auto mb-4" style={{ color: 'rgba(27,24,19,0.1)' }} />
                    <p className="text-sm mb-4" style={{ color: 'rgba(27,24,19,0.4)' }}>No saved coaches yet.</p>
                    <Link to="/coaches" className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1B1813' }}>Browse coaches →</Link>
                  </div>
                )}
              </div>

              <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-6">
                <Link to="/messages" className="flex items-center gap-3 w-full">
                  <MessageSquare size={20} style={{ color: '#1B1813' }} />
                  <div>
                    <p className="font-bold text-ink text-sm">Messages</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(27,24,19,0.35)' }}>Opens once a coach accepts you</p>
                  </div>
                </Link>
              </div>

              <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                <h3 className="font-display text-xl text-ink mb-6 flex items-center gap-3"><Target size={20} style={{ color: '#1B1813' }} />By specialty</h3>
                <div className="space-y-2">
                  {['hitting', 'pitching', 'fielding', 'strength'].map(spec => (
                    <Link key={spec} to={`/coaches?specialty=${spec}`} className="flex items-center justify-between p-4 rounded-2xl hover:bg-[rgba(27,24,19,0.04)] transition-all group border border-transparent hover:border-[rgba(27,24,19,0.06)]">
                      <span className="text-sm font-bold capitalize" style={{ color: 'rgba(27,24,19,0.5)' }}>{spec}</span>
                      <ChevronRight size={16} style={{ color: 'rgba(27,24,19,0.2)' }} />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'var(--paper-warm)', boxShadow: '0 20px 60px rgba(27,24,19,0.25)' }}>
                <TrendingUp size={32} className="mb-6 text-ink-faint" />
                <h3 className="font-display text-2xl text-ink mb-3">Ready to level up?</h3>
                <p className="text-ink-soft text-sm mb-8 leading-relaxed">Find an elite specialist and connect — they take it from there.</p>
                <Link to="/coaches" className="bg-white font-bold py-4 px-6 rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-all uppercase tracking-widest" style={{ color: '#1B1813' }}>
                  Browse Marketplace <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
