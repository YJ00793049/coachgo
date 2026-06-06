// ─── Error monitoring (Sentry seam) ─────────────────────────────────────────
// No SDK dependency is bundled. To go live: `npm i @sentry/react`, set
// VITE_SENTRY_DSN, and uncomment the init/capture lines below.

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return; // no DSN → monitoring stays off
  // import('@sentry/react').then(Sentry => {
  //   Sentry.init({ dsn, tracesSampleRate: 0.1, replaysSessionSampleRate: 0.0 });
  //   (window as any).Sentry = Sentry;
  // });
  if (import.meta.env.DEV) console.debug('[monitoring] DSN present — wire @sentry/react to enable.');
}

export function captureError(error: unknown, info?: Record<string, any>) {
  const w = window as any;
  try { w.Sentry?.captureException?.(error, info ? { extra: info } : undefined); } catch { /* ignore */ }
  if (import.meta.env.DEV) console.error('[captureError]', error, info);
}
