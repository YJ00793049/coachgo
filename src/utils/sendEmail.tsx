async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

export async function notifyCoachNewBooking({
  coachEmail, coachName, playerName, sessionType, date, timeSlot, totalPrice,
}: {
  coachEmail: string; coachName: string; playerName: string;
  sessionType: string; date: string; timeSlot: string; totalPrice: number;
}) {
  await sendEmail(
    coachEmail,
    `New Booking Request — ${playerName}`,
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0F1E;color:#F0F4FF;padding:40px;border-radius:16px;">
      <div style="background:linear-gradient(135deg,#4F8EF7,#2563EB);padding:24px;border-radius:12px;margin-bottom:32px;">
        <h1 style="margin:0;font-size:24px;font-weight:800;">New Booking Request</h1>
        <p style="margin:8px 0 0;opacity:0.8;">Someone wants to train with you</p>
      </div>
      <p style="font-size:16px;margin-bottom:24px;">Hi <strong>${coachName}</strong>, you have a new booking request on CoachGo.</p>
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Player</td><td style="padding:8px 0;font-weight:700;text-align:right;">${playerName}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Session Type</td><td style="padding:8px 0;font-weight:700;text-align:right;">${sessionType}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Date</td><td style="padding:8px 0;font-weight:700;text-align:right;">${date}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Time</td><td style="padding:8px 0;font-weight:700;text-align:right;">${timeSlot}</td></tr>
          <tr style="border-top:1px solid rgba(255,255,255,0.08);">
            <td style="padding:12px 0 0;font-weight:700;">Total</td>
            <td style="padding:12px 0 0;font-weight:800;font-size:20px;color:#4F8EF7;text-align:right;">$${totalPrice}</td>
          </tr>
        </table>
      </div>
      <p style="font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:24px;">Log in to your CoachGo dashboard to accept or decline this booking.</p>
      <a href="https://coachgonline.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#4F8EF7,#2563EB);color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">View Booking →</a>
      <p style="margin-top:40px;font-size:12px;color:rgba(255,255,255,0.25);">CoachGo · San Diego's Premier Baseball Coaching Marketplace</p>
    </div>
    `
  );
}

export async function notifyPlayerBookingConfirmed({
  playerEmail, playerName, coachName, sessionType, date, timeSlot, totalPrice,
}: {
  playerEmail: string; playerName: string; coachName: string;
  sessionType: string; date: string; timeSlot: string; totalPrice: number;
}) {
  await sendEmail(
    playerEmail,
    `✅ Your session with ${coachName} is confirmed!`,
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0F1E;color:#F0F4FF;padding:40px;border-radius:16px;">
      <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:24px;border-radius:12px;margin-bottom:32px;">
        <h1 style="margin:0;font-size:24px;font-weight:800;">Session Confirmed! 🎉</h1>
        <p style="margin:8px 0 0;opacity:0.8;">Your coach has accepted your booking</p>
      </div>
      <p style="font-size:16px;margin-bottom:24px;">Hi <strong>${playerName}</strong>, great news — <strong>${coachName}</strong> has confirmed your session.</p>
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Coach</td><td style="padding:8px 0;font-weight:700;text-align:right;">${coachName}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Session Type</td><td style="padding:8px 0;font-weight:700;text-align:right;">${sessionType}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Date</td><td style="padding:8px 0;font-weight:700;text-align:right;">${date}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Time</td><td style="padding:8px 0;font-weight:700;text-align:right;">${timeSlot}</td></tr>
          <tr style="border-top:1px solid rgba(255,255,255,0.08);">
            <td style="padding:12px 0 0;font-weight:700;">Total</td>
            <td style="padding:12px 0 0;font-weight:800;font-size:20px;color:#22c55e;text-align:right;">$${totalPrice}</td>
          </tr>
        </table>
      </div>
      <a href="https://coachgonline.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#4F8EF7,#2563EB);color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">View in Dashboard →</a>
      <p style="margin-top:40px;font-size:12px;color:rgba(255,255,255,0.25);">CoachGo · San Diego's Premier Baseball Coaching Marketplace</p>
    </div>
    `
  );
}

export async function notifySessionReminder({
  email, name, coachName, sessionType, date, timeSlot, isCoach,
}: {
  email: string; name: string; coachName: string;
  sessionType: string; date: string; timeSlot: string; isCoach: boolean;
}) {
  const subject = isCoach
    ? `Reminder: Session with a player tomorrow — ${date}`
    : `Reminder: Your session with ${coachName} is tomorrow`;
  await sendEmail(email, subject, `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0F1E;color:#F0F4FF;padding:40px;border-radius:16px;">
      <div style="background:linear-gradient(135deg,#4F8EF7,#2563EB);padding:24px;border-radius:12px;margin-bottom:32px;">
        <h1 style="margin:0;font-size:24px;font-weight:800;">Session Tomorrow ⏰</h1>
        <p style="margin:8px 0 0;opacity:0.8;">Don't forget — you have a session coming up</p>
      </div>
      <p style="font-size:16px;margin-bottom:24px;">Hi <strong>${name}</strong>, just a reminder about your upcoming session.</p>
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          ${!isCoach ? `<tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Coach</td><td style="padding:8px 0;font-weight:700;text-align:right;">${coachName}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Session</td><td style="padding:8px 0;font-weight:700;text-align:right;">${sessionType}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Date</td><td style="padding:8px 0;font-weight:700;text-align:right;">${date}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Time</td><td style="padding:8px 0;font-weight:700;text-align:right;">${timeSlot}</td></tr>
        </table>
      </div>
      <a href="https://coachgonline.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#4F8EF7,#2563EB);color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">View Dashboard →</a>
      <p style="margin-top:40px;font-size:12px;color:rgba(255,255,255,0.25);">CoachGo · San Diego's Premier Baseball Coaching Marketplace</p>
    </div>
  `);
}

export async function notifyCoachBookingCancelled({
  coachEmail, coachName, playerName, sessionType, date,
}: {
  coachEmail: string; coachName: string; playerName: string;
  sessionType: string; date: string;
}) {
  await sendEmail(
    coachEmail,
    `${playerName} cancelled their ${sessionType} session`,
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0F1E;color:#F0F4FF;padding:40px;border-radius:16px;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;">Booking Cancelled</h1>
      <p style="color:rgba(255,255,255,0.6);margin-bottom:24px;">Hi <strong>${coachName}</strong>, <strong>${playerName}</strong> has cancelled their <strong>${sessionType}</strong> session on <strong>${date}</strong>.</p>
      <a href="https://coachgonline.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#4F8EF7,#2563EB);color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">View Dashboard →</a>
      <p style="margin-top:40px;font-size:12px;color:rgba(255,255,255,0.25);">CoachGo · San Diego's Premier Baseball Coaching Marketplace</p>
    </div>
    `
  );
}

export async function notifyPlayerBookingDeclined({
  playerEmail, playerName, coachName, sessionType, date,
}: {
  playerEmail: string; playerName: string; coachName: string;
  sessionType: string; date: string;
}) {
  await sendEmail(
    playerEmail,
    `Your booking with ${coachName} was declined`,
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0F1E;color:#F0F4FF;padding:40px;border-radius:16px;">
      <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);padding:24px;border-radius:12px;margin-bottom:32px;">
        <h1 style="margin:0;font-size:24px;font-weight:800;">Booking Declined</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);">Don't worry — find another great coach</p>
      </div>
      <p style="font-size:16px;margin-bottom:24px;">Hi <strong>${playerName}</strong>, unfortunately <strong>${coachName}</strong> wasn't able to accept your ${sessionType} session on ${date}.</p>
      <p style="font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:24px;">Head back to CoachGo to find another specialist that fits your schedule.</p>
      <a href="https://coachgonline.com/coaches" style="display:inline-block;background:linear-gradient(135deg,#4F8EF7,#2563EB);color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">Browse Other Coaches →</a>
      <p style="margin-top:40px;font-size:12px;color:rgba(255,255,255,0.25);">CoachGo · San Diego's Premier Baseball Coaching Marketplace</p>
    </div>
    `
  );
}
