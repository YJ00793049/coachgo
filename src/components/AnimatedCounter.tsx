import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion, motion } from 'framer-motion';

interface Props {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

export default function AnimatedCounter({ to, suffix = '', prefix = '', duration = 1500 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!isInView || started.current) return;
    started.current = true;
    if (prefersReduced) { setCount(to); setDone(true); return; }
    let startTime = 0;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * to));
      if (progress < 1) requestAnimationFrame(animate);
      else { setCount(to); setDone(true); }
    };
    requestAnimationFrame(animate);
  }, [isInView, to, duration, prefersReduced]);

  return (
    <motion.span
      ref={ref}
      className="inline-block"
      animate={done && !prefersReduced ? { scale: [1, 1.12, 1] } : {}}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: 'left center' }}
    >
      {prefix}{count}{suffix}
    </motion.span>
  );
}
