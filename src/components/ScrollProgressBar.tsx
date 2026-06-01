import { motion, useScroll, useSpring } from 'framer-motion';

export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[9998] origin-left"
      style={{
        height: 2,
        scaleX,
        background: 'linear-gradient(90deg, #4F8EF7 0%, #7C3AED 50%, #06B6D4 100%)',
        transformOrigin: '0%',
        boxShadow: '0 0 12px rgba(79,142,247,0.6)',
        willChange: 'transform',
      }}
    />
  );
}
