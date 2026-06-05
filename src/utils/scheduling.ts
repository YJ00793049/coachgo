// ─── Scheduling helpers (timezone, slot math, ICS export, buffers) ──────────
// Pure utilities — no Firebase, no side effects. Shared by BookingPage,
// DashboardPage and CoachProfilePage so time math stays consistent.

import type { LocationMode, LocationModes } from '../types';

// Slot label → [hour24, minute]
export const SLOT_TIME: Record<string, [number, number]> = {
  '7:00 AM': [7, 0], '8:00 AM': [8, 0], '9:00 AM': [9, 0], '10:00 AM': [10, 0],
  '10:30 AM': [10, 30], '11:00 AM': [11, 0], '12:00 PM': [12, 0], '1:00 PM': [13, 0],
  '2:00 PM': [14, 0], '3:00 PM': [15, 0], '3:30 PM': [15, 30], '4:00 PM': [16, 0],
  '5:00 PM': [17, 0], '6:00 PM': [18, 0], '7:00 PM': [19, 0],
};

export function slotToMinutes(slot: string): number | null {
  const t = SLOT_TIME[slot];
  return t ? t[0] * 60 + t[1] : null;
}

/** YYYY-MM-DD + n days → YYYY-MM-DD (local, DST-safe via noon anchor). */
export function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
  } catch {
    return 'America/Los_Angeles';
  }
}

/** Short tz abbreviation for display, e.g. "PDT". Falls back to the IANA name. */
export function tzAbbrev(timezone?: string): string {
  const tz = timezone || getBrowserTimezone();
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value || tz;
  } catch {
    return tz;
  }
}

// ── Location modes ──────────────────────────────────────────────────────────
export const LOCATION_MODE_META: Record<LocationMode, { label: string; short: string }> = {
  facility: { label: 'At the facility', short: 'In person' },
  travel:   { label: 'Coach travels to you', short: 'They travel' },
  virtual:  { label: 'Virtual session', short: 'Virtual' },
};

export function enabledLocationModes(modes?: LocationModes): LocationMode[] {
  if (!modes) return ['facility'];
  const out = (['facility', 'travel', 'virtual'] as LocationMode[]).filter(m => modes[m]);
  return out.length > 0 ? out : ['facility'];
}

// ── Buffer / slot blocking ──────────────────────────────────────────────────
/**
 * Given existing booked slot labels for a day and a buffer in minutes, return the
 * set of slot labels that should be unavailable (the booked slot itself plus any
 * slot whose start falls within `buffer` minutes of a booked slot).
 */
export function blockedSlots(bookedSlots: string[], bufferMinutes: number, allSlots: string[]): Set<string> {
  const blocked = new Set<string>();
  const bookedMins = bookedSlots.map(slotToMinutes).filter((m): m is number => m != null);
  for (const slot of allSlots) {
    const m = slotToMinutes(slot);
    if (m == null) continue;
    for (const bm of bookedMins) {
      // 60-min sessions; block if within session length + buffer of a booked start
      if (Math.abs(m - bm) < 60 + bufferMinutes) { blocked.add(slot); break; }
    }
  }
  return blocked;
}

// ── ICS (.ics) export ───────────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0'); }

/** Build a floating-local ICS datetime stamp from date + slot. */
function icsLocalStamp(dateStr: string, slot: string): string {
  const [h, m] = SLOT_TIME[slot] || [9, 0];
  const d = dateStr.replace(/-/g, '');
  return `${d}T${pad(h)}${pad(m)}00`;
}

export interface IcsEvent {
  title: string;
  description?: string;
  location?: string;
  date: string;      // YYYY-MM-DD
  slot: string;      // slot label
  durationMins?: number;
  recurrenceWeeks?: number; // if >1, adds RRULE WEEKLY COUNT
}

export function buildICS(ev: IcsEvent): string {
  const start = icsLocalStamp(ev.date, ev.slot);
  const [h, m] = SLOT_TIME[ev.slot] || [9, 0];
  const endMin = h * 60 + m + (ev.durationMins ?? 60);
  const endStamp = `${ev.date.replace(/-/g, '')}T${pad(Math.floor(endMin / 60))}${pad(endMin % 60)}00`;
  const uid = `coachgo-${Date.now()}-${Math.random().toString(36).slice(2)}@coachgonline.com`;
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CoachGo//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${endStamp}`,
    `SUMMARY:${esc(ev.title)}`,
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : '',
    ev.location ? `LOCATION:${esc(ev.location)}` : '',
    ev.recurrenceWeeks && ev.recurrenceWeeks > 1 ? `RRULE:FREQ=WEEKLY;COUNT=${ev.recurrenceWeeks}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

/** Trigger a download of an .ics file in the browser. */
export function downloadICS(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
