import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

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
  const started = useRef(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!isInView || started.current) return;
    started.current = true;
    if (prefersReduced) { setCount(to); return; }
    let startTime = 0;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * to));
      if (progress < 1) requestAnimationFrame(animate);
      else setCount(to);
    };
    requestAnimationFrame(animate);
  }, [isInView, to, duration, prefersReduced]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}
