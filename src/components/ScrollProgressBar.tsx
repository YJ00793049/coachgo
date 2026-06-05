import { motion, useScroll, useSpring } from 'framer-motion';

export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[9998] origin-left"
      style={{
        height: 2,
        scaleX,
        background: 'rgba(27,24,19,0.55)',
        transformOrigin: '0%',
        willChange: 'transform',
      }}
    />
  );
}
