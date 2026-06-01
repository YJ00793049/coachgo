import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
if (!RESEND_API_KEY) console.warn('WARNING: RESEND_API_KEY not set — emails will fail');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ── Health check ──
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ── Contact form email ──
  app.post("/api/contact", async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
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
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Resend error:', data);
        return res.status(500).json({ success: false, error: data });
      }
      res.json({ success: true, data });
    } catch (err) {
      console.error('Contact form error:', err);
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  });

  // ── Transactional emails (booking notifications) ──
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({ from: 'CoachGo <noreply@coachgonline.com>', to, subject, html }),
      });
      const data = await response.json();
      if (!response.ok) return res.status(500).json({ success: false, error: data });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Email send failed' });
    }
  });

  // ── Vite middleware ──
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();