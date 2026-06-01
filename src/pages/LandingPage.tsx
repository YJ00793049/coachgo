import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Star, CheckCircle2 } from 'lucide-react';
import CoachCard from '../components/CoachCard';
import PageTransition from '../components/PageTransition';
import AnimatedCounter from '../components/AnimatedCounter';
import MagneticButton from '../components/MagneticButton';
import { SPRING } from '../tokens';
import { GlowingEffect } from '../../components/ui/glowing-effect-card';
import { ShimmerButton } from '../../components/ui/shimmer-button';
import { AnimatedTestimonials } from '../../components/ui/animated-testimonials';
import { BentoCard, BentoGrid } from '../../components/ui/bento-grid';

// ─── LETTER-BY-LETTER ANIMATED HEADLINE ──────────────────────────
function AnimatedLetters({
  text,
  className = '',
  delay = 0,
  gradient = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  gradient?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const letters = text.split('');
  return (
    <motion.span
      className={className}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04, delayChildren: delay } } }}
      initial="hidden"
      animate="visible"
    >
      {letters.map((char, i) => (
        <motion.span
          key={i}
          className={`inline-block ${char === ' ' ? 'mr-[0.3em]' : ''} ${gradient ? 'gradient-headline' : ''}`}
          style={gradient ? { display: 'inline-block' } : {}}
          variants={{
            hidden:  { opacity: 0, y: prefersReduced ? 0 : 80 },
            visible: { opacity: 1, y: 0, transition: { ...SPRING } },
          }}
        >
          {char === ' ' ? ' ' : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ─── HERO 3D COACH CARD (cursor-tracked) ─────────────────────────
function HeroCoachCard({ heroRef }: { heroRef: React.RefObject<HTMLElement | null> }) {
  const prefersReduced = useReducedMotion();
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springRotX = useSpring(rotX, { stiffness: 300, damping: 25 });
  const springRotY = useSpring(rotY, { stiffness: 300, damping: 25 });

  useEffect(() => {
    if (prefersReduced || isTouch) return;
    const el = heroRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      // Card center estimate — right side, 50% vertical
      const cardCx = rect.left + rect.width * 0.78;
      const cardCy = rect.top + rect.height * 0.5;
      const dx = (e.clientX - cardCx) / rect.width;
      const dy = (e.clientY - cardCy) / rect.height;
      rotY.set(Math.max(-15, Math.min(15, dx * 30)));
      rotX.set(Math.max(-15, Math.min(15, -dy * 30)));
    };
    const onLeave = () => { rotX.set(0); rotY.set(0); };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [heroRef, prefersReduced, isTouch, rotX, rotY]);

  return (
    <div className="hidden lg:block absolute right-[6%] top-1/2 -translate-y-1/2 z-[5] pointer-events-none">
      {/* Soft trailing glow */}
      <motion.div
        aria-hidden
        className="absolute -inset-12 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(79,142,247,0.35) 0%, rgba(124,58,237,0.18) 35%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={prefersReduced ? {} : { y: [-20, 20, -20], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        animate={prefersReduced ? {} : { y: [-12, 12, -12] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ perspective: 1200 }}
      >
        <motion.div
          style={{
            rotateX: springRotX,
            rotateY: springRotY,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.8 }}
          className="relative w-[280px] rounded-3xl"
        >
          {/* Rotating conic border */}
          <div
            aria-hidden
            className="absolute -inset-[2px] rounded-[26px] pointer-events-none"
            style={{
              background: 'conic-gradient(from 0deg, #4F8EF7, #7C3AED, #06B6D4, #4F8EF7)',
              animation: prefersReduced ? 'none' : 'conic-spin 4s linear infinite',
              filter: 'blur(0.5px)',
            }}
          />
          {/* Card body */}
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,142,247,0.08)',
            }}
          >
            {/* Image */}
            <div className="aspect-[4/3] relative overflow-hidden">
              <img
                src="/krisbenson.webp"
                alt="Kris Benson"
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,11,20,0.92) 0%, rgba(8,11,20,0.1) 50%, transparent 70%)' }} />

              {/* Available badge */}
              <motion.div
                className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.4)' }}
                animate={prefersReduced ? {} : { opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#86efac' }}>Available Today</span>
              </motion.div>

              {/* Rating */}
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: 'rgba(8,11,20,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Star size={10} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                <span className="text-[10px] font-bold text-white">5.0</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#4F8EF7' }}>Pitching</p>
              <p className="font-bold text-white text-base leading-tight mb-3">Kris Benson</p>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-bold block" style={{ color: 'rgba(255,255,255,0.25)' }}>From</span>
                  <span className="font-display text-2xl text-white block leading-none">$150</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>/ session</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── FEATURES BENTO (6 cells, asymmetric grid) ────────────────────
function FeaturesBento() {
  const prefersReduced = useReducedMotion();
  const baseCard = "relative rounded-3xl overflow-hidden p-7";
  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
  } as const;

  const wrap = (i: number, cls: string, children: React.ReactNode, extraStyle: React.CSSProperties = {}) => (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...SPRING, delay: i * 0.08 }}
      whileHover={prefersReduced ? {} : { y: -8, boxShadow: '0 30px 80px rgba(79,142,247,0.2)' }}
      className={`${baseCard} ${cls}`}
      style={{ ...cardStyle, ...extraStyle }}
    >
      {children}
    </motion.div>
  );

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ ...SPRING }}
          className="text-center mb-12"
        >
          <p className="tag-badge mb-6 inline-block">Why CoachGo</p>
          <h2 className="font-display text-5xl md:text-7xl text-white leading-none">
            BUILT FOR<br />
            <span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.25)', color: 'transparent' }}>SERIOUS PLAYERS</span>
          </h2>
        </motion.div>

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: '230px' }}
        >
          {/* 1 — Book in 60s (2 cols wide) */}
          {wrap(0, 'col-span-2 row-span-1', (
            <>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 0% 100%, rgba(79,142,247,0.18) 0%, transparent 60%)' }} />
              {/* mini booking-flow indicator */}
              <div className="relative h-full flex flex-col justify-between">
                <div>
                  <motion.div
                    className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
                    style={{ background: 'rgba(79,142,247,0.15)', color: '#4F8EF7' }}
                    animate={prefersReduced ? {} : { rotate: [0, 12, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </motion.div>
                  <h3 className="font-display text-3xl text-white mb-2">BOOK IN 60 SECONDS</h3>
                  <p className="text-sm max-w-md" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Pick a coach, pick a slot, you're done. No back-and-forth, no waitlists.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  {['Pick coach', 'Choose slot', 'Confirm'].map((step, idx) => (
                    <div key={step} className="flex items-center gap-2">
                      <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ background: '#4F8EF7' }}
                        animate={prefersReduced ? {} : { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.5 }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>{step}</span>
                      {idx < 2 && <span className="text-white/20">›</span>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ))}

          {/* 2 — Intro videos */}
          {wrap(1, 'col-span-1 row-span-1', (
            <div className="h-full flex flex-col justify-between">
              <motion.div
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl"
                style={{ background: 'rgba(124,58,237,0.18)', color: '#A78BFA' }}
                whileHover={{ scale: 1.1 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              </motion.div>
              <div>
                <h3 className="font-bold text-white mb-1">Intro Videos</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Hear from every coach before you book.</p>
              </div>
              {/* pulsing play ripple */}
              <motion.span
                aria-hidden
                className="absolute top-7 left-7 w-12 h-12 rounded-2xl pointer-events-none"
                style={{ border: '1px solid rgba(124,58,237,0.5)' }}
                animate={prefersReduced ? {} : { scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          ))}

          {/* 3 — Elite vetted (tall, rowspan 2) */}
          {wrap(2, 'col-span-1 row-span-2', (
            <div className="h-full flex flex-col justify-between" style={{ background: 'radial-gradient(ellipse at top, rgba(245,158,11,0.08), transparent 70%)', borderRadius: 'inherit', margin: '-1.75rem', padding: '1.75rem' }}>
              <div>
                <motion.div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
                  animate={prefersReduced ? {} : { y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2L4 6v6c0 4 3 8 8 10 5-2 8-6 8-10V6l-8-4z"/></svg>
                </motion.div>
                <h3 className="font-display text-2xl text-white mb-3 leading-tight">ELITE VETTED COACHES</h3>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Every coach is hand-picked. MLB veterans, D1 college players, league MVPs.
                </p>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'MLB Draftees', count: '3' },
                  { label: 'D1 College', count: '5' },
                  { label: 'League MVPs', count: '4' },
                ].map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...SPRING, delay: 0.3 + i * 0.1 }}
                    className="flex items-center justify-between text-xs py-2"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.55)' }}>{row.label}</span>
                    <span className="font-display text-lg text-white">{row.count}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}

          {/* 4 — Venmo payments */}
          {wrap(3, 'col-span-1 row-span-1', (
            <div className="h-full flex flex-col justify-between relative">
              <motion.div
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-white font-bold text-lg"
                style={{ background: '#008CFF', boxShadow: '0 6px 20px rgba(0,140,255,0.4)' }}
                whileHover={{ rotate: -10, scale: 1.1 }}
              >
                V
              </motion.div>
              <div>
                <h3 className="font-bold text-white mb-1">Venmo Payments</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Pay after the coach confirms. No upfront commitment.</p>
              </div>
            </div>
          ))}

          {/* 5 — 24h reminders */}
          {wrap(4, 'col-span-1 row-span-1', (
            <div className="h-full flex flex-col justify-between">
              <motion.div
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl"
                style={{ background: 'rgba(6,182,212,0.15)', color: '#06B6D4' }}
                animate={prefersReduced ? {} : { rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </motion.div>
              <div>
                <h3 className="font-bold text-white mb-1">24h Reminders</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Email pings so you never miss a session.</p>
              </div>
            </div>
          ))}

          {/* 6 — Leave reviews */}
          {wrap(5, 'col-span-1 row-span-1', (
            <div className="h-full flex flex-col justify-between">
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map(s => (
                  <motion.svg
                    key={s}
                    width="22" height="22" viewBox="0 0 24 24"
                    initial={{ fill: 'transparent', color: 'rgba(245,158,11,0.4)' }}
                    whileInView={{ fill: '#F59E0B', color: '#F59E0B' }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + s * 0.12, duration: 0.3 }}
                    stroke="currentColor" strokeWidth={1.5}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </motion.svg>
                ))}
              </div>
              <div>
                <h3 className="font-bold text-white mb-1">Real Player Reviews</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Honest feedback from players who actually trained.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── INFINITE COACH STRIP (2 rows opposite directions) ───────────
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
function CoachStrip() {
  // tripled for seamless loop (marquee animates -33.333%)
  const tripled = [...STRIP_COACHES, ...STRIP_COACHES, ...STRIP_COACHES];
  const Row = ({ dir }: { dir: 'left' | 'right' }) => (
    <div className="overflow-hidden" style={{ width: '100%' }}>
      <div
        className={dir === 'left' ? 'marquee-left' : 'marquee-right'}
        style={{ display: 'flex', gap: '2rem', width: 'max-content', willChange: 'transform' }}
      >
        {tripled.map((c, i) => (
          <div
            key={`${dir}-${i}`}
            className="group relative shrink-0 flex flex-col items-center gap-2"
            style={{ width: 110 }}
          >
            <div
              className="relative w-16 h-16 rounded-full overflow-hidden transition-all duration-300 group-hover:scale-[1.3]"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
              }}
            >
              <img
                src={c.img}
                alt={c.name}
                className="w-full h-full object-cover object-top"
                loading="lazy"
                width={64}
                height={64}
                referrerPolicy="no-referrer"
              />
              {/* hover glow ring */}
              <span
                aria-hidden
                className="absolute -inset-1 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'conic-gradient(from 0deg, #4F8EF7, #7C3AED, #06B6D4, #4F8EF7)', filter: 'blur(6px)', zIndex: -1 }}
              />
            </div>
            <p className="text-[10px] font-bold text-center text-white truncate w-full">{c.name.split(' ')[0]}</p>
            <span className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(79,142,247,0.7)' }}>{c.specialty}</span>
            {/* Name tooltip on hover */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: '#4F8EF7', color: 'white' }}
            >
              {c.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <section className="coach-strip py-12 relative" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="space-y-8">
        <Row dir="left" />
        <Row dir="right" />
      </div>
    </section>
  );
}

// ─── TICKER / INFINITE MARQUEE ────────────────────────────────────
function Ticker() {
  const items = [
    'HITTING SPECIALISTS', '★', 'PITCHING COACHES', '★', 'FIELDING EXPERTS', '★',
    'STRENGTH TRAINING', '★', 'SAN DIEGO', '★', 'ELITE INSTRUCTION', '★',
    'BOOK A SESSION', '★', 'FIND YOUR EDGE', '★', 'LEVEL UP YOUR GAME', '★',
  ];
  const doubled = [...items, ...items];
  return (
    <div className="ticker-wrap py-4 border-y overflow-hidden group" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="ticker-track group-hover:[animation-play-state:paused]">
        {doubled.map((item, i) => (
          <span key={i} className="mx-6 text-xs font-bold tracking-[0.2em] uppercase"
            style={{ color: item === '★' ? '#4F8EF7' : 'rgba(255,255,255,0.25)' }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── PARTICLE FIELD ───────────────────────────────────────────────
function ParticleField({ count = 30 }: { count?: number }) {
  const prefersReduced = useReducedMotion();
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      duration: Math.random() * 12 + 8,
      delay: -(Math.random() * 12),
    })),
  [count]);

  if (prefersReduced) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: 'rgba(79,142,247,0.5)', willChange: 'transform' }}
          animate={{ y: [0, -24, 0], x: [0, 8, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── FEATURED COACHES DATA ────────────────────────────────────────
const FEATURED_COACHES = [
  {
    id: '1', user_id: 'u1', name: 'Shim Jeong-soo', specialty: 'hitting' as const,
    bio: "• 5x Korean Series Champion\n• 53 HR & 142 RBI in 2003\n• 3x KBO Golden Glove Award\n• 328 career home runs — 6th all-time in KBO",
    price_per_session: 120, rating: 4.9, certifications: [], years_experience: 15,
    session_types: [], availability: {}, is_active: true, avatar_url: '/shim_new.png',
    avatar_position: 'top', street_address: 'Spring Canyon Neighborhood Park', city: 'San Diego', state: 'CA', zip_code: '92131',
    affiliations: [{ name: 'KBO Hyundai Unicorns', logoUrl: '/unicorns.png' }]
  },
  {
    id: '2', user_id: 'u2', name: 'Kris Benson', specialty: 'pitching' as const,
    bio: "• #1 overall pick in the 1996 MLB Draft\n• Dick Howser Trophy winner\n• 1996 Olympics bronze medalist\n• 13 professional MLB seasons",
    price_per_session: 150, rating: 5.0, certifications: [], years_experience: 12,
    session_types: [], availability: {}, is_active: true, avatar_url: '/krisbenson.webp',
    avatar_position: 'top', street_address: '16601 Nighthawk Ln', city: 'San Diego', state: 'CA', zip_code: '92127',
    affiliations: [{ name: 'Pittsburgh Pirates', logoUrl: 'https://www.mlbstatic.com/team-logos/134.svg' }]
  },
  {
    id: '9', user_id: 'u9', name: 'Robert Congalton', specialty: 'strength' as const,
    bio: "• Co-owner of 1RM Performance\n• Former D1 Javelin Thrower\n• 445 lb bench, 545 lb deadlift\n• DNS-Integrated Coaching System",
    price_per_session: 80, rating: 4.9, certifications: [], years_experience: 10,
    session_types: [], availability: {}, is_active: true, avatar_url: '/bobbycongalton.jpg',
    street_address: '4040 Sorrento Valley Blvd', city: 'San Diego', state: 'CA', zip_code: '92121',
    affiliations: [{ name: 'SDSU', logoUrl: '/sdsu.png' }]
  }
];

// ─── SPECIALTY ICONS ──────────────────────────────────────────────
const HittingIcon = () => (
  <svg fill="currentColor" viewBox="0 0 496.926 496.926" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
    <path d="M227.831,233.153c-17.891,32.025-36.395,65.14-44.667,77.982c-6.072,9.438-28.018,41.875-98.063,142.75c-5.737-1.33-11.915,1.004-15.673,6.473c-2.228,3.242-3.05,7.145-2.333,11.008c0.717,3.854,2.907,7.199,6.139,9.428l19.699,13.541c2.467,1.691,5.345,2.592,8.329,2.592h0.01c4.838,0,9.362-2.383,12.431-6.848c3.471-5.049,3.347-11.59,0.115-16.467c13.091-19.258,83.299-122.496,98.13-142.711c9.018-12.316,33.287-41.424,56.744-69.566c19.298-23.151,37.514-45.021,46.244-56.314c19.106-24.729,50.213-66.909,50.624-67.454l58.379-84.943c11.839-17.222,3.979-30.208-2.036-34.817L400.052,2.792C399.583,2.505,395.299,0,389.188,0c-5.871,0-14.487,2.343-22.156,13.512L308.558,98.58c-0.277,0.44-28.506,44.6-44.753,71.298C256.375,182.061,242.51,206.875,227.831,233.153z"/>
  </svg>
);
const PitchingIcon = () => (
  <svg fill="currentColor" viewBox="0 0 297 297" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
    <path d="M45.422,209.945c2.836-3.499,7.97-4.036,11.467-1.206l5.278,4.274c2.933-6.072,5.441-12.338,7.509-18.766l-9.032-6.092c-3.733-2.518-4.718-7.585-2.201-11.318c2.519-3.733,7.586-4.718,11.318-2.201l4.232,2.854c1.336-6.821,2.205-13.778,2.582-20.838h-8.15c-4.503,0-8.153-3.65-8.153-8.153c0-4.503,3.65-8.153,8.153-8.153h8.15c-0.376-7.06-1.245-14.016-2.582-20.838l-4.232,2.854c-1.398,0.943-2.983,1.394-4.551,1.394c-2.619,0-5.192-1.26-6.768-3.595c-2.517-3.733-1.532-8.8,2.201-11.318l9.031-6.092c-2.068-6.428-4.576-12.694-7.509-18.766l-5.278,4.274c-1.509,1.222-3.323,1.816-5.126,1.816c-2.375,0-4.729-1.033-6.341-3.022c-2.833-3.499-2.294-8.633,1.206-11.467l7.508-6.08c-4.578-7.25-9.813-14.145-15.684-20.61C14.569,75.261,0,110.21,0,148.5c0,38.29,14.569,73.239,38.452,99.602c5.871-6.465,11.106-13.36,15.684-20.61l-7.508-6.08C43.128,218.578,42.589,213.444,45.422,209.945z"/>
    <path d="M258.548,48.898c-5.871,6.465-11.106,13.36-15.684,20.61l7.508,6.08c3.5,2.834,4.039,7.969,1.206,11.467c-1.612,1.989-3.966,3.022-6.341,3.022c-1.803,0-3.617-0.595-5.126-1.816l-5.278-4.274c-2.933,6.072-5.441,12.338-7.509,18.766l9.031,6.092c3.733,2.518,4.718,7.585,2.201,11.318c-1.575,2.335-4.148,3.595-6.768,3.595c-1.569,0-3.153-0.452-4.551-1.394l-4.232-2.854c-1.336,6.821-2.205,13.778-2.582,20.838h8.15c4.503,0,8.153,3.65,8.153,8.153c0,4.503-3.65,8.153-8.153,8.153h-8.15c0.376,7.06,1.245,14.017,2.582,20.838l4.232-2.854c3.733-2.519,8.8-1.532,11.318,2.201c2.517,3.733,1.532,8.8-2.201,11.318l-9.032,6.092c2.068,6.428,4.576,12.694,7.509,18.766l5.278-4.274c3.499-2.83,8.633-2.293,11.467,1.206c2.833,3.499,2.294,8.633-1.206,11.467l-7.508,6.08c4.578,7.25,9.813,14.145,15.684,20.61C282.431,221.739,297,186.79,297,148.5C297,110.21,282.431,75.261,258.548,48.898z"/>
  </svg>
);
const FieldingIcon = () => (
  <svg fill="currentColor" viewBox="0 0 512 512" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
    <path d="M446.741,112.606c-18.348,0-33.276,14.928-33.276,33.276v103.161c0,1.337-1.087,2.424-2.425,2.424h-0.864c-1.337,0-2.424-1.087-2.424-2.424V58.873c0-19.924-16.21-36.134-36.134-36.134c-19.924,0-36.134,16.21-36.134,36.134v190.171c0,1.337-1.087,2.424-2.424,2.424h-1.783c-1.337,0-2.424-1.087-2.424-2.424V36.134C328.853,16.21,312.644,0,292.72,0c-19.924,0-36.134,16.21-36.134,36.134v212.909c0,1.337-1.087,2.424-2.424,2.424c-1.337,0-2.424-1.087-2.424-2.424V58.873c0-19.924-16.21-36.134-36.134-36.134c-19.714,0-35.752,16.038-35.752,35.751v70.02h-35.008v-1.02c0-31.116-25.314-56.43-56.43-56.43c-31.116,0-56.429,25.314-56.429,56.43v156.272c0,60.174,23.227,116.963,65.401,159.906c0.001,0.001,0.002,0.003,0.003,0.004C140.665,487.734,198.493,512,260.222,512h0.001c30.665,0,60.342-6.197,88.205-18.42c26.909-11.804,50.855-28.636,71.177-50.03c38.957-41.013,60.411-94.762,60.411-151.344V145.882C480.017,127.534,465.089,112.606,446.741,112.606z"/>
  </svg>
);
const StrengthIcon = () => (
  <svg fill="currentColor" viewBox="0 0 24 24" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.81 20.38C10.2076 20.3793 9.62953 20.1423 9.2 19.72L4.2 14.72C3.98805 14.5099 3.81982 14.2599 3.70501 13.9844C3.5902 13.7089 3.53109 13.4134 3.53109 13.115C3.53109 12.8166 3.5902 12.5211 3.70501 12.2456C3.81982 11.9701 3.98805 11.7201 4.2 11.51L4.43 11.27C4.85868 10.8462 5.43718 10.6085 6.04 10.6085C6.64281 10.6085 7.22132 10.8462 7.65 11.27L12.65 16.27C12.8619 16.4801 13.0302 16.7301 13.145 17.0056C13.2598 17.2811 13.3189 17.5766 13.3189 17.875C13.3189 18.1734 13.2598 18.4689 13.145 18.7444C13.0302 19.0199 12.8619 19.2699 12.65 19.48L12.42 19.72C11.9905 20.1423 11.4124 20.3793 10.81 20.38Z"/>
    <path d="M17.92 13.37C17.3164 13.3656 16.7385 13.1251 16.31 12.7L11.31 7.7C10.8838 7.2726 10.6444 6.69362 10.6444 6.09C10.6444 5.48639 10.8838 4.9074 11.31 4.48L11.55 4.24C11.977 3.81681 12.5538 3.57938 13.155 3.57938C13.7562 3.57938 14.333 3.81681 14.76 4.24L19.76 9.24C20.1832 9.66699 20.4206 10.2438 20.4206 10.845C20.4206 11.4462 20.1832 12.023 19.76 12.45L19.52 12.69C19.0956 13.1164 18.5215 13.3603 17.92 13.37Z"/>
  </svg>
);

const SPECIALTIES = [
  { name: 'Hitting',  slug: 'hitting',  desc: 'Swing mechanics, exit velocity & plate approach',  icon: <HittingIcon />,  glowColor: 'rgba(79,142,247,0.3)' },
  { name: 'Pitching', slug: 'pitching', desc: 'Velocity, command & pitch design',                 icon: <PitchingIcon />, glowColor: 'rgba(249,115,22,0.3)' },
  { name: 'Fielding', slug: 'fielding', desc: 'Footwork, glove-work & defensive fundamentals',    icon: <FieldingIcon />, glowColor: 'rgba(34,197,94,0.3)' },
  { name: 'Strength', slug: 'strength', desc: 'Power, conditioning & injury prevention',          icon: <StrengthIcon />, glowColor: 'rgba(124,58,237,0.3)' },
];

const TESTIMONIALS = [
  {
    quote: "CoachGo changed how we find instruction. Finding a pitching specialist who actually understands mechanics was a game-changer for my son.",
    name: "Mike D.",
    designation: "Parent of 16U Player",
    src: '/krisbenson.webp',
  },
  {
    quote: "The platform is so easy to use. I found a hitting coach, booked a session, and saw results in my exit velocity within two weeks.",
    name: "Jake R.",
    designation: "High School Player, 16U",
    src: '/shim_new.png',
  },
  {
    quote: "Having a strength specialist who understands the demands of baseball completely changed my offseason. Gained 8 mph on my fastball.",
    name: "Tyler M.",
    designation: "High School Pitcher, 17U",
    src: '/bobbycongalton.jpg',
  },
];

// ─── BENTO STATS ICONS ────────────────────────────────────────────
const CoachIcon = ({ className = 'w-12 h-12' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const SpecialtyIcon = ({ className = 'w-12 h-12' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);
const ShieldIcon = ({ className = 'w-12 h-12' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

// ─── MAIN ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, -80]);
  const [hoveredSpecialty, setHoveredSpecialty] = useState<string | null>(null);
  const prefersReduced = useReducedMotion();
  const heroSectionRef = useRef<HTMLElement>(null);
  // Parallax for aurora orbs — slow drift on scroll
  const orbsY = useTransform(scrollY, [0, 800], [0, prefersReduced ? 0 : 240]);

  return (
    <PageTransition>
      <div className="overflow-hidden" style={{ background: '#080B14' }}>

        {/* ── HERO ── */}
        <section ref={heroSectionRef} className="relative min-h-screen flex flex-col justify-center overflow-hidden aurora-bg">
          {/* Parallax aurora orbs */}
          <motion.div className="absolute inset-0 pointer-events-none" style={{ y: orbsY }}>
            <div className="aurora-orb aurora-orb-1" />
            <div className="aurora-orb aurora-orb-2" />
            <div className="aurora-orb aurora-orb-3" />
            <div className="aurora-orb aurora-orb-4" />
          </motion.div>

          {/* Grid overlay */}
          <div className="absolute inset-0 pointer-events-none z-[1]" style={{
            backgroundImage: `linear-gradient(rgba(79,142,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.03) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />

          <div className="scan-line z-[2]" />
          <HeroCoachCard heroRef={heroSectionRef} />

          <motion.div
            style={prefersReduced ? {} : { opacity: heroOpacity, y: heroY }}
            className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }} className="mb-8"
            >
              <span className="tag-badge">San Diego's Premier Baseball Marketplace</span>
            </motion.div>

            <div className="mb-8 overflow-hidden">
              <h1 className="font-display leading-none tracking-wide" style={{ fontSize: 'clamp(4rem, 11vw, 9.5rem)' }}>
                <span className="block text-white glow-text">
                  <AnimatedLetters text="FIND YOUR" delay={0.1} />
                </span>
                <span className="block">
                  <AnimatedLetters text="EDGE." delay={0.35} gradient />
                </span>
              </h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.65 }}
              className="text-lg md:text-xl max-w-xl leading-relaxed mb-12"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Book sessions with elite San Diego coaches who specialize in exactly the part of your game you want to master.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 mb-20"
            >
              {/* Primary CTA: rotating conic border + ShimmerButton inside */}
              <MagneticButton strength={0.4}>
                <div className="relative">
                  <div
                    className="absolute -inset-[2px] rounded-[14px] overflow-hidden pointer-events-none"
                    style={{ background: 'conic-gradient(from 0deg, #4F8EF7, #7C3AED, #06B6D4, #F59E0B, #4F8EF7)', animation: prefersReduced ? 'none' : 'conic-spin 3s linear infinite' }}
                  />
                  <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                    <ShimmerButton
                      shimmerColor="#4F8EF7"
                      shimmerDuration="2.5s"
                      borderRadius="12px"
                      background="linear-gradient(135deg, #4F8EF7 0%, #2563EB 100%)"
                      className="text-base px-8 py-4 font-bold"
                      onClick={() => window.location.href = '/coaches'}
                    >
                      Browse Coaches <ArrowRight size={18} className="inline ml-1" />
                    </ShimmerButton>
                  </motion.div>
                </div>
              </MagneticButton>
              <MagneticButton strength={0.3}>
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                  <a href="/auth" className="btn-secondary text-base px-8 py-4">Join as a Coach</a>
                </motion.div>
              </MagneticButton>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1.0 }}
              className="grid grid-cols-3 gap-8 max-w-lg"
            >
              {[
                { value: 8,   suffix: '+', label: 'Elite Coaches' },
                { value: 4,   suffix: '',  label: 'Specialties' },
                { value: 100, suffix: '%', label: 'Vetted' },
              ].map(s => (
                <div key={s.label}>
                  <p className="stat-number text-4xl font-display">
                    <AnimatedCounter to={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-xs uppercase tracking-widest font-bold mt-1"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[5]"
            style={{ background: 'linear-gradient(to bottom, transparent, #080B14)' }} />
        </section>

        {/* ── INFINITE MARQUEE (text) ── */}
        <Ticker />

        {/* ── INFINITE COACH STRIP (2 rows opposite directions) ── */}
        <CoachStrip />

        {/* ── FEATURES BENTO ── */}
        <FeaturesBento />

        {/* ── GOOD FIT GUARANTEE ── */}
        <section className="py-20" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ ...SPRING }}
              className="relative rounded-3xl overflow-hidden"
            >
              <GlowingEffect disabled={false} spread={60} borderWidth={2} />
              <div
                className="rounded-3xl p-10 md:p-16 relative overflow-hidden"
                style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(34,197,94,0.06) 0%, transparent 70%)'
                }} />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                  <div className="shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.1 }} transition={SPRING}
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
                    >
                      <CheckCircle2 size={44} style={{ color: '#22c55e' }} />
                    </motion.div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#22c55e' }}>Our Promise</p>
                    <h2 className="font-display text-4xl md:text-5xl text-white mb-4 leading-none">GOOD FIT GUARANTEE</h2>
                    <p className="text-lg leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Not feeling the connection after your first session?{' '}
                      <span className="text-white font-semibold">We'll personally match you with a different coach — no questions asked.</span>{' '}
                      Your development is our only priority.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <MagneticButton strength={0.4}>
                      <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                        <ShimmerButton
                          shimmerColor="#22c55e"
                          background="rgba(34,197,94,0.12)"
                          borderRadius="12px"
                          className="px-8 py-4 font-bold border-green-500/30"
                          onClick={() => window.location.href = '/coaches'}
                        >
                          Find Your Coach <ArrowRight size={18} className="inline ml-1" />
                        </ShimmerButton>
                      </motion.div>
                    </MagneticButton>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SOCIAL PROOF BAR ── */}
        <section className="py-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.2)' }}>Coaches affiliated with</p>
              <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
                <img src="https://www.mlbstatic.com/team-logos/134.svg" alt="Pittsburgh Pirates" className="h-8 w-auto object-contain" />
                <img src="https://www.mlbstatic.com/team-logos/137.svg" alt="San Francisco Giants" className="h-8 w-auto object-contain" />
                <img src="https://www.mlbstatic.com/team-logos/145.svg" alt="Chicago White Sox" className="h-8 w-auto object-contain" />
                <img src="/sdsu.png" alt="SDSU" className="h-8 w-auto object-contain" />
                <img src="/csun.png" alt="CSUN" className="h-8 w-auto object-contain" />
                <img src="/chico.png" alt="Chico State" className="h-8 w-auto object-contain" />
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="#F59E0B" style={{ color: '#F59E0B' }} />)}
                <span className="text-xs font-bold ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>4.9 avg rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BENTO ── */}
        <section className="py-20 relative">
          <ParticleField count={15} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ ...SPRING }}
              className="mb-12 text-center"
            >
              <p className="tag-badge mb-4 inline-block">By The Numbers</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 8, suffix: '+', label: 'Elite Coaches', desc: 'Vetted specialists across San Diego', Icon: CoachIcon, color: '#4F8EF7' },
                { value: 4,   suffix: '',  label: 'Specialties',   desc: 'Hitting · Pitching · Fielding · Strength', Icon: SpecialtyIcon, color: '#7C3AED' },
                { value: 100, suffix: '%', label: 'Vetted',        desc: 'Every coach background-checked & proven', Icon: ShieldIcon, color: '#22c55e' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 40, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ ...SPRING, delay: i * 0.1 }}
                  className="relative rounded-2xl"
                >
                  <GlowingEffect disabled={false} spread={40} borderWidth={2} proximity={64} />
                  <motion.div
                    className="rounded-2xl p-8 relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    whileHover={{ y: -4, boxShadow: `0 20px 60px ${stat.color}22` }}
                    transition={SPRING}
                  >
                    {/* Shimmer sweep */}
                    <motion.div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
                        backgroundSize: '200% 100%',
                      }}
                      animate={prefersReduced ? {} : { backgroundPosition: ['200% 0%', '-100% 0%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: i * 0.4 }}
                    />
                    <div className="relative" style={{ color: stat.color, opacity: 0.7 }}>
                      <stat.Icon className="w-10 h-10" />
                    </div>
                    <p className="relative font-display text-5xl mt-4 mb-1" style={{ color: stat.color }}>
                      <AnimatedCounter to={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="relative font-bold text-white text-lg">{stat.label}</p>
                    <p className="relative text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.desc}</p>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SPECIALTIES ── */}
        <section className="py-32 relative mesh-bg">
          <ParticleField count={25} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ ...SPRING }}
              className="mb-20"
            >
              <p className="tag-badge mb-6 inline-block">Disciplines</p>
              <h2 className="font-display text-6xl md:text-8xl text-white leading-none">
                MASTER EVERY<br />
                <span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.25)', color: 'transparent' }}>DISCIPLINE</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SPECIALTIES.map((spec, i) => (
                <motion.div
                  key={spec.slug}
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ ...SPRING, delay: i * 0.1 }}
                  className="relative rounded-2xl"
                  onHoverStart={() => setHoveredSpecialty(spec.slug)}
                  onHoverEnd={() => setHoveredSpecialty(null)}
                >
                  <GlowingEffect disabled={false} spread={50} borderWidth={2} proximity={80} />
                  <motion.div
                    className="specialty-card rounded-2xl p-8 cursor-pointer relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    whileHover={prefersReduced ? {} : { y: -8, boxShadow: `0 30px 80px ${spec.glowColor}` }}
                    transition={SPRING}
                  >
                    <div className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `radial-gradient(ellipse at 20% 50%, ${spec.glowColor.replace('0.3', '0.08')} 0%, transparent 60%)`,
                        opacity: hoveredSpecialty === spec.slug ? 1 : 0
                      }}
                    />
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>{spec.icon}</div>
                        <h3 className="font-display text-4xl text-white mb-3">{spec.name.toUpperCase()}</h3>
                        <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>{spec.desc}</p>
                        <a href={`/coaches?specialty=${spec.slug}`}
                          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest animated-underline"
                          style={{ color: '#4F8EF7' }}>
                          Browse Coaches <ChevronRight size={14} />
                        </a>
                      </div>
                      <motion.div
                        animate={{ x: hoveredSpecialty === spec.slug ? 0 : 20, opacity: hoveredSpecialty === spec.slug ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-6xl font-display opacity-10 select-none ml-4" style={{ color: '#4F8EF7' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="process" className="py-24 relative overflow-hidden scroll-mt-20">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(79,142,247,0.04) 0%, transparent 70%)'
          }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ ...SPRING }}
              className="text-center mb-16"
            >
              <p className="tag-badge mb-6 inline-block">Process</p>
              <h2 className="font-display text-5xl md:text-7xl text-white leading-none">
                THREE STEPS TO<br />
                <span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.25)', color: 'transparent' }}>NEXT LEVEL</span>
              </h2>
            </motion.div>
            <div className="relative">
              <div className="absolute top-12 left-0 right-0 h-px hidden md:block"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(79,142,247,0.3), transparent)' }} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { num: '01', title: 'Choose Your Specialty', desc: 'Select the specific area of your game you want to master — hitting, pitching, fielding, or strength.' },
                  { num: '02', title: 'Browse Elite Coaches', desc: 'View detailed profiles, credentials, and real reviews from players who\'ve trained with each coach.' },
                  { num: '03', title: 'Book & Elevate', desc: 'Schedule your session in minutes and start your transformation with an elite San Diego specialist.' },
                ].map((step, i) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ ...SPRING, delay: i * 0.15 }}
                    className="text-center relative"
                  >
                    <div className="relative inline-block mb-6">
                      <div className="w-24 h-24 rounded-full flex items-center justify-center relative"
                        style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)' }}>
                        <span className="font-display text-4xl" style={{ color: '#4F8EF7' }}>{step.num}</span>
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
                          className="absolute inset-0 rounded-full"
                          style={{ border: '1px solid rgba(79,142,247,0.3)' }}
                        />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURED COACHES ── */}
        <section className="py-32" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ ...SPRING }}
              className="flex flex-col md:flex-row justify-between items-end mb-16"
            >
              <div>
                <p className="tag-badge mb-6 inline-block">Featured</p>
                <h2 className="font-display text-6xl md:text-7xl text-white leading-none">
                  ELITE<br />
                  <span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.25)', color: 'transparent' }}>COACHES</span>
                </h2>
              </div>
              <MagneticButton strength={0.3}>
                <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                  <a href="/coaches" className="btn-secondary mt-8 md:mt-0 flex items-center gap-2">
                    View All 8 Coaches <ArrowRight size={16} />
                  </a>
                </motion.div>
              </MagneticButton>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              {FEATURED_COACHES.map((coach) => (
                <motion.div
                  key={coach.id}
                  variants={{
                    hidden:   { opacity: 0, y: 40, scale: 0.92 },
                    visible:  { opacity: 1, y: 0,  scale: 1, transition: { ...SPRING } },
                  }}
                >
                  <CoachCard coach={coach} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="py-24 relative overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(124,58,237,0.06) 0%, transparent 70%)'
          }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ ...SPRING }}
              className="text-center mb-8"
            >
              <p className="tag-badge mb-6 inline-block">Testimonials</p>
              <h2 className="font-display text-6xl md:text-7xl text-white leading-none">
                REAL RESULTS.<br />
                <span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.25)', color: 'transparent' }}>REAL PLAYERS.</span>
              </h2>
            </motion.div>
            <AnimatedTestimonials testimonials={TESTIMONIALS} autoplay={true} className="text-white" />
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-40 relative overflow-hidden">
          {/* Layered pulsing glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(79,142,247,0.18) 0%, transparent 70%)'
            }}
            animate={prefersReduced ? {} : { opacity: [0.55, 1, 0.55], scale: [1, 1.06, 1] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(124,58,237,0.15) 0%, transparent 70%)'
            }}
            animate={prefersReduced ? {} : { opacity: [0.7, 0.3, 0.7], scale: [1.05, 0.95, 1.05] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          />
          {/* Conic-spin aura ring around the CTA bowl */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: 'min(90vw, 900px)',
              height: 'min(90vw, 900px)',
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, rgba(79,142,247,0.18), rgba(124,58,237,0.20), rgba(6,182,212,0.18), rgba(245,158,11,0.12), rgba(79,142,247,0.18))',
              filter: 'blur(80px)',
              opacity: 0.35,
              animation: prefersReduced ? 'none' : 'conic-spin 18s linear infinite',
            }}
          />
          {/* Floating drift particles */}
          {!prefersReduced && Array.from({ length: 10 }).map((_, i) => {
            const left = ((i * 9.5) + 8) % 92;
            const size = 3 + (i % 3);
            const duration = 8 + (i % 5) * 1.5;
            const delay = -(i * 0.9);
            const xDrift = i % 2 === 0 ? 16 : -14;
            return (
              <motion.span
                key={i}
                aria-hidden
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: `${left}%`,
                  bottom: '-10%',
                  width: size,
                  height: size,
                  background: i % 3 === 0 ? '#7C3AED' : (i % 3 === 1 ? '#06B6D4' : '#4F8EF7'),
                  boxShadow: '0 0 8px currentColor',
                  color: i % 3 === 0 ? '#7C3AED' : (i % 3 === 1 ? '#06B6D4' : '#4F8EF7'),
                  willChange: 'transform, opacity',
                }}
                animate={{ y: ['0%', '-110vh'], x: [0, xDrift, -xDrift, 0], opacity: [0, 0.8, 0.6, 0] }}
                transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
              />
            );
          })}
          <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ ...SPRING }}
            >
              <p className="tag-badge mb-8 inline-block">Get Started</p>
              <h2
                className="font-display leading-none gradient-headline mb-6"
                style={{ fontSize: 'clamp(3rem, 10vw, 8rem)' }}
              >
                READY TO FIND<br />YOUR EDGE?
              </h2>
              <p className="text-lg mb-12 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Join hundreds of San Diego players already training with the best specialists in the game.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <MagneticButton strength={0.45}>
                  <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                    <ShimmerButton
                      shimmerColor="#4F8EF7"
                      shimmerDuration="2.5s"
                      borderRadius="12px"
                      background="linear-gradient(135deg, #4F8EF7 0%, #2563EB 100%)"
                      className="text-lg px-10 py-5 font-bold"
                      onClick={() => window.location.href = '/coaches'}
                    >
                      Find a Coach <ArrowRight size={20} className="inline ml-1" />
                    </ShimmerButton>
                  </motion.div>
                </MagneticButton>
                <MagneticButton strength={0.35}>
                  <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                    <a href="/auth" className="btn-secondary text-lg px-10 py-5">Join as a Coach</a>
                  </motion.div>
                </MagneticButton>
              </div>
            </motion.div>
          </div>
        </section>

      </div>
    </PageTransition>
  );
}
