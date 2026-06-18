// Transactional email helpers. Each posts a structured { type, to, data }
// payload to the Firebase Cloud Function at /api/send-email, which renders the
// branded template server-side and sends via Resend.
// (Hosting rewrites /api/send-email → the `sendEmail` Cloud Function.)

async function post(type: string, to: string, data: Record<string, any>) {
  if (!to) return;
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, data }),
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

// Player sends a connection request → email to the COACH with the player's
// contact info so the coach can reach out directly.
export async function notifyCoachConnectionRequest({
  coachEmail, coachName, playerName, playerNote, playerPhone, playerEmail,
}: {
  coachEmail: string; coachName: string; playerName: string;
  playerNote?: string; playerPhone?: string | null; playerEmail?: string | null;
}) {
  await post('connect_request_coach', coachEmail, {
    coachName, playerName, playerNote, playerPhone, playerEmail,
  });
}

// Player sends a connection request → confirmation email back to the PLAYER.
export async function notifyPlayerConnectionSent({
  playerEmail, playerName, coachName,
}: {
  playerEmail: string; playerName: string; coachName: string;
}) {
  await post('connect_request_player', playerEmail, {
    playerName, coachName,
  });
}
