import { motion, useReducedMotion } from 'framer-motion';

// Faint warm film grain over the whole page. Drifts via GPU transform (not
// background-position) so it never triggers full-screen repaints.
export default function GrainOverlay() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="fixed pointer-events-none z-[9999] grain-light"
      style={{ inset: '-12%', opacity: 0.03, mixBlendMode: 'multiply', willChange: 'transform' }}
      animate={reduce ? undefined : { x: [0, 16, -8, 0], y: [0, -10, 8, 0] }}
      transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
