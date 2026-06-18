import React, { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Plus, Star, Search, CalendarCheck,
  PlayCircle, Check, X, ShieldCheck, Clock, Wallet,
} from 'lucide-react';
import CoachCard from '../components/CoachCard';
import PageTransition from '../components/PageTransition';
import AnimatedCounter from '../components/AnimatedCounter';
import { SPRING, EASE_OUT } from '../tokens';
import { useI18n } from '../i18n';
import {
  BaseballField, Baseball, Bat, MeshCard, FloatingSpheres, Eyebrow, InteractiveBaseballField,
} from '../components/visuals';
import { MOCK_COACHES } from './CoachesPage';

const SPECIALTY_COUNTS: Record<string, number> = MOCK_COACHES.reduce((acc, c) => {
  acc[c.specialty] = (acc[c.specialty] || 0) + 1;
  if (c.secondary_specialty) acc[c.secondary_specialty] = (acc[c.secondary_specialty] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

/* ─── Reveal helper ─────────────────────────────────────────────── */
function Reveal({
  children, delay = 0, className = '', y = 24,
}: { children: React.ReactNode; delay?: number; className?: string; y?: number; key?: string | number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Data ──────────────────────────────────────────────────────── */
const STRIP_COACHES = [
  { name: 'Shim Jeong-soo', specialty: 'Hitting',  img: '/shim_new.png' },
  { name: 'Kris Benson',    specialty: 'Pitching', img: '/krisbenson.webp' },
  { name: 'Casey Henderson',specialty: 'Fielding', img: '/caseyhenderson.webp' },
  { name: 'Brandon Decker', specialty: 'Hitting',  img: '/brandondecker.webp' },
  { name: 'Brett Balkan',   specialty: 'Hitting',  img: '/brettbalkan.jpg' },
  { name: 'Chris Hyndman',  specialty: 'Pitching', img: 'https://picsum.photos/seed/hyndman/200/200' },
  { name: 'Nick Rocha',     specialty: 'Fielding', img: 'https://picsum.photos/seed/nickrocha/200/200' },
  { name: 'Bobby Congalton',specialty: 'Strength', img: '/bobbycongalton.jpg' },
];

const AFFILIATIONS = [
  { src: 'https://www.mlbstatic.com/team-logos/134.svg', alt: 'Pittsburgh Pirates' },
  { src: 'https://www.mlbstatic.com/team-logos/137.svg', alt: 'San Francisco Giants' },
  { src: 'https://www.mlbstatic.com/team-logos/145.svg', alt: 'Chicago White Sox' },
  { src: '/sdsu.png', alt: 'SDSU' },
  { src: '/csun.png', alt: 'CSUN' },
  { src: '/chico.png', alt: 'Chico State' },
  { src: '/unicorns.png', alt: 'Hyundai Unicorns' },
];

const FEATURED_COACHES = [
  {
    id: '1', user_id: 'u1', name: 'Shim Jeong-soo', specialty: 'hitting' as const,
    bio: "5x Korean Series Champion. 53 HR & 142 RBI in 2003. 3x KBO Golden Glove. 328 career home runs — 6th all-time in KBO.",
    price_per_session: 120, rating: 4.9, certifications: [], years_experience: 15,
    is_active: true, avatar_url: '/shim_new.png',
    avatar_position: 'top', street_address: 'Spring Canyon Neighborhood Park', city: 'San Diego', state: 'CA', zip_code: '92131',
    affiliations: [{ name: 'KBO Hyundai Unicorns', logoUrl: '/unicorns.png' }],
  },
  {
    id: '2', user_id: 'u2', name: 'Kris Benson', specialty: 'pitching' as const,
    bio: "#1 overall pick in the 1996 MLB Draft. Dick Howser Trophy winner. 1996 Olympics bronze medalist. 13 professional MLB seasons.",
    price_per_session: 150, rating: 5.0, certifications: [], years_experience: 12,
    is_active: true, avatar_url: '/krisbenson.webp',
    avatar_position: 'top', street_address: '16601 Nighthawk Ln', city: 'San Diego', state: 'CA', zip_code: '92127',
    affiliations: [{ name: 'Pittsburgh Pirates', logoUrl: 'https://www.mlbstatic.com/team-logos/134.svg' }],
  },
  {
    id: '9', user_id: 'u9', name: 'Robert Congalton', specialty: 'strength' as const,
    bio: "Co-owner of 1RM Performance. Former D1 Javelin Thrower. 445 lb bench, 545 lb deadlift. DNS-Integrated Coaching System.",
    price_per_session: 80, rating: 4.9, certifications: [], years_experience: 10,
    is_active: true, avatar_url: '/bobbycongalton.jpg',
    street_address: '4040 Sorrento Valley Blvd', city: 'San Diego', state: 'CA', zip_code: '92121',
    affiliations: [{ name: 'SDSU', logoUrl: '/sdsu.png' }],
  },
];

const DISCIPLINES = [
  { name: 'Hitting', slug: 'hitting' },
  { name: 'Pitching', slug: 'pitching' },
  { name: 'Fielding', slug: 'fielding' },
  { name: 'Strength', slug: 'strength' },
];

const FAQS = [
  {
    q: 'How does connecting work?',
    a: 'Browse coaches, open a profile, and tap Connect. Share a phone number or email and the coach reaches out directly to talk through how they can help.',
  },
  {
    q: 'How do scheduling and payment work?',
    a: 'Everything is arranged directly between you and your coach. CoachGo doesn’t handle booking or payments — once you connect, you sort out times and pricing together.',
  },
  {
    q: 'When can I message a coach in the app?',
    a: 'In-app messaging opens once a coach accepts your connection request. Until then, they’ll reach out using the contact info you shared.',
  },
  {
    q: 'What do coaches offer?',
    a: 'Each profile shows whether a coach does 1-on-1, group, or both, plus a starting price — so you know what to expect before you connect.',
  },
  {
    q: 'What if the coach isn’t the right fit?',
    a: 'No problem — you can connect with as many specialists as you like and find the one who fits your goals and schedule best.',
  },
];

/* ─── Coach strip (real faces) ──────────────────────────────────── */
function CoachStrip() {
  const tripled = [...STRIP_COACHES, ...STRIP_COACHES, ...STRIP_COACHES];
  const Row = ({ dir }: { dir: 'left' | 'right' }) => (
    <div className="overflow-hidden" style={{ width: '100%' }}>
      <div
        className={dir === 'left' ? 'marquee-left' : 'marquee-right'}
        style={{ display: 'flex', gap: '1.5rem', width: 'max-content', willChange: 'transform' }}
      >
        {tripled.map((c, i) => (
          <div key={`${dir}-${i}`} className="group relative shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-full"
            style={{ background: 'var(--card-cream)', border: '1px solid var(--line)' }}>
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
              <img src={c.img} alt={c.name} className="w-full h-full object-cover object-top" loading="lazy" width={36} height={36} referrerPolicy="no-referrer" />
            </div>
            <div className="pr-1">
              <p className="text-sm leading-none whitespace-nowrap" style={{ color: 'var(--ink)' }}>{c.name}</p>
              <span className="text-[11px] tracking-wide" style={{ color: 'var(--ink-faint)' }}>{c.specialty}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <section className="coach-strip py-10" style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div className="space-y-4">
        <Row dir="left" />
        <Row dir="right" />
      </div>
    </section>
  );
}

/* ─── Expandable feature point ──────────────────────────────────── */
function FeaturePoint({ title, detail }: { title: string; detail: string; key?: string | number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
      >
        <span className="text-base md:text-lg" style={{ color: 'var(--ink)' }}>{title}</span>
        <span
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--ink-soft)', transform: open ? 'rotate(45deg)' : 'none' }}
        >
          <Plus size={15} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm md:text-base leading-relaxed max-w-md" style={{ color: 'var(--ink-soft)' }}>{detail}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Feature section (alternating) ─────────────────────────────── */
function FeatureSection({
  eyebrow, title, intro, points, visual, reverse = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro: string;
  points: { title: string; detail: string }[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${reverse ? 'lg:[direction:rtl]' : ''}`}>
          <Reveal className={reverse ? 'lg:[direction:ltr]' : ''}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="display-lg mt-5 mb-3">{title}</h2>
            <motion.div
              className="h-px mb-5 origin-left"
              style={{ background: 'var(--line-strong)', width: 64 }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}
            />
            <p className="text-base md:text-lg leading-relaxed mb-6 max-w-md" style={{ color: 'var(--ink-soft)' }}>{intro}</p>
            <div>
              {points.map((p) => <React.Fragment key={p.title}><FeaturePoint title={p.title} detail={p.detail} /></React.Fragment>)}
            </div>
          </Reveal>
          <Reveal delay={0.1} className={reverse ? 'lg:[direction:ltr]' : ''}>
            {visual}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Mock visuals for feature cards ────────────────────────────── */
function ConnectMock() {
  return (
    <MeshCard className="p-6 md:p-8 aspect-[4/3] flex items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: 'rgba(251,250,246,0.92)', border: '1px solid var(--line)', boxShadow: '0 18px 50px rgba(27,24,19,0.10)' }}>
        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ink-faint)' }}>Connect with Kris Benson</p>
        <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>How should Kris reach you?</p>
        <div className="space-y-2.5 mb-4">
          {['Phone — (555) 123-4567', 'Email — you@email.com'].map((o) => (
            <div key={o} className="flex items-center rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
              {o}
            </div>
          ))}
        </div>
        <div className="rounded-full px-4 py-3 text-center text-sm" style={{ background: 'var(--black)', color: 'var(--paper)' }}>
          Send connection request
        </div>
      </div>
    </MeshCard>
  );
}

function ProfileMock() {
  return (
    <MeshCard className="p-6 md:p-8 aspect-[4/3] flex items-center justify-center">
      <div className="w-full max-w-xs rounded-2xl overflow-hidden" style={{ background: 'rgba(251,250,246,0.95)', border: '1px solid var(--line)', boxShadow: '0 18px 50px rgba(27,24,19,0.10)' }}>
        <div className="relative aspect-[4/3]">
          <img src="/krisbenson.webp" alt="Coach intro video" className="w-full h-full object-cover object-top" loading="lazy" />
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(27,24,19,0.18)' }}>
            <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(251,250,246,0.92)' }}>
              <PlayCircle size={26} style={{ color: 'var(--ink)' }} />
            </span>
          </div>
          <span className="absolute top-3 left-3 text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(251,250,246,0.92)', color: 'var(--ink)' }}>Pitching</span>
        </div>
        <div className="p-4">
          <p className="font-display text-2xl leading-none mb-1" style={{ color: 'var(--ink)' }}>Kris Benson</p>
          <div className="flex items-center gap-1 mb-3">
            <Star size={12} fill="var(--c-reschedule)" style={{ color: 'var(--c-reschedule)' }} />
            <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>5.0 · 28 reviews</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>Intro video · Credentials · Reviews</div>
        </div>
      </div>
    </MeshCard>
  );
}

function ReviewsMock() {
  return (
    <MeshCard className="p-6 md:p-8 aspect-[4/3] flex flex-col items-center justify-center gap-3">
      {[
        { n: 'Jake R.', t: 'Connected with a hitting coach and saw real exit-velo gains in two weeks.' },
        { n: 'Mike D.', t: 'Found a pitching specialist who actually understands mechanics.' },
      ].map((r) => (
        <div key={r.n} className="w-full max-w-sm rounded-2xl p-4" style={{ background: 'rgba(251,250,246,0.94)', border: '1px solid var(--line)', boxShadow: '0 12px 36px rgba(27,24,19,0.08)' }}>
          <div className="flex items-center gap-1 mb-2">
            {[0,1,2,3,4].map((s) => <Star key={s} size={13} fill="var(--c-reschedule)" style={{ color: 'var(--c-reschedule)' }} />)}
          </div>
          <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--ink)' }}>“{r.t}”</p>
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{r.n}</p>
        </div>
      ))}
    </MeshCard>
  );
}

function MessagingMock() {
  return (
    <MeshCard className="p-6 md:p-8 aspect-[4/3] flex items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: 'rgba(251,250,246,0.95)', border: '1px solid var(--line)', boxShadow: '0 18px 50px rgba(27,24,19,0.10)' }}>
        <p className="text-[11px] uppercase tracking-wider mb-4" style={{ color: 'var(--ink-faint)' }}>New connection request</p>
        <div className="flex items-start gap-3 mb-3">
          <span className="w-11 h-11 rounded-full flex items-center justify-center font-display text-lg shrink-0" style={{ background: 'var(--paper-warm)', color: 'var(--ink)' }}>
            JM
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight" style={{ color: 'var(--ink)' }}>Jordan Miller</p>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Shortstop · Developing</p>
          </div>
        </div>
        <p className="text-sm italic mb-4 rounded-xl px-3 py-2.5" style={{ background: 'var(--paper-warm)', color: 'var(--ink-soft)' }}>
          “Looking to improve my hitting mechanics before tryouts.”
        </p>
        <div className="flex gap-2">
          <span className="flex-1 flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm" style={{ background: 'var(--black)', color: 'var(--paper)' }}>
            <Check size={14} /> Accept
          </span>
          <span className="flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm" style={{ border: '1px solid var(--line-strong)', color: 'var(--ink-soft)' }}>
            <X size={14} /> Ignore
          </span>
        </div>
      </div>
    </MeshCard>
  );
}

/* ─── Headline line reveal (clip-mask rise) ─────────────────────── */
function LineReveal({ lines, className = '' }: { lines: string[]; className?: string }) {
  const reduce = useReducedMotion();
  let w = -1; // running word index so the stagger continues across lines
  return (
    <h1 className={className}>
      {lines.map((ln, li) => (
        <span key={li} className="block">
          {ln.split(' ').map((word, wi) => {
            w += 1;
            return (
              <span
                key={`${li}-${wi}`}
                className="inline-block overflow-hidden align-top"
                style={{ marginRight: '0.24em', paddingBottom: '0.14em', marginBottom: '-0.14em' }}
              >
                <motion.span
                  className="inline-block"
                  initial={reduce ? { opacity: 0 } : { y: '115%' }}
                  animate={reduce ? { opacity: 1 } : { y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 + w * 0.1, ease: EASE_OUT }}
                >
                  {word}
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

/* ─── Hero visual: pointer parallax + ball-landing entrance ──────── */
function HeroVisual() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18 });
  const sy = useSpring(py, { stiffness: 60, damping: 18 });
  const fieldX = useTransform(sx, v => v * 0.6);
  const fieldY = useTransform(sy, v => v * 0.6);
  const sphX = useTransform(sx, v => v * 1.7);
  const sphY = useTransform(sy, v => v * 1.7);

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width - 0.5) * 26);
    py.set(((e.clientY - r.top) / r.height - 0.5) * 26);
  };
  const onLeave = () => { px.set(0); py.set(0); };

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.2, ease: EASE_OUT }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <MeshCard className="relative aspect-square md:aspect-[4/3.4] p-6 overflow-hidden">
        <motion.div className="absolute inset-0" style={{ x: sphX, y: sphY }}>
          <FloatingSpheres spheres={[
            { size: 90, color: 'rgba(173,197,215,0.7)', top: '-3%', right: '8%', drift: 16 },
            { size: 70, color: 'rgba(219,167,132,0.6)', bottom: '6%', left: '-2%', delay: 1, drift: 14 },
          ]} />
        </motion.div>
        <motion.div className="relative h-full w-full" style={{ x: fieldX, y: fieldY }}>
          <BaseballField variant="hero" className="h-full w-full" />
        </motion.div>
        {!reduce && (
          <motion.div
            aria-hidden
            className="absolute left-1/2 pointer-events-none"
            style={{ bottom: '16%', x: '-50%' }}
            initial={{ y: -170, opacity: 0 }}
            animate={{ y: [-170, -170, 0, -16, 0], opacity: [0, 1, 1, 1, 1] }}
            transition={{ duration: 1.15, delay: 0.2, times: [0, 0.06, 0.62, 0.82, 1], ease: 'easeIn' }}
          >
            <Baseball size={32} />
          </motion.div>
        )}
      </MeshCard>
    </motion.div>
  );
}

/* ─── MAIN ──────────────────────────────────────────────────────── */
export default function LandingPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <PageTransition>
      <div className="overflow-hidden" style={{ background: 'var(--paper)' }}>

        {/* ── HERO ── */}
        <section className="relative min-h-[92vh] flex items-center pt-28 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Copy */}
              <div>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
                  <Eyebrow>San Diego baseball coaching</Eyebrow>
                </motion.div>
                <LineReveal className="display-xl mt-6 mb-6" lines={[t('hero.title1'), t('hero.title2')]} />
                <motion.p
                  className="text-lg leading-relaxed max-w-md mb-8"
                  style={{ color: 'var(--ink-soft)' }}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT }}
                >
                  {t('hero.sub')}
                </motion.p>
                <motion.div
                  className="flex flex-col sm:flex-row gap-3"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.32, ease: EASE_OUT }}
                >
                  <Link to="/coaches" className="btn-primary"><Search size={17} /> {t('hero.browse')}</Link>
                  <Link to="/auth" className="btn-secondary">{t('hero.join')}</Link>
                </motion.div>

                {/* Affiliation strip */}
                <motion.div
                  className="mt-12"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}
                >
                  <p className="text-[11px] uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--ink-faint)' }}>{t('hero.affiliated')}</p>
                  <motion.div
                    className="flex flex-wrap items-center gap-6"
                    variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.6 } } }}
                    initial="hidden"
                    animate="visible"
                  >
                    {AFFILIATIONS.map((a) => (
                      <motion.img
                        key={a.alt} src={a.src} alt={a.alt} className="h-7 w-auto object-contain"
                        loading="lazy" referrerPolicy="no-referrer"
                        variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { ...SPRING } } }}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              </div>

              {/* Visual */}
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* ── COACH STRIP ── */}
        <CoachStrip />

        {/* ── SEE IT IN ACTION ── */}
        <section className="py-20 md:py-28 relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Reveal>
              <Eyebrow>The platform</Eyebrow>
              <h2 className="display-lg mt-5 mb-5">See CoachGo in action</h2>
              <p className="text-lg leading-relaxed max-w-xl mx-auto mb-10" style={{ color: 'var(--ink-soft)' }}>
                From discovering specialists to connecting and training — a calm, focused way to get better at baseball.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <MeshCard className="relative aspect-[16/10] md:aspect-[16/8] p-8 md:p-14">
                <FloatingSpheres spheres={[
                  { size: 120, color: 'rgba(185,203,166,0.6)', top: '6%', left: '4%', drift: 20 },
                  { size: 100, color: 'rgba(173,197,215,0.6)', top: '12%', right: '8%', delay: 1.2, drift: 18 },
                  { size: 80, color: 'rgba(219,167,132,0.55)', bottom: '8%', left: '22%', delay: 0.6, drift: 16 },
                ]} />
                <div className="relative h-full w-full">
                  <InteractiveBaseballField
                    onSelect={(slug) => navigate(`/coaches?specialty=${slug}`)}
                    counts={SPECIALTY_COUNTS}
                    className="h-full w-full"
                  />
                </div>
              </MeshCard>
              <p className="mt-6 text-sm" style={{ color: 'var(--ink-faint)' }}>Tap a zone to explore that discipline.</p>
              <div className="mt-6 flex justify-center">
                <Link to="/coaches" className="btn-primary"><Search size={17} /> Browse all coaches</Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FEATURE SECTIONS ── */}
        <FeatureSection
          eyebrow="Connecting"
          title={<>Connect in<br />under a minute</>}
          intro="Find a specialist, tap Connect, and share how to reach you. The coach takes it from there — no back-and-forth, no upfront commitment."
          points={[
            { title: 'Tap Connect', detail: 'See what each coach offers — 1-on-1, group, or both — then send a request in one tap.' },
            { title: 'Share your contact', detail: 'Add a phone number or email and an optional note about your goals.' },
            { title: 'They reach out', detail: 'The coach contacts you directly to plan training, scheduling, and pricing.' },
          ]}
          visual={<ConnectMock />}
        />

        <FeatureSection
          reverse
          eyebrow="Coaches"
          title={<>Meet your coach<br />before you connect</>}
          intro="Every coach has an intro video, verified credentials, and real reviews — so you know exactly who you’re training with."
          points={[
            { title: 'Watch an intro video', detail: 'Hear directly from each coach about how they teach before you commit.' },
            { title: 'See verified credentials', detail: 'MLB veterans, D1 college players, and league MVPs — vetted specialists only.' },
            { title: 'Read real reviews', detail: 'Honest feedback from players who actually trained with them.' },
          ]}
          visual={<ProfileMock />}
        />

        <FeatureSection
          eyebrow="Reviews"
          title={<>Train with<br />proven coaches</>}
          intro="Ratings and reviews come from completed sessions only — and every coach’s average updates the moment a new review lands."
          points={[
            { title: 'Real player reviews', detail: 'Honest feedback from players who actually trained with each coach.' },
            { title: 'Live coach ratings', detail: 'Each coach’s star rating reflects their track record with real players.' },
            { title: 'Connect with confidence', detail: 'Reach out to as many specialists as you like to find your best fit.' },
          ]}
          visual={<ReviewsMock />}
        />

        <FeatureSection
          reverse
          eyebrow="Messaging & support"
          title={<>Questions?<br />Just ask</>}
          intro="Once a coach accepts your request, message them directly — and lean on AI support any time of day."
          points={[
            { title: 'Message connected coaches', detail: 'When a coach accepts, in-app messaging opens to sort out the details.' },
            { title: 'AI support, 24/7', detail: 'Get instant answers about connecting and how the platform works.' },
            { title: 'Plans set directly', detail: 'Scheduling and payment are arranged between you and your coach.' },
          ]}
          visual={<MessagingMock />}
        />

        {/* ── GET STARTED IN MINUTES ── */}
        <section className="py-20 md:py-28" style={{ background: 'var(--paper-warm)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <Reveal>
                <Eyebrow>Get started</Eyebrow>
                <h2 className="display-lg mt-5 mb-10">Up and training<br />in minutes</h2>
                <div className="space-y-8">
                  {[
                    { n: '1', t: 'Discover coaches', d: 'Filter by specialty, location, price, and rating to find the right specialist.' },
                    { n: '2', t: 'Connect', d: 'Tap Connect and share your contact info — the coach reaches out directly.' },
                    { n: '3', t: 'Train your way', d: 'Plan scheduling and pricing together, then show up and get better.' },
                  ].map((s, i) => (
                    <Reveal key={s.n} delay={i * 0.08} className="">
                      <div className="flex gap-6 items-start">
                        <span className="stat-number text-5xl md:text-6xl shrink-0 leading-none" style={{ color: 'var(--ink)' }}>{s.n}</span>
                        <div className="pt-1">
                          <h3 className="font-display text-2xl mb-1" style={{ color: 'var(--ink)' }}>{s.t}</h3>
                          <p className="text-base leading-relaxed max-w-sm" style={{ color: 'var(--ink-soft)' }}>{s.d}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <MeshCard className="relative aspect-[4/3.4] p-8 flex items-center justify-center">
                  <FloatingSpheres spheres={[
                    { size: 90, color: 'rgba(185,203,166,0.6)', top: '4%', right: '6%', drift: 16 },
                  ]} />
                  <div className="relative w-full max-w-xs rounded-2xl overflow-hidden" style={{ background: 'rgba(251,250,246,0.95)', border: '1px solid var(--line)', boxShadow: '0 20px 60px rgba(27,24,19,0.12)' }}>
                    <div className="aspect-[4/3]">
                      <img src="/shim_new.png" alt="Coach" className="w-full h-full object-cover object-top" loading="lazy" />
                    </div>
                    <div className="p-4">
                      <p className="font-display text-2xl leading-none mb-1" style={{ color: 'var(--ink)' }}>Shim Jeong-soo</p>
                      <p className="text-xs mb-3" style={{ color: 'var(--ink-faint)' }}>Hitting · San Diego, CA</p>
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                        <span className="font-display text-xl" style={{ color: 'var(--ink)' }}>$120<span className="text-xs ml-1" style={{ color: 'var(--ink-faint)' }}>/ session</span></span>
                        <span className="text-sm px-3 py-1.5 rounded-full" style={{ background: 'var(--black)', color: 'var(--paper)' }}>Connect</span>
                      </div>
                    </div>
                  </div>
                </MeshCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── STATS / SOCIAL PROOF ── */}
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
              <Reveal>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { v: 8, suffix: '', label: 'Elite coaches' },
                    { v: 4, suffix: '', label: 'Specialties' },
                    { v: 100, suffix: '%', label: 'Vetted' },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className="stat-number text-5xl md:text-7xl"><AnimatedCounter to={s.v} suffix={s.suffix} /></p>
                      <p className="text-sm mt-2" style={{ color: 'var(--ink-soft)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <figure className="cg-card p-8 md:p-10">
                  <div className="flex items-center gap-1 mb-4">
                    {[0,1,2,3,4].map((s) => <Star key={s} size={16} fill="var(--c-reschedule)" style={{ color: 'var(--c-reschedule)' }} />)}
                  </div>
                  <blockquote className="font-display text-2xl md:text-3xl leading-snug mb-6" style={{ color: 'var(--ink)' }}>
                    “Finding a pitching specialist who actually understands mechanics was a game-changer for my son.”
                  </blockquote>
                  <figcaption className="flex items-center gap-3">
                    <img src="/krisbenson.webp" alt="" className="w-10 h-10 rounded-full object-cover object-top" loading="lazy" />
                    <div>
                      <p className="text-sm" style={{ color: 'var(--ink)' }}>Mike D.</p>
                      <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Parent of 16U player</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── THREE-CARD ROW ── */}
        <section className="pb-8 md:pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { Icon: Clock, t: 'Connect in seconds', d: 'Find a coach, tap Connect, share your contact info.', tint: 'rgba(173,197,215,0.5)' },
                { Icon: ShieldCheck, t: 'Vetted coaches', d: 'Hand-picked specialists with verified credentials.', tint: 'rgba(185,203,166,0.5)' },
                { Icon: Wallet, t: 'Plans direct with coach', d: 'Scheduling and payment are arranged with your coach.', tint: 'rgba(219,167,132,0.5)' },
              ].map((c, i) => (
                <Reveal key={c.t} delay={i * 0.08}>
                  <div className="cg-card cg-card-hover p-7 h-full">
                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: c.tint, color: 'var(--ink)' }}>
                      <c.Icon size={22} />
                    </span>
                    <h3 className="font-display text-2xl mb-2" style={{ color: 'var(--ink)' }}>{c.t}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{c.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURED COACHES ── */}
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-12">
                <div>
                  <Eyebrow>Featured</Eyebrow>
                  <h2 className="display-lg mt-5">Elite coaches</h2>
                </div>
                <Link to="/coaches" className="btn-secondary self-start md:self-auto">View all 8 coaches <ArrowRight size={16} /></Link>
              </div>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURED_COACHES.map((coach, i) => (
                <Reveal key={coach.id} delay={i * 0.1}>
                  <CoachCard coach={coach} />
                </Reveal>
              ))}
            </div>

            {/* Browse by discipline */}
            <Reveal delay={0.15}>
              <div className="mt-12 flex flex-wrap items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--ink-faint)' }}>Browse by discipline:</span>
                {DISCIPLINES.map((d) => (
                  <Link key={d.slug} to={`/coaches?specialty=${d.slug}`} className="eyebrow hover:border-[var(--ink)] transition-colors">{d.name}</Link>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 md:py-28" style={{ background: 'var(--paper-warm)' }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="text-center mb-12">
                <Eyebrow>FAQ</Eyebrow>
                <h2 className="display-lg mt-5">Questions, answered</h2>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div>
                {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <BottomCTA />

      </div>
    </PageTransition>
  );
}

/* ─── Bottom CTA with scroll-linked bat + ball ──────────────────── */
function BottomCTA() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  // As the section scrolls into view, bat & ball glide toward center, then just miss.
  const batX = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -120, 0]);
  const ballX = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 140, 0]);
  const fade = useTransform(scrollYProgress, [0, 0.4, 1], [0, 0.6, 0.95]);

  return (
    <section ref={ref} className="relative py-28 md:py-40 overflow-hidden">
      <motion.div aria-hidden className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-0"
        style={{ x: batX, opacity: fade }}>
        <motion.div
          animate={reduce ? undefined : { y: [0, -14, 0], rotate: [0, -1.5, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Bat size={340} />
        </motion.div>
      </motion.div>
      <motion.div aria-hidden className="hidden md:block absolute right-[6%] top-1/2 -translate-y-1/2 z-0"
        style={{ x: ballX, opacity: fade }}>
        <motion.div
          animate={reduce ? undefined : { y: [0, 16, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <Baseball size={130} />
        </motion.div>
      </motion.div>

      <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
        <Reveal>
          <Eyebrow>Get started</Eyebrow>
          <h2 className="display-xl mt-6 mb-6">Give every player<br />a path to the<br />next level</h2>
          <p className="text-lg max-w-md mx-auto mb-10" style={{ color: 'var(--ink-soft)' }}>
            Join San Diego players already training with the best specialists in the game.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/coaches" className="btn-primary"><Search size={17} /> Get started</Link>
            <Link to="/auth" className="btn-secondary">Join as a coach <ArrowUpRight size={16} /></Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── FAQ item ──────────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string; key?: string | number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-4 py-5 text-left">
        <span className="font-display text-xl md:text-2xl" style={{ color: 'var(--ink)' }}>{q}</span>
        <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--ink-soft)', transform: open ? 'rotate(45deg)' : 'none' }}>
          <Plus size={16} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-base leading-relaxed max-w-xl" style={{ color: 'var(--ink-soft)' }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
