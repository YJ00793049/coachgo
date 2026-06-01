import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

type Variant = 'default' | 'pointer' | 'card';

export default function CursorGlow() {
  const prefersReduced = useReducedMotion();

  const dotX = useMotionValue(-40);
  const dotY = useMotionValue(-40);
  const ringX = useMotionValue(-40);
  const ringY = useMotionValue(-40);

  // Dot: tight spring — sticks to cursor
  const dotSpringX = useSpring(dotX, { stiffness: 800, damping: 40 });
  const dotSpringY = useSpring(dotY, { stiffness: 800, damping: 40 });
  // Ring: lazy spring — elastic trail
  const ringSpringX = useSpring(ringX, { stiffness: 150, damping: 20 });
  const ringSpringY = useSpring(ringY, { stiffness: 150, damping: 20 });

  const [variant, setVariant] = useState<Variant>('default');
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prefersReduced) {
      document.documentElement.style.cursor = '';
      return;
    }
    // Detect coarse pointer (touch) — bail
    if (window.matchMedia('(hover: none)').matches) {
      document.documentElement.style.cursor = '';
      return;
    }
    document.documentElement.style.cursor = 'none';

    const onMove = (e: MouseEvent) => {
      dotX.set(e.clientX);
      dotY.set(e.clientY);
      ringX.set(e.clientX);
      ringY.set(e.clientY);
      if (!visible) setVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const pointerEl = target.closest('button, a[href], [role="button"], [data-cursor="pointer"], input, textarea, select, label');
      const cardEl = target.closest('[data-cursor="card"]');

      if (pointerEl) setVariant('pointer');
      else if (cardEl) setVariant('card');
      else setVariant('default');
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setVisible(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      document.documentElement.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [dotX, dotY, ringX, ringY, prefersReduced, visible]);

  if (prefersReduced) return null;
  // Hide on touch devices
  if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return null;

  const dotScale = pressed ? 0.7 : (variant === 'pointer' ? 0 : 1);

  const ring = (() => {
    if (variant === 'pointer') return { width: 56, height: 56, borderRadius: 28, scale: pressed ? 0.85 : 1, background: 'rgba(79,142,247,0.10)', borderColor: 'rgba(79,142,247,0.6)' };
    if (variant === 'card')    return { width: 72, height: 72, borderRadius: 18, scale: pressed ? 0.92 : 1, background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.55)' };
    return { width: 36, height: 36, borderRadius: 18, scale: pressed ? 0.75 : 1, background: 'transparent', borderColor: 'rgba(79,142,247,0.5)' };
  })();

  return (
    <>
      {/* Outer ring (lags) */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[9997] hidden md:block"
        style={{
          x: ringSpringX,
          y: ringSpringY,
          translateX: '-50%',
          translateY: '-50%',
          width: ring.width,
          height: ring.height,
          borderRadius: ring.borderRadius,
          border: `1.5px solid ${ring.borderColor}`,
          background: ring.background,
          opacity: visible ? 1 : 0,
          willChange: 'transform',
          mixBlendMode: 'screen',
          transition: 'width 0.18s ease, height 0.18s ease, border-radius 0.2s ease, border-color 0.18s, background 0.18s, opacity 0.2s',
        }}
        animate={{ scale: ring.scale }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      />
      {/* Inner dot (tight) */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[9998] hidden md:block"
        style={{
          x: dotSpringX,
          y: dotSpringY,
          translateX: '-50%',
          translateY: '-50%',
          width: 8,
          height: 8,
          borderRadius: 4,
          background: '#4F8EF7',
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 12px rgba(79,142,247,0.7)',
          willChange: 'transform',
        }}
        animate={{ scale: dotScale }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      />
    </>
  );
}
