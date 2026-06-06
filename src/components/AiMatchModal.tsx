import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, ArrowRight, Loader2, Star } from 'lucide-react';
import type { CoachProfile } from '../types';
import { matchCoaches, type CoachMatch } from '../utils/ai';

const EXAMPLES = [
  "13U infielder, want faster hands and better footwork",
  "HS pitcher trying to add velocity safely",
  "New to hitting, need swing fundamentals on a budget",
];

export default function AiMatchModal({
  coaches, onClose, navigate,
}: { coaches: CoachProfile[]; onClose: () => void; navigate: (to: string) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<{ coach: CoachProfile; reason: string }[] | null>(null);

  const run = async () => {
    if (!query.trim() || loading) return;
    setLoading(true); setError(''); setResults(null);
    try {
      const matches: CoachMatch[] = await matchCoaches(query.trim(), coaches);
      const mapped = matches
        .map(m => ({ coach: coaches.find(c => c.id === m.id)!, reason: m.reason }))
        .filter(r => r.coach);
      if (mapped.length === 0) setError("Couldn't find a confident match — try adding your position, level, or goal.");
      setResults(mapped);
    } catch {
      setError("Matching is unavailable right now. Browse coaches by specialty instead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(27,24,19,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Find your coach with AI"
        className="w-full max-w-lg rounded-3xl overflow-hidden max-h-[88vh] flex flex-col"
        style={{ background: 'var(--card-cream)', border: '1px solid var(--line)' }}
      >
        <div className="flex items-start justify-between p-6 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
          <div>
            <span className="eyebrow mb-3 inline-flex"><Sparkles size={12} /> AI match</span>
            <h3 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>Find your coach</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Describe your goals, position, and level.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full transition-colors hover:bg-[rgba(27,24,19,0.06)]" style={{ color: 'var(--ink-soft)' }}><X size={20} /></button>
        </div>

        <div className="overflow-auto p-6">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); }}
            rows={3}
            placeholder="e.g. 15U pitcher, want to add velocity while protecting my arm…"
            className="cg-input text-sm resize-none mb-3"
          />
          <div className="flex flex-wrap gap-2 mb-5">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setQuery(ex)}
                className="text-xs px-3 py-1.5 rounded-full transition-colors hover:border-[var(--ink)]"
                style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>
                {ex}
              </button>
            ))}
          </div>
          <button onClick={run} disabled={!query.trim() || loading} className="btn-primary w-full justify-center py-3 disabled:opacity-40">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Finding your match…</> : <><Sparkles size={16} /> Find my match</>}
          </button>

          {error && <p className="text-sm mt-4" style={{ color: 'var(--c-declined)' }}>{error}</p>}

          {results && results.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--ink-faint)' }}>Top matches</p>
              {results.map(({ coach, reason }, i) => (
                <motion.div
                  key={coach.id}
                  className="cg-card p-4 flex items-center gap-4"
                  initial={{ opacity: 0, y: 26, rotate: i % 2 === 0 ? -3 : 3 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22, delay: (results.length - 1 - i) * 0.12 }}
                >
                  <span className="font-display text-2xl shrink-0 w-6 text-center" style={{ color: 'var(--ink-faint)' }}>{i + 1}</span>
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--paper-warm)' }}>
                    {coach.avatar_url
                      ? <img src={coach.avatar_url} alt="" className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
                      : <span className="w-full h-full flex items-center justify-center font-display text-xl" style={{ color: 'var(--ink-faint)' }}>{coach.name?.charAt(0)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg leading-tight" style={{ color: 'var(--ink)' }}>{coach.name}</p>
                      <span className="inline-flex items-center gap-0.5 text-xs" style={{ color: 'var(--ink-soft)' }}>
                        <Star size={11} fill="var(--c-reschedule)" style={{ color: 'var(--c-reschedule)' }} />{coach.rating?.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--ink-faint)' }}>{coach.specialty} · ${coach.price_per_session}/session</p>
                    {reason && <p className="text-xs mt-1.5" style={{ color: 'var(--ink-soft)' }}>{reason}</p>}
                  </div>
                  <button onClick={() => { onClose(); navigate(`/coaches/${coach.id}`); }}
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--black)] hover:text-[var(--paper)]"
                    style={{ border: '1px solid var(--line-strong)', color: 'var(--ink)' }} aria-label={`View ${coach.name}`}>
                    <ArrowRight size={16} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
