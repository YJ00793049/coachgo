// ─── Session offerings (informational only) ─────────────────────────────────
// Coaches no longer get "booked" — these are simple labels shown on cards and
// profiles describing what a coach offers.

import type { SessionOffering } from '../types';

export const OFFERING_LABEL: Record<SessionOffering, string> = {
  '1-on-1': '1-on-1',
  'group': 'Group',
};

export const ALL_OFFERINGS: SessionOffering[] = ['1-on-1', 'group'];

/** Display labels for a coach's offerings, defaulting to 1-on-1 when unset. */
export function offeringLabels(offerings?: SessionOffering[]): string[] {
  const list = offerings && offerings.length ? offerings : (['1-on-1'] as SessionOffering[]);
  return list.map(o => OFFERING_LABEL[o] || o);
}
