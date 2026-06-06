import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { X, AlertTriangle } from 'lucide-react';

// Reads the admin-controlled config/flags doc and shows a site-wide banner
// when `maintenance` is on. Dismissible per session.
export default function MaintenanceBanner() {
  const [show, setShow] = useState(false);
  const [text, setText] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'flags'), (snap) => {
      const d = snap.data();
      setShow(!!d?.maintenance);
      setText(d?.announcement || 'Scheduled maintenance in progress — some features may be unavailable.');
    }, () => {});
    return () => unsub();
  }, []);

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[55]"
      style={{ background: 'var(--black)', color: 'var(--paper)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3" style={{ paddingRight: 84 }}>
        <AlertTriangle size={15} className="shrink-0" />
        <p className="text-xs flex-1">{text}</p>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="p-1 rounded-full transition-colors hover:bg-[rgba(246,244,239,0.12)]">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
