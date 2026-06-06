// ─── In-app notifications ───────────────────────────────────────────────────
// Writes a notification doc for a recipient. Fire-and-forget; never throws.

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationType =
  | 'booking_request' | 'booking_confirmed' | 'booking_declined'
  | 'reschedule_request' | 'reschedule_resolved'
  | 'waitlist' | 'review' | 'info';

export async function notify(
  userId: string | undefined | null,
  data: { type?: NotificationType; title: string; body?: string; link?: string },
) {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      user_id: userId,
      type: data.type || 'info',
      title: data.title,
      body: data.body || '',
      link: data.link || null,
      read: false,
      created_at: serverTimestamp(),
    });
  } catch {
    /* non-critical */
  }
}
