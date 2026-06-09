import * as dotenv from 'dotenv';
dotenv.config();

import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { Resend } from 'resend';

// Note: the Resend client is created lazily inside each handler (not at module
// load) so RESEND_API_KEY from functions/.env is available when it's used.

// Verified sending domain in Resend.
const FROM = 'CoachGo <notifications@coachgonline.com>';
const SUPPORT = 'coachgonline@gmail.com';
const SITE = 'https://coachgonline.com';

// ─── Warm "Editorial Calm" email theme (email-client-safe, inline styles) ────
const C = {
  paper: '#F0EBE2',
  card: '#FBFAF6',
  ink: '#1B1813',
  inkSoft: '#6E665A',
  inkFaint: '#9C9485',
  line: '#E7E1D6',
  black: '#16130E',
  venmo: '#008CFF',
  serif: "Georgia, 'Times New Roman', serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:9px 0;color:${C.inkSoft};font-size:13px;font-family:${C.sans};vertical-align:top;">${esc(label)}</td>
    <td style="padding:9px 0;color:${C.ink};font-size:14px;font-family:${C.sans};font-weight:600;text-align:right;vertical-align:top;">${esc(value)}</td>
  </tr>`;
}

function detailTable(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.paper};border:1px solid ${C.line};border-radius:16px;margin:0 0 24px;">
    <tr><td style="padding:8px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
    </td></tr>
  </table>`;
}

function button(href: string, label: string, variant: 'solid' | 'outline' = 'solid'): string {
  const inner = variant === 'solid'
    ? `background:${C.black};color:#F6F4EF;border:1px solid ${C.black};`
    : `background:${C.card};color:${C.ink};border:1px solid ${C.ink};`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 12px;">
    <tr><td align="center" style="border-radius:999px;">
      <a href="${href}" target="_blank"
        style="display:block;padding:16px 28px;border-radius:999px;text-decoration:none;font-family:${C.sans};font-size:16px;font-weight:600;text-align:center;${inner}">
        ${esc(label)}
      </a>
    </td></tr>
  </table>`;
}

interface LayoutOpts {
  heading: string;
  intro?: string;
  body?: string;
  buttonsHtml?: string;
  footerNote?: string;
}

function layout(o: LayoutOpts): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.paper};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 4px 20px;">
          <span style="font-family:${C.serif};font-size:26px;color:${C.ink};letter-spacing:-0.01em;">CoachGo</span>
        </td></tr>
        <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:24px;padding:36px 32px;">
          <h1 style="margin:0 0 16px;font-family:${C.serif};font-weight:400;font-size:30px;line-height:1.1;color:${C.ink};letter-spacing:-0.015em;">${o.heading}</h1>
          ${o.intro ? `<p style="margin:0 0 24px;font-family:${C.sans};font-size:16px;line-height:1.6;color:${C.inkSoft};">${o.intro}</p>` : ''}
          ${o.body || ''}
          ${o.buttonsHtml || ''}
          ${o.footerNote ? `<p style="margin:20px 0 0;font-family:${C.sans};font-size:13px;line-height:1.6;color:${C.inkFaint};">${o.footerNote}</p>` : ''}
        </td></tr>
        <tr><td style="padding:24px 4px 0;font-family:${C.sans};font-size:12px;color:${C.inkFaint};">
          CoachGo · San Diego baseball coaching · <a href="${SITE}" style="color:${C.inkFaint};">coachgonline.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Per-type renderers ──────────────────────────────────────────────────────
type Rendered = { subject: string; html: string };
const RENDERERS: Record<string, (d: any) => Rendered> = {
  coach_new_booking: (d) => ({
    subject: `New booking request from ${d.playerName}`,
    html: layout({
      heading: 'New booking request',
      intro: `Hi ${esc(d.coachName || 'Coach')}, <strong style="color:${C.ink}">${esc(d.playerName)}</strong> wants to train with you on CoachGo.`,
      body: detailTable(
        row('Player', d.playerName) +
        row('Date', d.date) +
        row('Time', d.timeSlot) +
        row('Session', d.sessionType) +
        row('Duration', d.duration || '1 hour') +
        row('Skill level', d.skillLevel || '—') +
        (d.notes ? row('Notes', d.notes) : '') +
        row('Price', `$${d.totalPrice}`)
      ),
      buttonsHtml:
        button(`${SITE}/dashboard`, 'Accept Booking', 'solid') +
        button(`${SITE}/dashboard`, 'Decline Booking', 'outline'),
      footerNote: 'Log in to your dashboard to accept or decline. The player will be notified of your decision.',
    }),
  }),

  player_booking_requested: (d) => ({
    subject: `Your booking request was sent to ${d.coachName}`,
    html: layout({
      heading: 'Request sent',
      intro: `Hi ${esc(d.playerName || 'there')}, your request is on its way to <strong style="color:${C.ink}">${esc(d.coachName)}</strong>.`,
      body: detailTable(
        row('Coach', d.coachName) +
        row('Date', d.date) +
        row('Time', d.timeSlot) +
        row('Session', d.sessionType)
      ),
      buttonsHtml: button(`${SITE}/dashboard`, 'View my dashboard', 'solid'),
      footerNote: "The coach will confirm within 24 hours. You'll get an email as soon as they respond.",
    }),
  }),

  player_booking_confirmed: (d) => ({
    subject: `${d.coachName} confirmed your session!`,
    html: layout({
      heading: 'Your session is confirmed',
      intro: `Hi ${esc(d.playerName || 'there')}, great news — <strong style="color:${C.ink}">${esc(d.coachName)}</strong> confirmed your session.`,
      body:
        detailTable(
          row('Coach', d.coachName) +
          row('Date', d.date) +
          row('Time', d.timeSlot) +
          row('Session', d.sessionType) +
          row('Total', `$${d.totalPrice}`)
        ) +
        (d.venmoHandle
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:rgba(0,140,255,0.06);border:1px solid rgba(0,140,255,0.25);border-radius:16px;margin:0 0 24px;">
              <tr><td style="padding:18px 20px;font-family:${C.sans};">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${C.ink};">Pay with Venmo</p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:${C.inkSoft};">Send <strong style="color:${C.ink}">$${esc(d.totalPrice)}</strong> to <strong style="color:${C.venmo}">@${esc(d.venmoHandle)}</strong> via Venmo. Payment is due after the coach confirms.</p>
              </td></tr>
            </table>`
          : `<p style="margin:0 0 24px;font-family:${C.sans};font-size:14px;color:${C.inkSoft};">Payment is due after the coach confirms — your coach will share payment details.</p>`),
      buttonsHtml: button(`${SITE}/dashboard`, 'View my dashboard', 'solid'),
    }),
  }),

  player_booking_declined: (d) => ({
    subject: 'Update on your session request',
    html: layout({
      heading: 'A quick update',
      intro: `Hi ${esc(d.playerName || 'there')}, unfortunately ${esc(d.coachName || 'the coach')} wasn't able to make that time work${d.date ? ` on ${esc(d.date)}` : ''}.`,
      body: `<p style="margin:0 0 24px;font-family:${C.sans};font-size:15px;line-height:1.6;color:${C.inkSoft};">Don't worry — there are other great specialists ready to help. Browse coaches and find a time that fits your schedule.</p>`,
      buttonsHtml: button(`${SITE}/coaches`, 'Browse other coaches', 'solid'),
    }),
  }),

  player_booking_cancelled_to_coach: (d) => ({
    subject: `${d.playerName} cancelled their ${d.sessionType} session`,
    html: layout({
      heading: 'Booking cancelled',
      intro: `Hi ${esc(d.coachName || 'Coach')}, <strong style="color:${C.ink}">${esc(d.playerName)}</strong> cancelled their <strong style="color:${C.ink}">${esc(d.sessionType)}</strong> session on ${esc(d.date)}.`,
      buttonsHtml: button(`${SITE}/dashboard`, 'View my dashboard', 'solid'),
    }),
  }),

  session_reminder: (d) => ({
    subject: d.isCoach
      ? `Reminder: your session tomorrow (${d.date})`
      : `Reminder: your session with ${d.coachName} is tomorrow`,
    html: layout({
      heading: 'Session tomorrow',
      intro: `Hi ${esc(d.name || 'there')}, a quick reminder about your upcoming session.`,
      body: detailTable(
        (!d.isCoach && d.coachName ? row('Coach', d.coachName) : '') +
        row('Session', d.sessionType) +
        row('Date', d.date) +
        row('Time', d.timeSlot)
      ),
      buttonsHtml: button(`${SITE}/dashboard`, 'View my dashboard', 'solid'),
    }),
  }),
};

// ─── POST /api/send-email — transactional notifications ──────────────────────
// Body: { type, to, data } (server-rendered template) OR { to, subject, html } (legacy).
export const sendEmail = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed' }); return; }

  const body = req.body || {};
  const to = body.to;
  if (!to) { res.status(400).json({ success: false, error: 'Missing "to"' }); return; }

  let subject: string;
  let html: string;

  if (body.subject && body.html) {
    subject = body.subject;
    html = body.html;
  } else {
    const renderer = RENDERERS[body.type];
    if (!renderer) { res.status(400).json({ success: false, error: `Unknown email type: ${body.type}` }); return; }
    ({ subject, html } = renderer(body.data || {}));
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY || '');
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) { logger.error('Resend error', error); res.status(502).json({ success: false, error }); return; }
    res.json({ success: true, id: data?.id });
  } catch (err) {
    logger.error('sendEmail failed', err);
    res.status(500).json({ success: false, error: 'Email send failed' });
  }
});

// ─── POST /api/contact — contact form ────────────────────────────────────────
export const contact = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed' }); return; }

  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !subject || !message) {
    res.status(400).json({ success: false, error: 'Missing fields' });
    return;
  }

  const html = layout({
    heading: 'New contact message',
    intro: `From <strong style="color:${C.ink}">${esc(name)}</strong> via the CoachGo website.`,
    body:
      detailTable(row('Name', name) + row('Email', email) + row('Subject', subject)) +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.paper};border:1px solid ${C.line};border-radius:16px;margin:0 0 8px;">
        <tr><td style="padding:18px 20px;font-family:${C.sans};">
          <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${C.inkFaint};">Message</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:${C.ink};white-space:pre-wrap;">${esc(message)}</p>
        </td></tr>
      </table>`,
    footerNote: `Reply directly to this email to respond to ${esc(name)}.`,
  });

  try {
    const resend = new Resend(process.env.RESEND_API_KEY || '');
    const { error } = await resend.emails.send({
      from: 'CoachGo Contact <notifications@coachgonline.com>',
      to: SUPPORT,
      replyTo: email,
      subject: `[CoachGo Contact] ${subject} — ${name}`,
      html,
    });
    if (error) { logger.error('contact resend error', error); res.status(502).json({ success: false, error }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error('contact failed', err);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});
