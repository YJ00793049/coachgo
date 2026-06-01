import * as functions from 'firebase-functions';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'CoachGo <noreply@coachgonline.com>';

async function sendViaResend(payload: object): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

// POST /api/send-email — transactional booking notifications
export const sendEmail = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    res.status(400).json({ success: false, error: 'Missing fields: to, subject, html' });
    return;
  }

  try {
    const { ok, data } = await sendViaResend({ from: FROM_ADDRESS, to, subject, html });
    if (!ok) { res.status(500).json({ success: false, error: data }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('sendEmail error:', err);
    res.status(500).json({ success: false, error: 'Email send failed' });
  }
});

// POST /api/contact — contact form submissions
export const contact = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    res.status(400).json({ success: false, error: 'Missing fields' });
    return;
  }

  try {
    const { ok, data } = await sendViaResend({
      from: 'CoachGo Contact <noreply@coachgonline.com>',
      to: 'coachgonline@gmail.com',
      reply_to: email,
      subject: `[CoachGo Contact] ${subject} — ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0F1E;color:#F0F4FF;padding:40px;border-radius:16px;">
          <div style="background:linear-gradient(135deg,#4F8EF7,#2563EB);padding:24px;border-radius:12px;margin-bottom:32px;">
            <h1 style="margin:0;font-size:22px;font-weight:800;">New Contact Form Submission</h1>
            <p style="margin:8px 0 0;opacity:0.8;">via CoachGo website</p>
          </div>
          <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Name</td><td style="padding:8px 0;font-weight:700;text-align:right;">${name}</td></tr>
              <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Email</td><td style="padding:8px 0;font-weight:700;text-align:right;">${email}</td></tr>
              <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:13px;">Subject</td><td style="padding:8px 0;font-weight:700;text-align:right;">${subject}</td></tr>
            </table>
          </div>
          <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:rgba(255,255,255,0.5);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Message</p>
            <p style="margin:0;line-height:1.6;white-space:pre-wrap;">${message}</p>
          </div>
          <p style="font-size:12px;color:rgba(255,255,255,0.3);">Reply directly to this email to respond to ${name}.</p>
          <p style="margin-top:24px;font-size:12px;color:rgba(255,255,255,0.2);">CoachGo · coachgonline.com</p>
        </div>
      `,
    });
    if (!ok) { res.status(500).json({ success: false, error: data }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error('contact error:', err);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});
