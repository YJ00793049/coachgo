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

// Player submits a booking → email to the COACH (accept/decline).
export async function notifyCoachNewBooking({
  coachEmail, coachName, playerName, sessionType, date, timeSlot, totalPrice,
  skillLevel, notes, duration,
}: {
  coachEmail: string; coachName: string; playerName: string;
  sessionType: string; date: string; timeSlot: string; totalPrice: number;
  skillLevel?: string; notes?: string; duration?: string;
}) {
  await post('coach_new_booking', coachEmail, {
    coachName, playerName, sessionType, date, timeSlot, totalPrice,
    skillLevel, notes, duration,
  });
}

// Player submits a booking → confirmation that the request was SENT (pending flow).
export async function notifyPlayerBookingRequested({
  playerEmail, playerName, coachName, sessionType, date, timeSlot,
}: {
  playerEmail: string; playerName: string; coachName: string;
  sessionType: string; date: string; timeSlot: string;
}) {
  await post('player_booking_requested', playerEmail, {
    playerName, coachName, sessionType, date, timeSlot,
  });
}

// Coach accepts → email to the PLAYER (with Venmo instructions).
export async function notifyPlayerBookingConfirmed({
  playerEmail, playerName, coachName, sessionType, date, timeSlot, totalPrice, venmoHandle,
}: {
  playerEmail: string; playerName: string; coachName: string;
  sessionType: string; date: string; timeSlot: string; totalPrice: number; venmoHandle?: string;
}) {
  await post('player_booking_confirmed', playerEmail, {
    playerName, coachName, sessionType, date, timeSlot, totalPrice, venmoHandle,
  });
}

// Coach declines → email to the PLAYER.
export async function notifyPlayerBookingDeclined({
  playerEmail, playerName, coachName, sessionType, date,
}: {
  playerEmail: string; playerName: string; coachName: string;
  sessionType: string; date: string;
}) {
  await post('player_booking_declined', playerEmail, {
    playerName, coachName, sessionType, date,
  });
}

// Player cancels → email to the COACH.
export async function notifyCoachBookingCancelled({
  coachEmail, coachName, playerName, sessionType, date,
}: {
  coachEmail: string; coachName: string; playerName: string;
  sessionType: string; date: string;
}) {
  await post('player_booking_cancelled_to_coach', coachEmail, {
    coachName, playerName, sessionType, date,
  });
}

// 24h reminder → player or coach.
export async function notifySessionReminder({
  email, name, coachName, sessionType, date, timeSlot, isCoach,
}: {
  email: string; name: string; coachName: string;
  sessionType: string; date: string; timeSlot: string; isCoach: boolean;
}) {
  await post('session_reminder', email, {
    name, coachName, sessionType, date, timeSlot, isCoach,
  });
}
