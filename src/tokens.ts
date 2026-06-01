export const colors = {
  deepSpace:     '#080B14',
  midnightNavy:  '#0A0F1E',
  electricBlue:  '#4F8EF7',
  neonCobalt:    '#2563EB',
  plasmaPurple:  '#7C3AED',
  auroraTeal:    '#06B6D4',
  goldAccent:    '#F59E0B',
  pureWhite:     '#FFFFFF',
} as const;

// Default spring — tight & responsive
export const SPRING = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

// Slow spring — used on large layout shifts
export const SPRING_SLOW = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 25,
};

// Bouncy spring — overshoots then settles; for delight moments
export const SPRING_BOUNCY = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 20,
};

// Legacy alias (older code refers to SPRING_SOFT)
export const SPRING_SOFT = SPRING_SLOW;
