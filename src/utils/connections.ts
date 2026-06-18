// ─── Connection requests ────────────────────────────────────────────────────
// A player asks a coach to connect and shares their contact info; the coach
// reaches out directly. This writes the request, pings the coach in-app, and
// fires the two warm CoachGo emails (to the coach, and a confirmation to the
// player). Replaces the old booking flow entirely.

import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { notify } from './notifications';
import { notifyCoachConnectionRequest, notifyPlayerConnectionSent } from './sendEmail';

export interface SendConnectionParams {
  player_id: string;
  player_name: string;
  player_account_email?: string | null; // player's login email — for the confirmation
  coach_id: string;          // numeric MOCK id
  coach_user_id: string;     // coach Firebase uid
  coach_name: string;
  player_phone?: string;     // contact the coach should use
  player_email?: string;     // contact the coach should use
  player_note?: string;
}

export async function sendConnectionRequest(p: SendConnectionParams): Promise<string> {
  const phone = (p.player_phone || '').trim();
  const email = (p.player_email || '').trim();
  const note = (p.player_note || '').trim();

  // 1. Persist the request.
  const ref = await addDoc(collection(db, 'connections'), {
    player_id: p.player_id,
    player_name: p.player_name,
    coach_id: p.coach_id,
    coach_user_id: p.coach_user_id,
    coach_name: p.coach_name,
    player_phone: phone || null,
    player_email: email || null,
    player_note: note,
    status: 'pending',
    created_at: serverTimestamp(),
  });

  // 2. In-app nudge for the coach (fire-and-forget).
  notify(p.coach_user_id, {
    type: 'connection_request',
    title: `${p.player_name} wants to connect`,
    body: note || 'Tap to see their contact info and reach out.',
    link: '/dashboard',
  });

  // 3. Emails (best-effort; never block the UI).
  try {
    const coachSnap = await getDoc(doc(db, 'users', p.coach_user_id));
    const coachEmail = coachSnap.exists() ? (coachSnap.data() as any).email : '';
    if (coachEmail) {
      await notifyCoachConnectionRequest({
        coachEmail,
        coachName: p.coach_name,
        playerName: p.player_name,
        playerNote: note,
        playerPhone: phone || null,
        playerEmail: email || null,
      });
    }
  } catch (err) {
    console.error('Coach connection email failed:', err);
  }

  if (p.player_account_email) {
    await notifyPlayerConnectionSent({
      playerEmail: p.player_account_email,
      playerName: p.player_name,
      coachName: p.coach_name,
    });
  }

  return ref.id;
}
