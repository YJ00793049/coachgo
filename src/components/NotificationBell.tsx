import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Bell, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

function timeAgo(ts: any): string {
  const d = ts?.toDate?.();
  if (!d) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(false);
  const prevUnread = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(25),
    );
    const unsub = onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Ring the bell when unread count rises (skip the very first load).
  useEffect(() => {
    const u = items.filter(i => !i.read).length;
    if (!reduce && prevUnread.current !== 0 && u > prevUnread.current) {
      setRing(true);
      const id = setTimeout(() => setRing(false), 900);
      prevUnread.current = u;
      return () => clearTimeout(id);
    }
    prevUnread.current = u;
  }, [items]);

  if (!user) return null;
  const unread = items.filter(i => !i.read).length;

  const openItem = async (n: any) => {
    try { if (!n.read) await updateDoc(doc(db, 'notifications', n.id), { read: true }); } catch { /* ignore */ }
    setOpen(false);
    if (n.link) navigate(n.link);
  };
  const markAll = async () => {
    await Promise.all(items.filter(i => !i.read).map(i =>
      updateDoc(doc(db, 'notifications', i.id), { read: true }).catch(() => {})));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative p-2 rounded-full transition-colors hover:bg-[rgba(27,24,19,0.05)]"
        style={{ color: 'var(--ink)' }}
      >
        <motion.span
          className="block"
          style={{ transformOrigin: 'top center' }}
          animate={ring ? { rotate: [0, -14, 11, -7, 4, 0] } : { rotate: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          <Bell size={19} />
        </motion.span>
        {unread > 0 && (
          <motion.span
            key={unread}
            className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'var(--c-declined)', color: '#fff' }}
            initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { scale: [0.5, 1.25, 1], opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 mt-2 w-[340px] max-w-[92vw] rounded-2xl overflow-hidden z-50"
            style={{ background: 'var(--card-cream)', border: '1px solid var(--line-strong)', boxShadow: '0 18px 50px rgba(27,24,19,0.16)' }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <p className="font-display text-lg" style={{ color: 'var(--ink)' }}>Notifications</p>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs inline-flex items-center gap-1 transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-soft)' }}>
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>

            <motion.div className="max-h-[60vh] overflow-y-auto"
              variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
              initial="hidden" animate="visible">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell size={22} className="mx-auto mb-3" style={{ color: 'var(--ink-faint)' }} />
                  <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>You're all caught up.</p>
                </div>
              ) : items.map(n => (
                <motion.button
                  key={n.id}
                  variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                  onClick={() => openItem(n)}
                  className="w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-[rgba(27,24,19,0.04)]"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: n.read ? 'transparent' : 'var(--c-declined)' }} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{n.title}</span>
                      <span className="text-[11px] shrink-0" style={{ color: 'var(--ink-faint)' }}>{timeAgo(n.created_at)}</span>
                    </span>
                    {n.body && <span className="block text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{n.body}</span>}
                  </span>
                </motion.button>
              ))}
            </motion.div>

            <div className="px-4 py-2.5 text-[11px]" style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-faint)' }}>
              Email alerts are on. Push & SMS coming soon.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
