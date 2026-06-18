import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  collection, query, where, getDocs, doc, getDoc,
} from 'firebase/firestore';
import { Link2, X, Check, Loader2, Phone, Mail, MessageSquare } from 'lucide-react';
import { auth, db } from '../firebase';
import { sendConnectionRequest } from '../utils/connections';

interface ConnectCoach {
  id: string;          // numeric MOCK id
  user_id: string;     // coach Firebase uid
  name?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Staggered field reveal — gentle rise, gated for reduced motion.
const fieldVariants = (reduce: boolean | null) => ({
  hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
});

export default function ConnectModal({
  coach, onClose,
}: { coach: ConnectCoach; onClose: () => void }) {
  const [user, authLoading] = useAuthState(auth);
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const coachName = coach.name || 'this coach';

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // 'idle' until we know whether a request already exists
  const [existing, setExisting] = useState<'loading' | 'none' | 'pending' | 'accepted' | 'ignored'>('loading');
  const [playerName, setPlayerName] = useState('');

  // Prefill from the player's account + detect a prior request to this coach.
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setExisting('none'); return; }
    setEmail(user.email || '');
    let cancelled = false;
    (async () => {
      try {
        const uSnap = await getDoc(doc(db, 'users', user.uid));
        const nm = uSnap.exists() ? ((uSnap.data() as any).name || '') : '';
        if (!cancelled) setPlayerName(nm || user.displayName || (user.email ? user.email.split('@')[0] : 'Player'));
        const snap = await getDocs(query(
          collection(db, 'connections'),
          where('player_id', '==', user.uid),
          where('coach_user_id', '==', coach.user_id),
        ));
        if (cancelled) return;
        if (snap.empty) { setExisting('none'); return; }
        // Prefer the most relevant status: accepted > pending > ignored.
        const statuses = snap.docs.map(d => (d.data() as any).status);
        if (statuses.includes('accepted')) setExisting('accepted');
        else if (statuses.includes('pending')) setExisting('pending');
        else setExisting('ignored');
      } catch {
        if (!cancelled) setExisting('none');
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, coach.user_id]);

  const submit = async () => {
    if (submitting) return;
    const p = phone.trim();
    const e = email.trim();
    if (!p && !e) { setError('Add a phone number or email so your coach can reach you.'); return; }
    if (e && !EMAIL_RE.test(e)) { setError('That email doesn’t look right — double-check it.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await sendConnectionRequest({
        player_id: user!.uid,
        player_name: playerName,
        player_account_email: user!.email,
        coach_id: coach.id,
        coach_user_id: coach.user_id,
        coach_name: coachName,
        player_phone: p,
        player_email: e,
        player_note: note,
      });
      setDone(true);
    } catch (err) {
      console.error(err);
      setError('Something went wrong sending your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const Shell = ({ children }: { children: ReactNode }) => (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(27,24,19,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
        transition={prefersReduced ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 26 }}
        onClick={ev => ev.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={`Connect with ${coachName}`}
        className="w-full max-w-lg rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: 'var(--card-cream)', border: '1px solid var(--line)' }}
      >
        {children}
      </motion.div>
    </motion.div>
  );

  const Header = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="flex items-start justify-between p-6 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="pr-4">
        <span className="eyebrow mb-3 inline-flex"><Link2 size={12} /> Connect</span>
        <h3 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>{title}</h3>
        {sub && <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{sub}</p>}
      </div>
      <button onClick={onClose} className="p-2 rounded-full transition-colors hover:bg-[rgba(27,24,19,0.06)]" style={{ color: 'var(--ink-soft)' }} aria-label="Close">
        <X size={20} />
      </button>
    </div>
  );

  // ── Not signed in ──
  if (!authLoading && !user) {
    return (
      <Shell>
        <Header title="Sign in to connect" sub={`Create a free account to reach ${coachName}.`} />
        <div className="p-6">
          <p className="text-sm mb-5" style={{ color: 'var(--ink-soft)' }}>
            Connecting lets you share your contact info so {coachName} can reach out directly to plan your training.
          </p>
          <button onClick={() => { onClose(); navigate('/auth'); }} className="btn-primary w-full justify-center py-3">
            Sign in or sign up
          </button>
        </div>
      </Shell>
    );
  }

  // ── Already sent / connected ──
  if (existing === 'pending' || existing === 'accepted') {
    const accepted = existing === 'accepted';
    return (
      <Shell>
        <Header title={accepted ? `You're connected with ${coachName}` : 'Request already sent'} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--sage)', color: 'var(--ink)' }}><Check size={18} /></span>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
              {accepted
                ? `${coachName} accepted your request. You can message them anytime from your dashboard.`
                : `Your request to ${coachName} is pending. They'll reach out soon — keep an eye on your inbox.`}
            </p>
          </div>
          <button onClick={() => { onClose(); navigate('/dashboard'); }} className="btn-primary w-full justify-center py-3">
            Go to dashboard
          </button>
        </div>
      </Shell>
    );
  }

  // ── Success ──
  if (done) {
    return (
      <Shell>
        <div className="p-8 text-center">
          <motion.span
            initial={prefersReduced ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={prefersReduced ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 18 }}
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5"
            style={{ background: 'var(--sage)', color: 'var(--ink)' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
              <motion.path
                d="M5 12.5 L10 17.5 L19 7"
                stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                initial={prefersReduced ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={prefersReduced ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
              />
            </svg>
          </motion.span>
          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: prefersReduced ? 0 : 0.4 }}
          >
            <h3 className="font-display text-2xl mb-2" style={{ color: 'var(--ink)' }}>Request sent</h3>
            <p className="text-sm mb-6 mx-auto max-w-xs" style={{ color: 'var(--ink-soft)' }}>
              {coachName} just got your details. They'll be in touch soon to plan your training.
            </p>
          </motion.div>
          <div className="flex flex-col gap-2">
            <button onClick={() => { onClose(); navigate('/dashboard'); }} className="btn-primary w-full justify-center py-3">
              View my requests
            </button>
            <button onClick={onClose} className="btn-secondary w-full justify-center py-3">Keep browsing</button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Form ──
  return (
    <Shell>
      <Header title={`Connect with ${coachName}`} sub={`How should ${coachName} reach you?`} />
      <motion.div
        className="overflow-auto p-6"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: prefersReduced ? 0 : 0.05, delayChildren: prefersReduced ? 0 : 0.05 } } }}
      >
        <motion.p variants={fieldVariants(prefersReduced)} className="text-sm mb-5" style={{ color: 'var(--ink-soft)' }}>
          Share a phone number, an email, or both. {coachName} will reach out directly to talk through training plans.
        </motion.p>

        <motion.label variants={fieldVariants(prefersReduced)} className="block mb-4">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--ink-faint)' }}>
            <Phone size={12} /> Phone <span className="lowercase tracking-normal font-normal" style={{ color: 'var(--ink-faint)' }}>(optional)</span>
          </span>
          <input type="tel" value={phone} onChange={ev => setPhone(ev.target.value)} placeholder="(555) 123-4567" className="cg-input" autoComplete="tel" />
        </motion.label>

        <motion.label variants={fieldVariants(prefersReduced)} className="block mb-4">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--ink-faint)' }}>
            <Mail size={12} /> Email <span className="lowercase tracking-normal font-normal" style={{ color: 'var(--ink-faint)' }}>(optional)</span>
          </span>
          <input type="email" value={email} onChange={ev => setEmail(ev.target.value)} placeholder="you@email.com" className="cg-input" autoComplete="email" />
        </motion.label>

        <motion.label variants={fieldVariants(prefersReduced)} className="block mb-2">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--ink-faint)' }}>
            <MessageSquare size={12} /> Add a note <span className="lowercase tracking-normal font-normal" style={{ color: 'var(--ink-faint)' }}>(optional)</span>
          </span>
          <textarea value={note} onChange={ev => setNote(ev.target.value)} rows={3} maxLength={500}
            placeholder={`Tell ${coachName} a bit about yourself — position, level, and what you want to work on.`}
            className="cg-input resize-none" />
        </motion.label>

        {error && <p className="text-sm mt-3" style={{ color: 'var(--c-declined)' }}>{error}</p>}

        <motion.button
          variants={fieldVariants(prefersReduced)}
          onClick={submit} disabled={submitting || existing === 'loading'}
          whileTap={{ scale: 0.97 }}
          className="btn-primary w-full justify-center py-3 mt-5 disabled:opacity-40">
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Link2 size={16} /> Send connection request</>}
        </motion.button>
      </motion.div>
    </Shell>
  );
}
