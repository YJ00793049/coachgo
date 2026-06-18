import React, { ReactNode, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from '../tokens';

/* ───────────────────────────────────────────────────────────────────
   Editorial-Calm shared visuals: eyebrow pill, mesh cards, soft
   gradient spheres, and the hand-drawn baseball field / ball / bat.
   All motion respects prefers-reduced-motion.
   ─────────────────────────────────────────────────────────────────── */

/* ── Eyebrow pill tag ──────────────────────────────────────────── */
export function Eyebrow({
  children,
  className = '',
}: { children: ReactNode; className?: string }) {
  return <span className={`eyebrow ${className}`}>{children}</span>;
}

/* ── Soft floating gradient spheres ────────────────────────────── */
type Sphere = {
  size: number;
  color: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  delay?: number;
  drift?: number;
};

export function FloatingSpheres({ spheres }: { spheres: Sphere[] }) {
  const reduce = useReducedMotion();
  return (
    <>
      {spheres.map((s, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            width: s.size,
            height: s.size,
            top: s.top,
            left: s.left,
            right: s.right,
            bottom: s.bottom,
            background: `radial-gradient(circle at 35% 30%, ${s.color} 0%, transparent 70%)`,
            filter: 'blur(8px)',
            willChange: 'transform',
          }}
          animate={
            reduce
              ? undefined
              : { y: [0, -(s.drift ?? 18), 0], x: [0, (s.drift ?? 18) / 2, 0] }
          }
          transition={{
            duration: 9 + i * 1.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: s.delay ?? 0,
          }}
        />
      ))}
    </>
  );
}

/* ── Grainy gradient-mesh card surface ─────────────────────────── */
export function MeshCard({
  children,
  className = '',
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    el.style.setProperty('--spec', '1');
  };
  const onLeave = () => { ref.current?.style.setProperty('--spec', '0'); };
  return (
    <div ref={ref} className={`mesh-soft ${className}`} style={style} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle 200px at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.55), transparent 60%)',
          opacity: 'var(--spec, 0)' as any,
          transition: 'opacity 0.4s ease',
          mixBlendMode: 'soft-light',
          borderRadius: 'inherit',
        }}
      />
      {children}
    </div>
  );
}

/* ── Draw-in stroke helper ─────────────────────────────────────── */
function Draw({
  d,
  delay = 0,
  duration = 1.4,
  stroke = 'rgba(27,24,19,0.55)',
  width = 1.5,
  reduce,
  dash,
  fill = 'none',
}: {
  d: string;
  delay?: number;
  duration?: number;
  stroke?: string;
  width?: number;
  reduce: boolean | null;
  dash?: string;
  fill?: string;
}) {
  return (
    <motion.path
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      initial={reduce ? false : { pathLength: 0, opacity: 0 }}
      animate={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: 1, opacity: 1 }}
      transition={reduce ? { duration: 0 } : { duration, delay, ease: EASE_OUT }}
    />
  );
}

/* ── Baseball field (top-down diamond) ─────────────────────────── */
export function BaseballField({
  className = '',
  variant = 'hero',
}: {
  className?: string;
  variant?: 'hero' | 'feature';
}) {
  const reduce = useReducedMotion();
  const ink = 'rgba(27,24,19,0.55)';
  const inkSoft = 'rgba(27,24,19,0.32)';

  // Diamond points
  const home = [200, 305];
  const first = [275, 230];
  const second = [200, 155];
  const third = [125, 230];
  const mound = [200, 230];

  const baseSize = 8;
  const square = ([x, y]: number[]) =>
    `M ${x - baseSize} ${y} L ${x} ${y - baseSize} L ${x + baseSize} ${y} L ${x} ${y + baseSize} Z`;

  // traveling ball loop along base paths (home → 1st → 2nd → 3rd → home)
  const ballX = [home[0], first[0], second[0], third[0], home[0]];
  const ballY = [home[1], first[1], second[1], third[1], home[1]];

  return (
    <svg
      viewBox="0 0 400 360"
      className={className}
      role="img"
      aria-label="Animated baseball field diagram"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      {/* Outfield grass fill */}
      <motion.path
        d="M 200 305 L 16 121 A 260 260 0 0 1 384 121 Z"
        fill="rgba(148,192,128,0.28)"
        stroke="none"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? { duration: 0 } : { delay: 0.05, duration: 1.5, ease: EASE_OUT }}
      />
      {/* Infield dirt fill */}
      <motion.path
        d="M 200 305 L 94 199 A 110 110 0 0 1 306 199 Z"
        fill="rgba(210,158,108,0.42)"
        stroke="none"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? { duration: 0 } : { delay: 0.3, duration: 1.2, ease: EASE_OUT }}
      />
      {/* Diamond grass fill — same green as outfield */}
      <motion.path
        d={`M ${home[0]} ${home[1]} L ${first[0]} ${first[1]} L ${second[0]} ${second[1]} L ${third[0]} ${third[1]} Z`}
        fill="rgba(148,192,128,0.28)"
        stroke="none"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? { duration: 0 } : { delay: 0.4, duration: 1.2, ease: EASE_OUT }}
      />
      {/* Outfield arc — circular arc centered at home plate, endpoints on 45° foul lines */}
      <Draw
        reduce={reduce}
        d="M 16 121 A 260 260 0 0 1 384 121"
        stroke={inkSoft}
        width={1.5}
        delay={0.1}
        duration={1.8}
      />
      {/* Foul lines — from home through first/third base out to the outfield arc */}
      <Draw reduce={reduce} d={`M ${home[0]} ${home[1]} L 16 121`} stroke={ink} delay={0.25} />
      <Draw reduce={reduce} d={`M ${home[0]} ${home[1]} L 384 121`} stroke={ink} delay={0.25} />
      {/* Infield arc — dirt/grass boundary, centered at mound, curving away from home */}
      <Draw
        reduce={reduce}
        d="M 94 199 A 110 110 0 0 1 306 199"
        stroke={inkSoft}
        width={1.25}
        delay={0.5}
        duration={1.2}
      />
      {/* Base paths (diamond) */}
      <Draw
        reduce={reduce}
        d={`M ${home[0]} ${home[1]} L ${first[0]} ${first[1]} L ${second[0]} ${second[1]} L ${third[0]} ${third[1]} Z`}
        stroke={ink}
        width={1.75}
        delay={0.45}
        duration={1.6}
      />
      {/* Pitcher's mound */}
      <motion.circle
        cx={mound[0]}
        cy={mound[1]}
        r={12}
        fill="rgba(219,167,132,0.30)"
        stroke={ink}
        strokeWidth={1.25}
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { delay: 1.0, duration: 0.6, ease: EASE_OUT }}
        style={{ transformOrigin: `${mound[0]}px ${mound[1]}px` }}
      />
      <Draw reduce={reduce} d="M 194 230 L 206 230" stroke={ink} width={1.5} delay={1.3} duration={0.4} />

      {/* Bases */}
      {[first, second, third].map((p, i) => (
        <motion.path
          key={i}
          d={square(p)}
          fill="#FBFAF6"
          stroke={ink}
          strokeWidth={1.25}
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduce ? { duration: 0 } : { delay: 1.1 + i * 0.12, duration: 0.45, ease: EASE_OUT }}
          style={{ transformOrigin: `${p[0]}px ${p[1]}px` }}
        />
      ))}
      {/* Home plate (pentagon) */}
      <motion.path
        d={`M ${home[0] - 8} ${home[1] - 6} L ${home[0] + 8} ${home[1] - 6} L ${home[0] + 8} ${home[1] + 2} L ${home[0]} ${home[1] + 9} L ${home[0] - 8} ${home[1] + 2} Z`}
        fill="#FBFAF6"
        stroke={ink}
        strokeWidth={1.25}
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { delay: 1.0, duration: 0.45, ease: EASE_OUT }}
        style={{ transformOrigin: `${home[0]}px ${home[1]}px` }}
      />

      {/* Traveling ball (subtle continuous motion) */}
      {!reduce && variant === 'hero' && (
        <motion.circle
          r={5}
          fill="#FBFAF6"
          stroke="var(--seam)"
          strokeWidth={1.25}
          initial={{ cx: home[0], cy: home[1], opacity: 0 }}
          animate={{ cx: ballX, cy: ballY, opacity: [0, 1, 1, 1, 1] }}
          transition={{
            delay: 2.0,
            duration: 7,
            times: [0, 0.25, 0.5, 0.75, 1],
            repeat: Infinity,
            repeatDelay: 1.2,
            ease: 'easeInOut',
          }}
        />
      )}
    </svg>
  );
}

/* ── Baseball (ball) ───────────────────────────────────────────── */
export function Baseball({ className = '', size = 120 }: { className?: string; size?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Baseball"
      animate={reduce ? undefined : { y: [0, -10, 0], rotate: [0, 4, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ willChange: 'transform' }}
    >
      <circle cx="60" cy="60" r="46" fill="#FBFAF6" stroke="rgba(27,24,19,0.22)" strokeWidth="1.5" />
      {/* seams */}
      <path d="M 34 24 Q 50 60 34 96" fill="none" stroke="var(--seam)" strokeWidth="2" strokeLinecap="round" />
      <path d="M 86 24 Q 70 60 86 96" fill="none" stroke="var(--seam)" strokeWidth="2" strokeLinecap="round" />
      {/* stitches */}
      {[32, 44, 56, 68, 80].map((y, i) => (
        <g key={i} stroke="var(--seam)" strokeWidth="1.4" strokeLinecap="round">
          <line x1="38" y1={y} x2="44" y2={y - 3} />
          <line x1="38" y1={y} x2="44" y2={y + 3} />
          <line x1="82" y1={y} x2="76" y2={y - 3} />
          <line x1="82" y1={y} x2="76" y2={y + 3} />
        </g>
      ))}
    </motion.svg>
  );
}

/* ── Interactive baseball field (discipline nav) ───────────────── */
const FIELD_ZONES: { slug: string; label: string; top: string; left: string; glow: string }[] = [
  { slug: 'strength', label: 'Strength', top: '20%', left: '50%', glow: 'rgba(232,196,155,0.6)' },  // outfield
  { slug: 'fielding', label: 'Fielding', top: '40%', left: '74%', glow: 'rgba(185,203,166,0.6)' },  // 1st-base side infield
  { slug: 'pitching', label: 'Pitching', top: '52%', left: '50%', glow: 'rgba(173,197,215,0.6)' },  // mound
  { slug: 'hitting',  label: 'Hitting',  top: '76%', left: '50%', glow: 'rgba(219,167,132,0.6)' },  // home plate
];

export function InteractiveBaseballField({
  onSelect,
  counts,
  className = '',
}: { onSelect: (slug: string) => void; counts?: Record<string, number>; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <BaseballField variant="feature" className="h-full max-h-[420px] w-full" />
      </div>
      {FIELD_ZONES.map((z) => (
        <button
          key={z.slug}
          type="button"
          onClick={() => onSelect(z.slug)}
          aria-label={`Browse ${z.label} coaches`}
          className="group absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3.5 py-2 rounded-full transition-transform duration-300 hover:scale-[1.07] focus-visible:scale-[1.07]"
          style={{
            top: z.top,
            left: z.left,
            background: 'rgba(251,250,246,0.92)',
            border: '1px solid var(--line-strong)',
            color: 'var(--ink)',
            boxShadow: '0 6px 18px rgba(27,24,19,0.10)',
          }}
        >
          <span aria-hidden className="absolute -inset-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${z.glow} 0%, transparent 70%)`, filter: 'blur(8px)', zIndex: -1 }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ink)' }} />
          <span className="text-sm">{z.label}</span>
          {counts && counts[z.slug] != null && (
            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>· {counts[z.slug]}</span>
          )}
          <span className="text-[var(--ink-faint)] transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
        </button>
      ))}
    </div>
  );
}

/* ── Baseball bat ──────────────────────────────────────────────── */
export function Bat({ className = '', size = 240 }: { className?: string; size?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      width={size}
      height={size * 0.4}
      viewBox="0 0 300 120"
      className={className}
      role="img"
      aria-label="Baseball bat"
      animate={reduce ? undefined : { y: [0, 8, 0], rotate: [0, -2, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      style={{ willChange: 'transform' }}
    >
      <defs>
        <linearGradient id="bat-wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C99A6B" />
          <stop offset="55%" stopColor="#DBA784" />
          <stop offset="100%" stopColor="#B07E52" />
        </linearGradient>
      </defs>
      {/* barrel → handle → knob (left = barrel, right = knob) */}
      <path
        d="M 20 60
           C 20 38, 70 34, 150 46
           C 210 54, 262 57, 276 58
           L 276 62
           C 262 63, 210 66, 150 74
           C 70 86, 20 82, 20 60 Z"
        fill="url(#bat-wood)"
        stroke="rgba(27,24,19,0.18)"
        strokeWidth="1.25"
      />
      {/* knob */}
      <rect x="274" y="50" width="10" height="20" rx="4" fill="#B07E52" stroke="rgba(27,24,19,0.18)" strokeWidth="1.25" />
      {/* grain lines */}
      <path d="M 40 56 C 120 50, 220 56, 270 60" fill="none" stroke="rgba(27,24,19,0.10)" strokeWidth="1" />
      <path d="M 40 66 C 120 70, 220 64, 270 60" fill="none" stroke="rgba(27,24,19,0.10)" strokeWidth="1" />
    </motion.svg>
  );
}
