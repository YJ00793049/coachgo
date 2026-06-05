// ─── CoachGo · "Editorial Calm" design tokens ──────────────────────────────
// Warm off-white paper, elegant serif display, soft muted gradient accents.
// Inspired by a calm, premium editorial aesthetic.

export const colors = {
  // Surfaces & ink
  paper:      '#F6F4EF', // page background (warm off-white)
  paperWarm:  '#F0EBE2', // alternating sections
  card:       '#FBFAF6', // raised cream cards
  ink:        '#1B1813', // primary text (warm near-black)
  inkSoft:    '#6E665A', // secondary text (warm taupe)
  inkFaint:   '#9C9485', // tertiary / captions
  line:       'rgba(27,24,19,0.10)', // hairline borders
  lineStrong: 'rgba(27,24,19,0.16)',
  black:      '#16130E', // pill buttons / footer
  white:      '#FFFFFF',

  // Soft gradient-mesh accents (calm, low saturation)
  sage:  '#B9CBA6', // green
  peach: '#E8C49B', // warm orange
  sky:   '#ADC5D7', // blue
  clay:  '#DBA784', // terracotta / baseball dirt
  seam:  '#BC5A48', // muted brick — baseball stitching only

  // Functional status (muted to fit the palette; semantics unchanged)
  confirmed: '#5E8C5A',
  declined:  '#BC5A48',
  pending:   '#7C95AD',
  completed: '#8A7BA8',
  reschedule:'#C79A57',
  venmo:     '#008CFF', // Venmo brand — used only on Venmo CTA
} as const;

// Specialty accent mapping (soft)
export const specialtyColor: Record<string, string> = {
  hitting:  colors.clay,
  pitching: colors.sky,
  fielding: colors.sage,
  strength: colors.peach,
};

// ─── Springs — calm & elegant ──────────────────────────────────────────────
// Default spring — smooth, gentle settle (used app-wide).
export const SPRING = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 30,
};

// Slow spring — large layout shifts / drifts.
export const SPRING_SLOW = {
  type: 'spring' as const,
  stiffness: 160,
  damping: 26,
};

// Bouncy spring — restrained overshoot for small delight moments.
export const SPRING_BOUNCY = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 24,
};

// Legacy alias (older code refers to SPRING_SOFT)
export const SPRING_SOFT = SPRING_SLOW;

// Standard eased transition (transform/opacity).
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
