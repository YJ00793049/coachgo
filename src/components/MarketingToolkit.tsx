import { useState } from 'react';
import { Copy, Check, Share2, Code2, Link2 } from 'lucide-react';

/**
 * Lightweight coach marketing toolkit: copyable profile link, an embeddable
 * "Book me" button snippet, and one-tap social share. Pure client-side.
 */
export default function MarketingToolkit({
  profilePath,
  coachName,
}: { profilePath: string; coachName: string }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://coachgonline.com';
  const url = `${origin}${profilePath}`;
  const shareText = `Book a baseball session with ${coachName} on CoachGo`;

  const embed =
`<a href="${url}" target="_blank" rel="noopener"
   style="display:inline-flex;align-items:center;gap:8px;background:#16130E;color:#F6F4EF;
   font-family:system-ui,sans-serif;font-size:15px;padding:12px 22px;border-radius:999px;
   text-decoration:none;">⚾ Book me on CoachGo</a>`;

  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(c => (c === key ? null : c)), 1800);
    }).catch(() => {});
  };

  const shareTargets = [
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}` },
  ];

  return (
    <div className="glass-card rounded-3xl border border-[rgba(27,24,19,0.10)] p-8">
      <h3 className="font-display text-xl text-ink mb-6 flex items-center gap-3">
        <Share2 size={20} style={{ color: '#1B1813' }} /> PROMOTE
      </h3>

      {/* Profile link */}
      <p className="text-xs uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--ink-faint)' }}>Your profile link</p>
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl overflow-hidden" style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)' }}>
          <Link2 size={14} className="shrink-0" style={{ color: 'var(--ink-faint)' }} />
          <span className="text-sm truncate" style={{ color: 'var(--ink)' }}>{url.replace(/^https?:\/\//, '')}</span>
        </div>
        <button onClick={() => copy('link', url)} className="btn-secondary py-2.5 px-4 text-sm shrink-0">
          {copied === 'link' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>

      {/* Embed */}
      <p className="text-xs uppercase tracking-[0.14em] mb-2 flex items-center gap-1.5" style={{ color: 'var(--ink-faint)' }}>
        <Code2 size={13} /> "Book me" embed
      </p>
      <textarea
        readOnly
        value={embed}
        rows={3}
        onFocus={e => e.currentTarget.select()}
        className="w-full rounded-xl p-3 text-[11px] font-mono resize-none mb-2"
        style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
      />
      <button onClick={() => copy('embed', embed)} className="btn-secondary py-2 px-4 text-sm mb-6">
        {copied === 'embed' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy embed code</>}
      </button>

      {/* Share */}
      <p className="text-xs uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--ink-faint)' }}>Share</p>
      <div className="flex flex-wrap gap-2">
        {shareTargets.map(t => (
          <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 rounded-full text-sm transition-colors hover:bg-[rgba(27,24,19,0.05)]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--ink)' }}>
            {t.label}
          </a>
        ))}
      </div>
    </div>
  );
}
