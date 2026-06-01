import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';
import { SPRING } from '../tokens';

export default function PageTransition({ children }: { children: ReactNode }) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReduced ? 0 : 30, scale: prefersReduced ? 1 : 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: prefersReduced ? { duration: 0.15 } : { ...SPRING } }}
      exit={{ opacity: 0, y: prefersReduced ? 0 : -20, scale: prefersReduced ? 1 : 0.98, transition: { duration: 0.2 } }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </motion.div>
  );
}
