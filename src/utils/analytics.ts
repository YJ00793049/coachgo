// ─── Product analytics (provider-agnostic) ──────────────────────────────────
// One thin entry point so funnel events live in one place. Forwards to Firebase
// Analytics when available, and to Mixpanel/Amplitude if their snippets are on
// window (seam — no SDK dependency added here).

import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebase';

export type FunnelEvent =
  | 'coach_view'        // player opened a coach profile
  | 'connect_started'   // opened the connect modal
  | 'connect_sent'      // submitted a connection request
  | 'ai_match_run'      // ran AI coach matching
  | 'search_saved';     // saved a search

export function track(event: FunnelEvent | string, props: Record<string, any> = {}) {
  try { if (analytics) logEvent(analytics as any, event, props); } catch { /* ignore */ }
  // Mixpanel / Amplitude seam — active only if their global is present.
  const w = window as any;
  try { w.mixpanel?.track?.(event, props); } catch { /* ignore */ }
  try { w.amplitude?.track?.(event, props); } catch { /* ignore */ }
  if (import.meta.env.DEV) console.debug('[track]', event, props);
}
