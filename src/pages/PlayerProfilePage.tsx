import { useState, useEffect, type ReactNode } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Loader2, User, CheckCircle2, Save, Target, Link2, ChevronLeft, MessageSquare } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { Link, useParams } from 'react-router-dom';
import type { SkillLevel } from '../types';

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'developing', label: 'Developing' },
  { value: 'competitive', label: 'Competitive' },
];

const POSITIONS = ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop', 'Outfield', 'Utility'];

interface PlayerForm {
  name: string;
  age: string;
  grade: string;
  primary_position: string;
  skill_level: SkillLevel | '';
  goals: string;
  bio: string;
}

const EMPTY: PlayerForm = { name: '', age: '', grade: '', primary_position: '', skill_level: '', goals: '', bio: '' };

export default function PlayerProfilePage() {
  const [user] = useAuthState(auth);
  const { id } = useParams();

  const profileUid = id || user?.uid || '';
  const isOwn = !!user && (!id || id === user.uid);

  const [form, setForm] = useState<PlayerForm>(EMPTY);
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectedCoaches, setConnectedCoaches] = useState<any[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (!profileUid) return;
    setLoading(true);
    (async () => {
      try {
        const [uSnap, pSnap] = await Promise.all([
          getDoc(doc(db, 'users', profileUid)),
          getDoc(doc(db, 'players', profileUid)),
        ]);
        const uData = uSnap.exists() ? uSnap.data() : {};
        const pData = pSnap.exists() ? pSnap.data() : {};
        setEmail(uData.email || '');
        setForm({
          name: pData.name || uData.name || (isOwn ? (user?.displayName || '') : 'Player'),
          age: pData.age != null ? String(pData.age) : '',
          grade: pData.grade || '',
          primary_position: pData.primary_position || '',
          skill_level: (pData.skill_level as SkillLevel) || '',
          goals: pData.goals || '',
          bio: pData.bio || '',
        });
      } catch { /* non-critical */ }
      finally { setLoading(false); }
    })();
  }, [profileUid, isOwn, user]);

  // Own-only: connected coaches (accepted) + counts
  useEffect(() => {
    if (!isOwn || !user) return;
    (async () => {
      try {
        const [connSnap, favSnap] = await Promise.all([
          getDocs(query(collection(db, 'connections'), where('player_id', '==', user.uid))),
          getDocs(query(collection(db, 'favorites'), where('user_id', '==', user.uid))),
        ]);
        const conns = connSnap.docs.map(d => d.data());
        setConnectedCoaches(conns.filter(c => c.status === 'accepted'));
        setSentCount(conns.length);
        setSavedCount(favSnap.size);
      } catch { /* non-critical */ }
    })();
  }, [isOwn, user]);

  const set = (k: keyof PlayerForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'players', user.uid), {
        user_id: user.uid,
        name: form.name.trim(),
        age: form.age ? Number(form.age) : null,
        grade: form.grade.trim(),
        primary_position: form.primary_position,
        skill_level: form.skill_level || null,
        goals: form.goals.trim(),
        bio: form.bio.trim(),
        updated_at: serverTimestamp(),
      }, { merge: true });
      try { await updateDoc(doc(db, 'users', user.uid), { name: form.name.trim() }); } catch { /* may not exist */ }
      try { await updateProfile(user, { displayName: form.name.trim() }); } catch { /* non-critical */ }
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F6F4EF' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: '#1B1813' }} />
      </div>
    );
  }

  const skillLabel = SKILL_LEVELS.find(s => s.value === form.skill_level)?.label || '—';
  const detailRows = [
    { label: 'Age', value: form.age || '—' },
    { label: 'Grade', value: form.grade || '—' },
    { label: 'Position', value: form.primary_position || '—' },
    { label: 'Skill level', value: skillLabel },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen pt-20" style={{ background: '#F6F4EF' }}>
        {/* Header */}
        <div className="relative overflow-hidden" style={{ background: 'rgba(27,24,19,0.05)', borderBottom: '1px solid rgba(27,24,19,0.06)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(27,24,19,0.07) 0%, transparent 70%)' }} />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 relative z-10">
            {!isOwn && (
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-6 transition-colors hover:text-[var(--ink)]" style={{ color: 'rgba(27,24,19,0.4)' }}>
                <ChevronLeft size={14} /> Back to dashboard
              </Link>
            )}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'rgba(27,24,19,0.3)' }}>{isOwn ? 'My Profile' : 'Player Profile'}</p>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center shrink-0" style={{ background: 'var(--paper-warm)' }}>
                  <span className="text-3xl font-bold text-ink">{(form.name || 'P').charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h1 className="font-display text-4xl md:text-5xl text-ink">{form.name || 'Player'}</h1>
                  <p style={{ color: 'rgba(27,24,19,0.4)' }} className="mt-1 capitalize">
                    {[form.primary_position, skillLabel !== '—' ? skillLabel : ''].filter(Boolean).join(' · ') || 'Baseball player'}
                  </p>
                </div>
              </div>
            </motion.div>

            {isOwn && (
              <div className="grid grid-cols-3 gap-4 mt-12">
                {[
                  { label: 'Requests Sent', value: sentCount, icon: <Link2 size={20} /> },
                  { label: 'Connected', value: connectedCoaches.length, icon: <CheckCircle2 size={20} /> },
                  { label: 'Saved Coaches', value: savedCount, icon: <Target size={20} /> },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className="glass-card rounded-2xl p-5 border border-[rgba(27,24,19,0.10)]">
                    <div className="mb-2" style={{ color: '#1B1813' }}>{s.icon}</div>
                    <p className="text-2xl font-bold text-ink">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(27,24,19,0.2)' }}>{s.label}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Details card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8 md:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl text-ink flex items-center gap-3">
                  <User size={20} style={{ color: '#1B1813' }} /> Player details
                </h2>
                {isOwn && !editing && (
                  <button onClick={() => setEditing(true)} className="btn-secondary py-2 px-4 text-sm">Edit</button>
                )}
              </div>

              {isOwn && editing ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full name">
                      <input value={form.name} onChange={e => set('name', e.target.value)} className="cg-input" placeholder="Your name" />
                    </Field>
                    <Field label="Age">
                      <input value={form.age} onChange={e => set('age', e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} className="cg-input" placeholder="e.g. 15" inputMode="numeric" />
                    </Field>
                    <Field label="Grade">
                      <input value={form.grade} onChange={e => set('grade', e.target.value)} className="cg-input" placeholder="e.g. Sophomore, 8th grade" />
                    </Field>
                    <Field label="Primary position">
                      <select value={form.primary_position} onChange={e => set('primary_position', e.target.value)} className="cg-input">
                        <option value="">Select…</option>
                        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </Field>
                    <Field label="Skill level">
                      <select value={form.skill_level} onChange={e => set('skill_level', e.target.value)} className="cg-input">
                        <option value="">Select…</option>
                        {SKILL_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Goals">
                    <textarea value={form.goals} onChange={e => set('goals', e.target.value)} rows={2} maxLength={400} className="cg-input resize-none"
                      placeholder="What do you want to work on? e.g. add bat speed, clean up my arm action." />
                  </Field>
                  <Field label="Short bio">
                    <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} maxLength={600} className="cg-input resize-none"
                      placeholder="Tell coaches a bit about yourself and where you play." />
                  </Field>
                  <div className="flex gap-3">
                    <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary py-3 px-6 flex items-center gap-2 disabled:opacity-50">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Saving…' : 'Save profile'}
                    </button>
                    <button onClick={() => setEditing(false)} className="btn-secondary py-3 px-6">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {detailRows.map(r => (
                      <div key={r.label} className="rounded-2xl p-4" style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(27,24,19,0.3)' }}>{r.label}</p>
                        <p className="text-ink font-bold capitalize">{r.value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(27,24,19,0.3)' }}>Goals</p>
                    <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{form.goals || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(27,24,19,0.3)' }}>Bio</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{form.bio || '—'}</p>
                  </div>
                  {saved && (
                    <p className="text-xs flex items-center gap-1" style={{ color: '#5E8C5A' }}><CheckCircle2 size={12} /> Saved!</p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Account (own only) */}
            {isOwn && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                <h2 className="font-display text-2xl text-ink mb-6 flex items-center gap-3">
                  <CheckCircle2 size={20} style={{ color: '#1B1813' }} /> Account
                </h2>
                <div className="space-y-4">
                  {[
                    { label: 'Email', value: email || user?.email || '—' },
                    { label: 'Verified', value: user?.emailVerified ? 'Yes' : 'No' },
                    { label: 'Member since', value: user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>{item.label}</span>
                      <span className="text-sm font-bold text-ink">{item.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Connected coaches (own only) */}
            {isOwn && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
                <h2 className="font-display text-2xl text-ink mb-6 flex items-center gap-3">
                  <Link2 size={20} style={{ color: '#1B1813' }} /> Connected coaches
                </h2>
                {connectedCoaches.length > 0 ? (
                  <div className="space-y-3">
                    {connectedCoaches.map((c, i) => (
                      <Link key={i} to={`/coaches/${c.coach_id}`} className="flex items-center justify-between p-3 rounded-2xl transition-colors hover:bg-[rgba(27,24,19,0.04)]">
                        <span className="text-sm font-bold text-ink">{c.coach_name || 'Coach'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--c-confirmed)' }}>Connected</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm mb-4" style={{ color: 'rgba(27,24,19,0.4)' }}>You haven't connected with a coach yet.</p>
                    <Link to="/coaches" className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1B1813' }}>Browse coaches →</Link>
                  </div>
                )}
              </motion.div>
            )}

            {/* Quick actions (own only) */}
            {isOwn && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8 md:col-span-2">
                <h2 className="font-display text-2xl text-ink mb-6">Quick actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Browse Coaches', to: '/coaches', icon: <Target size={16} /> },
                    { label: 'My Dashboard', to: '/dashboard', icon: <CheckCircle2 size={16} /> },
                    { label: 'Messages', to: '/messages', icon: <MessageSquare size={16} /> },
                  ].map(link => (
                    <Link key={link.label} to={link.to}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all hover:bg-[rgba(27,24,19,0.04)] border border-[rgba(27,24,19,0.08)]"
                      style={{ background: 'var(--paper-warm)', color: 'var(--ink)' }}>
                      {link.icon} {link.label}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: 'rgba(27,24,19,0.3)' }}>{label}</span>
      {children}
    </label>
  );
}
