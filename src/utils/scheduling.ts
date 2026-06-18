// ─── Coach location helpers ─────────────────────────────────────────────────
// Pure display utilities describing WHERE a coach trains (in person / travels /
// virtual). Informational only — shared by CoachesPage, CoachProfilePage and
// DashboardPage. (Booking / slot / calendar math was removed in the connect pivot.)

import type { LocationMode, LocationModes } from '../types';

export const LOCATION_MODE_META: Record<LocationMode, { label: string; short: string }> = {
  facility: { label: 'At the facility', short: 'In person' },
  travel:   { label: 'Coach travels to you', short: 'They travel' },
  virtual:  { label: 'Virtual session', short: 'Virtual' },
};

export function enabledLocationModes(modes?: LocationModes): LocationMode[] {
  if (!modes) return ['facility'];
  const out = (['facility', 'travel', 'virtual'] as LocationMode[]).filter(m => modes[m]);
  return out.length > 0 ? out : ['facility'];
}
