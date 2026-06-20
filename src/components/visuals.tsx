import React, { ReactNode, useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
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

/* ── Platform Slideshow ─────────────────────────────────────────── */

const SLIDE_DATA = [
  {
    slug: 'strength',
    label: 'Strength',
    tagline: 'Build the engine\nthat drives everything.',
    desc: 'Baseball performance starts in the weight room. Find certified strength coaches who program for athletes, not just gym-goers.',
    accent: 'rgba(232,196,155,0.50)',
  },
  {
    slug: 'hitting',
    label: 'Hitting',
    tagline: 'More exit velocity.\nBetter decisions at the plate.',
    desc: 'Work with hitting specialists who break down mechanics, improve bat path, and sharpen plate discipline under pressure.',
    accent: 'rgba(219,167,132,0.50)',
  },
  {
    slug: 'pitching',
    label: 'Pitching',
    tagline: 'Command the zone.\nAdd velocity. Stay healthy.',
    desc: 'Find pitching coaches who blend biomechanics with real-game strategy to help you throw harder, sharper, and longer.',
    accent: 'rgba(173,197,215,0.50)',
  },
  {
    slug: 'fielding',
    label: 'Fielding',
    tagline: 'Every routine play.\nEvery tough chance.',
    desc: 'Sharpen your reads, footwork, and arm strength with fielding coaches who focus on the details that separate good from great.',
    accent: 'rgba(185,203,166,0.50)',
  },
] as const;

type SlideSlug = typeof SLIDE_DATA[number]['slug'];

/* ── Strength: barbell lift ─────────────────────────────────────── */
function StrengthScene() {
  const reduce = useReducedMotion();
  const ink = 'rgba(27,24,19,0.55)';
  const plate = 'rgba(219,167,132,0.85)';
  return (
    <svg viewBox="0 0 300 200" aria-hidden className="w-full h-full">
      {/* Ground shadow — shrinks as bar lifts */}
      <motion.ellipse
        cx="150" cy="168" rx="54" ry="5"
        fill="rgba(27,24,19,0.10)"
        animate={reduce ? undefined : { rx: [54, 32, 54], opacity: [0.9, 0.3, 0.9] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
      />
      {/* Barbell group lifts */}
      <motion.g
        animate={reduce ? undefined : { y: [0, -40, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
      >
        {/* Left plate */}
        <rect x="60" y="78" width="24" height="46" rx="7" fill={plate} stroke={ink} strokeWidth="1.2" />
        <rect x="82" y="90" width="6" height="22" rx="2" fill="rgba(27,24,19,0.25)" />
        {/* Bar */}
        <rect x="86" y="98" width="128" height="8" rx="4" fill={ink} />
        {/* Right collar + plate */}
        <rect x="212" y="90" width="6" height="22" rx="2" fill="rgba(27,24,19,0.25)" />
        <rect x="216" y="78" width="24" height="46" rx="7" fill={plate} stroke={ink} strokeWidth="1.2" />
      </motion.g>
      {/* Effort tick marks during lift */}
      {[0, 1, 2].map((i) => (
        <motion.line
          key={i}
          x1={118 + i * 32} y1={118}
          x2={112 + i * 32} y2={136}
          stroke="rgba(27,24,19,0.16)"
          strokeWidth="1.5"
          strokeLinecap="round"
          animate={reduce ? undefined : { opacity: [0, 0.8, 0], y1: [118, 104, 118], y2: [136, 122, 136] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8, delay: 0.5 + i * 0.06 }}
        />
      ))}
    </svg>
  );
}

/* ── Hitting: ball drops to sweet spot, bat hits it back up ─────── */
function HittingScene() {
  const reduce = useReducedMotion();
  const ink = 'rgba(27,24,19,0.55)';
  const CYCLE = 3.4;
  // Ball drawn at cx=115, cy=-16 (above viewport).
  // Sweet spot is top-quarter of bat: barrel tip at ~x=56, bat is 192px long,
  // 25% from tip = x=56+48=104 → ball at x=115 lands squarely in the barrel.
  // Contact: visual (115, 118) → group y = 118 - (-16) = 134.
  // After contact ball goes straight back up: group y returns to 0.

  return (
    <svg viewBox="0 0 300 200" aria-hidden className="w-full h-full">
      {/* Strike zone (centred on x=115) */}
      <rect x="95" y="90" width="40" height="52" rx="3"
        fill="none" stroke="rgba(27,24,19,0.07)" strokeWidth="1.2" strokeDasharray="4 3" />

      {/* Bat — pivots at knob (248, 118).
           Starts at -20° (barrel below zone, ~y=174), swings UP through 0° at contact,
           continues to +38° (follow-through, barrel exits top of frame).
           This means the bat is moving upward when it contacts the ball. */}
      <motion.g
        style={{ transformOrigin: '248px 118px' }}
        animate={reduce ? undefined : { rotate: [-20, -20, 0, 38, 38, -20] }}
        transition={{
          duration: CYCLE,
          times: [0, 0.36, 0.50, 0.62, 0.76, 1],
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 0.4,
        }}
      >
        {/* Barrel (fat end — sweet spot sits right on the ball's drop line) */}
        <ellipse cx="64" cy="111" rx="18" ry="13" fill="#DBA784" stroke={ink} strokeWidth="1" />
        {/* Handle taper */}
        <path d="M 64 98 L 248 110 L 248 126 L 64 124 Z" fill="#C99A6B" stroke={ink} strokeWidth="0.8" />
        {/* Grip tape */}
        <path d="M 200 114 L 248 118" stroke="rgba(27,24,19,0.20)" strokeWidth="5" strokeLinecap="round" />
        {/* Knob */}
        <circle cx="248" cy="118" r="9" fill="#B07E52" stroke={ink} strokeWidth="1" />
      </motion.g>

      {/* Ball + seams — drops to barrel, launches straight back up */}
      <motion.g
        animate={reduce ? undefined : {
          y:       [0,   0,   134, 134, 0,   0,   0  ],
          opacity: [0,   1,   1,   1,   0.8, 0,   0  ],
        }}
        transition={{
          duration: CYCLE,
          times: [0, 0.04, 0.50, 0.52, 0.84, 0.90, 1.0],
          repeat: Infinity,
          repeatDelay: 0.4,
          ease: ['linear', 'easeIn', 'linear', 'easeOut', 'linear', 'linear'],
        }}
      >
        <circle cx="115" cy="-16" r="11" fill="#FBFAF6" stroke="rgba(27,24,19,0.25)" strokeWidth="1.2" />
        <path d="M 107 -21 Q 115 -27 123 -21" fill="none" stroke="var(--seam)" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M 107 -11 Q 115 -5  123 -11" fill="none" stroke="var(--seam)" strokeWidth="1.3" strokeLinecap="round" />
      </motion.g>

      {/* Contact burst at sweet-spot / barrel zone */}
      <motion.circle
        cx="115" cy="118"
        fill="none" stroke="rgba(219,167,132,0.82)" strokeWidth="2.5"
        animate={reduce ? undefined : {
          r:       [0,  0,   0,   0,  20,  34],
          opacity: [0,  0,   0,   1,  0.6, 0 ],
        }}
        transition={{
          duration: CYCLE,
          times: [0, 0.36, 0.51, 0.53, 0.63, 0.71],
          repeat: Infinity,
          repeatDelay: 0.4,
        }}
      />
    </svg>
  );
}

/* ── Pitching: top-down diamond, ball goes straight down mound→plate */
function PitchingScene() {
  const reduce = useReducedMotion();
  const ink = 'rgba(27,24,19,0.38)';
  const CYCLE = 2.2;
  // Ball group drawn at cx=150, cy=120 (just below mound at y=108)
  // Travels to visual cy=164 (near plate) → group delta y = 44
  const DELTA_Y = 44;

  // Diamond corners
  const HOME:   [number, number] = [150, 175];
  const FIRST:  [number, number] = [215, 112];
  const SECOND: [number, number] = [150, 50];
  const THIRD:  [number, number] = [85,  112];

  return (
    <svg viewBox="0 0 300 200" aria-hidden className="w-full h-full">
      {/* Infield dirt circle */}
      <circle cx="150" cy="112" r="65" fill="rgba(210,158,108,0.10)" />

      {/* Base lines */}
      {([[HOME, FIRST],[FIRST, SECOND],[SECOND, THIRD],[THIRD, HOME]] as [[number,number],[number,number]][]).map(([[x1,y1],[x2,y2]], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(27,24,19,0.10)" strokeWidth="1" />
      ))}

      {/* Bases (1st, 2nd, 3rd) */}
      {[FIRST, SECOND, THIRD].map(([bx, by], i) => (
        <rect key={i} x={bx - 5} y={by - 5} width="10" height="10" rx="2"
          fill="#FBFAF6" stroke={ink} strokeWidth="0.8"
          transform={`rotate(45 ${bx} ${by})`} />
      ))}

      {/* Pitcher's mound */}
      <ellipse cx="150" cy="108" rx="17" ry="11"
        fill="rgba(210,158,108,0.55)" stroke={ink} strokeWidth="1.2" />
      {/* Rubber */}
      <rect x="143" y="105" width="14" height="5" rx="2"
        fill="#FBFAF6" stroke={ink} strokeWidth="0.8" />

      {/* Home plate */}
      <path d="M 140 173 L 160 173 L 160 183 L 150 189 L 140 183 Z"
        fill="#FBFAF6" stroke={ink} strokeWidth="1.2" />

      {/* Motion trail dots (above ball, same downward travel) */}
      {[20, 34, 48].map((offset, i) => (
        <motion.circle
          key={i}
          cx="150"
          cy={120 - offset}
          r={4.5 - i * 1.2}
          fill={`rgba(173,197,215,${0.55 - i * 0.14})`}
          animate={reduce ? undefined : {
            y:       [0,   0,   DELTA_Y],
            opacity: [0,   0.7, 0      ],
          }}
          transition={{ duration: CYCLE, times: [0, 0.08, 0.72], repeat: Infinity, repeatDelay: 1.0, ease: 'easeIn' }}
        />
      ))}

      {/* Ball + seams: travels straight down from mound to plate */}
      <motion.g
        animate={reduce ? undefined : {
          y:       [0,  0,   DELTA_Y, DELTA_Y],
          opacity: [0,  1,   1,       0      ],
        }}
        transition={{ duration: CYCLE, times: [0, 0.06, 0.88, 1], repeat: Infinity, repeatDelay: 1.0, ease: 'easeIn' }}
      >
        <circle cx="150" cy="120" r="11" fill="#FBFAF6" stroke="rgba(27,24,19,0.22)" strokeWidth="1.2" />
        <path d="M 142 114 Q 150 108 158 114" fill="none" stroke="var(--seam)" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M 142 126 Q 150 132 158 126" fill="none" stroke="var(--seam)" strokeWidth="1.4" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}

/* ── Fielding: proper glove (ref-image style), ball enters from side */
function FieldingScene() {
  const reduce = useReducedMotion();
  const ink = 'rgba(27,24,19,0.55)';
  const g   = 'rgba(132,74,38,0.74)';   // main leather
  const gd  = 'rgba(104,55,22,0.68)';   // darker leather / web slats
  const gp  = 'rgba(76,36,8,0.40)';     // pocket shadow
  const CYCLE = 2.8;
  const PX = 162, PY = 120;             // pocket centre

  // Ball drawn at (-18, 92) — off left edge, slightly above pocket.
  // Pocket at (162, 120): delta x = 162-(-18)=180, delta y = 120-92=28.

  return (
    <svg viewBox="0 0 300 200" aria-hidden className="w-full h-full">

      {/* ── GLOVE (squeeze group on catch) ── */}
      <motion.g
        style={{ transformOrigin: `${PX}px ${PY}px` }}
        animate={reduce ? undefined : { scale: [1, 1, 1, 1.06, 0.97, 1] }}
        transition={{ duration: CYCLE, times: [0, 0.05, 0.72, 0.79, 0.89, 1], repeat: Infinity, repeatDelay: 0.7 }}
      >
        {/* PALM */}
        <ellipse cx="162" cy="148" rx="58" ry="46" fill={g} stroke={ink} strokeWidth="1.9" />

        {/* HEEL / WRIST */}
        <ellipse cx="162" cy="186" rx="38" ry="12" fill={gd} stroke={ink} strokeWidth="1.5" />
        <path d="M 130 191 Q 162 198 194 191"
          fill="none" stroke={ink} strokeWidth="1.1" strokeDasharray="5 4" />

        {/* 4 FINGERS — individual ellipses like the reference image */}
        <ellipse cx="128" cy="76" rx="13" ry="34" transform="rotate(-10 128 76)" fill={g} stroke={ink} strokeWidth="1.8" />
        <ellipse cx="152" cy="65" rx="13" ry="36" transform="rotate(-2 152 65)"  fill={g} stroke={ink} strokeWidth="1.8" />
        <ellipse cx="178" cy="69" rx="13" ry="35" transform="rotate(6 178 69)"   fill={g} stroke={ink} strokeWidth="1.8" />
        <ellipse cx="202" cy="82" rx="11" ry="29" transform="rotate(15 202 82)"  fill={g} stroke={ink} strokeWidth="1.8" />

        {/* Finger separation lines */}
        <line x1="140" y1="60" x2="140" y2="110" stroke={ink} strokeWidth="1.3" />
        <line x1="166" y1="52" x2="166" y2="110" stroke={ink} strokeWidth="1.3" />
        <line x1="190" y1="60" x2="192" y2="110" stroke={ink} strokeWidth="1.3" />

        {/* X-stitches between each finger pair (ref image detail) */}
        <path d="M 134 73 L 143 83 M 143 73 L 134 83" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M 160 65 L 169 75 M 169 65 L 160 75" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M 184 73 L 193 83 M 193 73 L 184 83" stroke={ink} strokeWidth="1.7" strokeLinecap="round" />

        {/* THUMB */}
        <ellipse cx="98" cy="96" rx="13" ry="32" transform="rotate(-28 98 96)" fill={g} stroke={ink} strokeWidth="1.8" />
        <path d="M 84 116 Q 96 109 110 117" fill="none" stroke={ink} strokeWidth="1.3" />

        {/* WEB — three diagonal leather slats (thumb → index, ref image style) */}
        <path d="M 96 108 L 130 80"  stroke={gd} strokeWidth="8"  strokeLinecap="round" />
        <path d="M 100 118 L 134 90" stroke={gd} strokeWidth="6.5" strokeLinecap="round" />
        <path d="M 106 127 L 138 103" stroke={gd} strokeWidth="5" strokeLinecap="round" />
        {/* Web border lines */}
        <path d="M 89 110 L 128 78"  fill="none" stroke={ink} strokeWidth="1.2" />
        <path d="M 110 129 L 140 104" fill="none" stroke={ink} strokeWidth="1.2" />

        {/* POCKET */}
        <ellipse cx={PX} cy={PY} rx="30" ry="28" fill={gp} stroke="rgba(27,24,19,0.18)" strokeWidth="1.2" />
        <ellipse cx={PX} cy={PY} rx="24" ry="22" fill="none" stroke="rgba(27,24,19,0.13)" strokeWidth="1" strokeDasharray="4 4" />

        {/* Edge lacing — right and left sides */}
        <path d="M 216 116 Q 230 150 215 180" fill="none" stroke={ink} strokeWidth="1.1" strokeDasharray="5 4" />
        <path d="M 78  128 Q 70  153 80  178" fill="none" stroke={ink} strokeWidth="1.1" strokeDasharray="5 4" />

        {/* Finger-close arc — path-morphs shut on catch */}
        <motion.path
          fill={g}
          stroke={ink}
          strokeWidth="4.5"
          strokeLinecap="round"
          animate={reduce ? undefined : {
            d: [
              'M 118 108 Q 162 95 206 108',  // open
              'M 118 108 Q 162 95 206 108',  // open
              'M 118 108 Q 162 95 206 108',  // open (ball arriving)
              'M 121 114 Q 162 103 203 114', // closed — fingers squeeze down
              'M 118 108 Q 162 95 206 108',  // open (reset)
            ],
          }}
          transition={{ duration: CYCLE, times: [0, 0.05, 0.72, 0.80, 0.95], repeat: Infinity, repeatDelay: 0.7 }}
        />
      </motion.g>

      {/* BALL — enters from left side, slight downward angle into pocket */}
      <motion.g
        animate={reduce ? undefined : {
          x:       [0,   0,   180, 180, 180],
          y:       [0,   0,   28,  28,  28 ],
          opacity: [0,   1,   1,   1,   0  ],
        }}
        transition={{
          duration: CYCLE,
          times: [0, 0.05, 0.72, 0.74, 0.80],
          repeat: Infinity,
          repeatDelay: 0.7,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {/* Drawn at (-18, 92): off left edge */}
        <circle cx="-18" cy="92" r="13" fill="#FBFAF6" stroke="rgba(27,24,19,0.25)" strokeWidth="1.4" />
        <path d="M -26 86 Q -18 80 -10 86" fill="none" stroke="var(--seam)" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M -26 98 Q -18 104 -10 98" fill="none" stroke="var(--seam)" strokeWidth="1.4" strokeLinecap="round" />
      </motion.g>

      {/* CATCH FLASH */}
      <motion.circle
        cx={PX} cy={PY}
        fill="none" stroke="rgba(185,203,166,0.84)" strokeWidth="2.5"
        animate={reduce ? undefined : {
          r:       [0,  0,   0,   0,   26,  44],
          opacity: [0,  0,   0,   1,   0.7, 0 ],
        }}
        transition={{ duration: CYCLE, times: [0, 0.05, 0.72, 0.74, 0.84, 0.97], repeat: Infinity, repeatDelay: 0.7 }}
      />
    </svg>
  );
}

const SCENES = [StrengthScene, HittingScene, PitchingScene, FieldingScene];

/* ── Clubhouse Nav ──────────────────────────────────────────────── */

const CLUBHOUSE_DATA = [
  {
    slug: 'strength' as const,
    discipline: 'Strength',
    tagline: 'Build the engine\nthat drives everything.',
    desc: 'Baseball performance starts in the weight room. Find certified strength coaches who program for athletes, not just gym-goers.',
    accent: 'rgba(232,196,155,0.50)',
    glow: 'rgba(232,196,155,0.55)',
  },
  {
    slug: 'hitting' as const,
    discipline: 'Hitting',
    tagline: 'More exit velocity.\nBetter decisions at the plate.',
    desc: 'Work with hitting specialists who break down mechanics, improve bat path, and sharpen plate discipline under pressure.',
    accent: 'rgba(219,167,132,0.50)',
    glow: 'rgba(219,167,132,0.55)',
  },
  {
    slug: 'pitching' as const,
    discipline: 'Pitching',
    tagline: 'Command the zone.\nAdd velocity. Stay healthy.',
    desc: 'Find pitching coaches who blend biomechanics with real-game strategy to help you throw harder, sharper, and longer.',
    accent: 'rgba(173,197,215,0.50)',
    glow: 'rgba(173,197,215,0.55)',
  },
  {
    slug: 'fielding' as const,
    discipline: 'Fielding',
    tagline: 'Every routine play.\nEvery tough chance.',
    desc: 'Sharpen your reads, footwork, and arm strength with fielding coaches who focus on the details that separate good from great.',
    accent: 'rgba(185,203,166,0.50)',
    glow: 'rgba(185,203,166,0.55)',
  },
] as const;

function ClubhouseIllustration({
  activeIdx,
  hoveredIdx,
  onZoneClick,
  onZoneEnter,
  onZoneLeave,
}: {
  activeIdx: number;
  hoveredIdx: number | null;
  onZoneClick: (i: number) => void;
  onZoneEnter: (i: number) => void;
  onZoneLeave: () => void;
}) {
  const reduce = useReducedMotion();
  const ink = 'rgba(27,24,19,0.55)';
  const inkSoft = 'rgba(27,24,19,0.22)';
  const wood = '#C99A6B';
  const woodDark = '#A67C52';
  const plateC = 'rgba(219,167,132,0.85)';
  const FLOOR = 178;
  const ZW = 190;

  return (
    <svg viewBox="0 0 760 188" className="w-full h-full" aria-hidden>
      {/* Floor */}
      <line x1="0" y1={FLOOR} x2="760" y2={FLOOR} stroke={inkSoft} strokeWidth="1.5" />
      {/* Zone dividers */}
      {[190, 380, 570].map(x => (
        <line key={x} x1={x} y1="8" x2={x} y2={FLOOR} stroke={inkSoft} strokeWidth="0.75" strokeDasharray="5 5" />
      ))}

      {/* ══ Zone 0: STRENGTH — barbell ══ */}
      {/* Floor shadow */}
      <ellipse cx="95" cy="175" rx="75" ry="4" fill="rgba(27,24,19,0.07)" />
      {/* Shaft */}
      <rect x="20" y="88" width="150" height="9" rx="4" fill={ink} />
      {/* Collars */}
      <rect x="42" y="82" width="7" height="21" rx="2" fill="rgba(27,24,19,0.40)" />
      <rect x="141" y="82" width="7" height="21" rx="2" fill="rgba(27,24,19,0.40)" />
      {/* Plates left — large then small */}
      <rect x="5" y="66" width="24" height="53" rx="8" fill={plateC} stroke={ink} strokeWidth="1.3" />
      <rect x="29" y="75" width="14" height="35" rx="6" fill="rgba(219,167,132,0.65)" stroke={ink} strokeWidth="1" />
      {/* Plates right */}
      <rect x="161" y="66" width="24" height="53" rx="8" fill={plateC} stroke={ink} strokeWidth="1.3" />
      <rect x="147" y="75" width="14" height="35" rx="6" fill="rgba(219,167,132,0.65)" stroke={ink} strokeWidth="1" />

      {/* ══ Zone 1: BAT RACK ══ */}
      {/* Wall rack board */}
      <rect x="208" y="58" width="154" height="11" rx="4" fill={wood} stroke={ink} strokeWidth="1.2" />
      {/* Peg hooks */}
      {[240, 285, 330].map(x => (
        <rect key={x} x={x - 2} y="66" width="4" height="12" rx="2" fill={woodDark} stroke={ink} strokeWidth="0.7" />
      ))}
      {/* Bat 1 — knob + tapered body */}
      <ellipse cx="240" cy="74" rx="5" ry="3" fill={wood} stroke={ink} strokeWidth="0.9" />
      <path d="M 237 77 L 243 77 Q 252 128 250 162 Q 240 170 230 162 Q 228 128 237 77 Z" fill={wood} stroke={ink} strokeWidth="0.9" />
      {/* Bat 2 */}
      <ellipse cx="285" cy="74" rx="5" ry="3" fill={wood} stroke={ink} strokeWidth="0.9" />
      <path d="M 282 77 L 288 77 Q 297 128 295 162 Q 285 170 275 162 Q 273 128 282 77 Z" fill={wood} stroke={ink} strokeWidth="0.9" />
      {/* Bat 3 */}
      <ellipse cx="330" cy="74" rx="5" ry="3" fill={wood} stroke={ink} strokeWidth="0.9" />
      <path d="M 327 77 L 333 77 Q 342 128 340 162 Q 330 170 320 162 Q 318 128 327 77 Z" fill={wood} stroke={ink} strokeWidth="0.9" />
      {/* Wood grain on center bat */}
      <path d="M 285 92 C 284 122 283 148 282 162" fill="none" stroke="rgba(27,24,19,0.09)" strokeWidth="1" />

      {/* ══ Zone 2: PITCHING — ball crossing home plate ══ */}
      {/* Pitch path from mound to plate */}
      <path d="M 475 32 Q 472 90 475 130" fill="none" stroke="rgba(173,197,215,0.70)" strokeWidth="1.8" strokeDasharray="5 4" strokeLinecap="round" />
      {/* Motion trail — fading dots above ball */}
      <circle cx="475" cy="72" r="8" fill="rgba(173,197,215,0.20)" />
      <circle cx="475" cy="50" r="6" fill="rgba(173,197,215,0.13)" />
      {/* Mound at top */}
      <ellipse cx="475" cy="32" rx="14" ry="9" fill="rgba(210,158,108,0.45)" stroke={inkSoft} strokeWidth="0.9" />
      {/* Rubber */}
      <rect x="469" y="29" width="12" height="5" rx="2" fill="rgba(251,250,246,0.9)" stroke={inkSoft} strokeWidth="0.8" />
      {/* Strike zone box */}
      <rect x="458" y="90" width="34" height="52" rx="2" fill="none" stroke={inkSoft} strokeWidth="1.2" strokeDasharray="4 3" />
      {/* Ball at plate */}
      <circle cx="475" cy="130" r="12" fill="#FBFAF6" stroke="rgba(27,24,19,0.25)" strokeWidth="1.4" />
      <path d="M 466 124 Q 475 118 484 124" fill="none" stroke="var(--seam,#C1443C)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 466 136 Q 475 142 484 136" fill="none" stroke="var(--seam,#C1443C)" strokeWidth="1.4" strokeLinecap="round" />
      {/* Home plate (pentagon, top-down) */}
      <path d="M 463 145 L 487 145 L 487 155 L 475 163 L 463 155 Z" fill="#FBFAF6" stroke={ink} strokeWidth="1.2" />

      {/* ══ Zone 3: FIELDING — baseball diamond (top-down) ══ */}
      {/* Outfield grass */}
      <path d="M 665 160 L 578 72 Q 665 24 752 72 Z" fill="rgba(148,192,128,0.22)" stroke="none" />
      {/* Infield dirt circle */}
      <circle cx="665" cy="105" r="55" fill="rgba(210,158,108,0.18)" stroke="none" />
      {/* Foul lines */}
      <line x1="665" y1="160" x2="578" y2="72" stroke={ink} strokeWidth="1" opacity="0.45" />
      <line x1="665" y1="160" x2="752" y2="72" stroke={ink} strokeWidth="1" opacity="0.45" />
      {/* Outfield arc */}
      <path d="M 578 72 Q 665 24 752 72" fill="none" stroke={inkSoft} strokeWidth="1.2" />
      {/* Infield arc (dirt/grass edge) */}
      <path d="M 612 105 A 75 75 0 0 1 718 105" fill="none" stroke={inkSoft} strokeWidth="1" />
      {/* Diamond base paths */}
      <polygon points="665,160 718,105 665,50 612,105" fill="rgba(148,192,128,0.18)" stroke={ink} strokeWidth="1.4" />
      {/* Pitcher's mound */}
      <circle cx="665" cy="105" r="9" fill="rgba(210,158,108,0.50)" stroke={ink} strokeWidth="0.9" />
      {/* Bases: 1st, 2nd, 3rd */}
      {([[718, 105], [665, 50], [612, 105]] as [number, number][]).map(([bx, by], i) => (
        <rect key={i} x={bx - 5} y={by - 5} width="10" height="10" rx="2"
          fill="#FBFAF6" stroke={ink} strokeWidth="1"
          transform={`rotate(45 ${bx} ${by})`} />
      ))}
      {/* Home plate (pentagon) */}
      <path d="M 656 153 L 674 153 L 674 162 L 665 168 L 656 162 Z" fill="#FBFAF6" stroke={ink} strokeWidth="1.1" />

      {/* ══ Zone overlays: glow + click targets ══ */}
      {CLUBHOUSE_DATA.map((z, i) => {
        const isActive = i === activeIdx;
        const isHovered = i === hoveredIdx;
        return (
          <g key={z.slug}>
            {(isActive || isHovered) && (
              <rect
                x={i * ZW + 2} y={2}
                width={ZW - 4} height={FLOOR - 4}
                rx={6}
                fill={z.glow}
                opacity={isActive ? 0.18 : 0.10}
                style={{ pointerEvents: 'none' }}
              />
            )}
            <rect
              x={i * ZW} y={0}
              width={ZW} height={FLOOR}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => onZoneClick(i)}
              onMouseEnter={() => onZoneEnter(i)}
              onMouseLeave={onZoneLeave}
            />
          </g>
        );
      })}

      {/* ══ Hotspot pulse dots ══ */}
      {([
        { cx: 95, cy: 92 },   // barbell center
        { cx: 285, cy: 128 }, // center bat
        { cx: 475, cy: 130 }, // ball at plate
        { cx: 665, cy: 105 }, // mound/diamond center
      ] as { cx: number; cy: number }[]).map(({ cx, cy }, i) => (
        <motion.circle
          key={i}
          cx={cx} cy={cy} r={4}
          fill={i === activeIdx ? CLUBHOUSE_DATA[i].glow : 'rgba(251,250,246,0.85)'}
          stroke={ink} strokeWidth={1}
          animate={reduce ? undefined : (i === activeIdx
            ? { scale: [1, 1.3, 1] }
            : { scale: [1, 1.6, 1], opacity: [0.7, 0.3, 0.7] }
          )}
          transition={{ duration: i === activeIdx ? 1.5 : 2.4, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
    </svg>
  );
}

export function ClubhouseNav({
  onSelect,
  counts,
}: {
  onSelect: (slug: string) => void;
  counts?: Record<string, number>;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (paused || reduce) return;
    const t = setInterval(() => setActiveIdx(i => (i + 1) % CLUBHOUSE_DATA.length), 5000);
    return () => clearInterval(t);
  }, [paused, reduce]);

  const zone = CLUBHOUSE_DATA[activeIdx];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); setHoveredIdx(null); }}
    >
      <MeshCard className="relative overflow-hidden">
        {/* Per-zone background tint */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`cbg-${activeIdx}`}
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              background: `radial-gradient(ellipse 50% 70% at ${activeIdx * 25 + 12.5}% 48%, ${zone.accent}, transparent 70%)`,
            }}
          />
        </AnimatePresence>

        {/* Illustration + tab strip */}
        <div className="relative px-4 pt-8 md:px-8">
          <ClubhouseIllustration
            activeIdx={activeIdx}
            hoveredIdx={hoveredIdx}
            onZoneClick={setActiveIdx}
            onZoneEnter={setHoveredIdx}
            onZoneLeave={() => setHoveredIdx(null)}
          />
          <div className="grid grid-cols-4" style={{ borderBottom: '1px solid var(--line)' }}>
            {CLUBHOUSE_DATA.map((z, i) => (
              <button
                key={z.slug}
                type="button"
                onClick={() => setActiveIdx(i)}
                className="py-2.5 text-center text-[10px] tracking-widest uppercase transition-colors"
                style={{
                  color: i === activeIdx ? 'var(--ink)' : 'var(--ink-faint)',
                  borderBottom: i === activeIdx ? '2px solid var(--ink)' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {z.discipline}
              </button>
            ))}
          </div>
        </div>

        {/* Text panel */}
        <div className="px-6 pt-5 pb-14 md:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={`ctxt-${activeIdx}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.38, ease: EASE_OUT }}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-5"
            >
              <div>
                <Eyebrow>
                  {zone.discipline}{counts && counts[zone.slug] ? ` · ${counts[zone.slug]}` : ''}
                </Eyebrow>
                <h3 className="display-md mt-3 mb-2" style={{ whiteSpace: 'pre-line' }}>
                  {zone.tagline}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)', maxWidth: 400 }}>
                  {zone.desc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(zone.slug)}
                className="btn-primary self-start sm:self-auto shrink-0 flex items-center gap-2"
              >
                Browse {zone.discipline} coaches
                <ArrowRight size={15} />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2.5 pb-4">
          {CLUBHOUSE_DATA.map((z, i) => (
            <button
              key={z.slug}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`View ${z.discipline}`}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIdx ? 22 : 6,
                height: 6,
                background: i === activeIdx ? 'var(--ink)' : 'var(--line-strong)',
              }}
            />
          ))}
        </div>

        {/* Auto-advance bar */}
        {!paused && !reduce && (
          <motion.div
            key={`cprog-${activeIdx}`}
            aria-hidden
            className="absolute bottom-0 left-0 h-[2px] rounded-full"
            style={{ background: 'var(--ink)', originX: 0 }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 5, ease: 'linear' }}
          />
        )}
      </MeshCard>
    </div>
  );
}

/* ── Platform Slideshow (exported) ─────────────────────────────── */
export function PlatformSlideshow({
  onSelect,
  counts,
}: {
  onSelect: (slug: string) => void;
  counts?: Record<string, number>;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (paused || reduce) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDE_DATA.length), 5000);
    return () => clearInterval(t);
  }, [paused, reduce]);

  const prev = () => setIdx((i) => (i - 1 + SLIDE_DATA.length) % SLIDE_DATA.length);
  const next = () => setIdx((i) => (i + 1) % SLIDE_DATA.length);
  const slide = SLIDE_DATA[idx];
  const Scene = SCENES[idx];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <MeshCard className="relative overflow-hidden">
        {/* Per-slide background tint */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`bg-${idx}`}
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              background: `radial-gradient(ellipse 75% 75% at 72% 38%, ${slide.accent}, transparent 70%)`,
            }}
          />
        </AnimatePresence>

        <div className="relative flex flex-col md:flex-row gap-8 md:gap-12 p-8 md:p-14 pb-16 md:pb-16">
          {/* Left: text */}
          <div className="flex flex-col justify-center gap-5 md:w-[46%] shrink-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${idx}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.42, ease: EASE_OUT }}
                className="flex flex-col gap-4"
              >
                <Eyebrow>{slide.label}{counts && counts[slide.slug] ? ` · ${counts[slide.slug]}` : ''}</Eyebrow>
                <h3
                  className="display-md"
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {slide.tagline}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)', maxWidth: 320 }}>
                  {slide.desc}
                </p>
                <button
                  type="button"
                  onClick={() => onSelect(slide.slug)}
                  className="btn-primary self-start flex items-center gap-2 mt-1"
                >
                  Browse {slide.label} coaches
                  <ArrowRight size={15} />
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: animation scene */}
          <div className="flex items-center justify-center md:w-[54%] min-h-[160px] md:min-h-[200px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`scene-${idx}`}
                className="w-full h-full max-w-[280px] max-h-[190px] mx-auto"
                initial={{ opacity: 0, scale: 0.93 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.93 }}
                transition={{ duration: 0.46, ease: EASE_OUT }}
              >
                <Scene />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 pb-4">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous discipline"
            className="p-1 transition-opacity hover:opacity-70"
            style={{ color: 'var(--ink-faint)' }}
          >
            <ChevronLeft size={15} />
          </button>

          {SLIDE_DATA.map((s, i) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`View ${s.label}`}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === idx ? 22 : 6,
                height: 6,
                background: i === idx ? 'var(--ink)' : 'var(--line-strong)',
              }}
            />
          ))}

          <button
            type="button"
            onClick={next}
            aria-label="Next discipline"
            className="p-1 transition-opacity hover:opacity-70"
            style={{ color: 'var(--ink-faint)' }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Auto-advance progress bar */}
        {!paused && !reduce && (
          <motion.div
            key={`progress-${idx}`}
            aria-hidden
            className="absolute bottom-0 left-0 h-[2px] rounded-full"
            style={{ background: 'var(--ink)', originX: 0 }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 5, ease: 'linear' }}
          />
        )}
      </MeshCard>
    </div>
  );
}
