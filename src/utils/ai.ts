// ─── AI helpers (Gemini) with a local fallback ──────────────────────────────
// Coach matching for the "describe your goals" finder. Uses Gemini when
// available (same key the support chat uses), and falls back to a deterministic
// keyword ranking so the feature always returns useful matches.

import { GoogleGenAI } from '@google/genai';
import type { CoachProfile } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface CoachMatch { id: string; reason: string; }

const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  hitting: ['hit', 'hitting', 'swing', 'bat', 'contact', 'power', 'exit velo', 'plate', 'slug'],
  pitching: ['pitch', 'pitching', 'velocity', 'velo', 'arm', 'mound', 'fastball', 'breaking', 'curve', 'command', 'spin', 'mph'],
  fielding: ['field', 'fielding', 'infield', 'outfield', 'glove', 'footwork', 'defense', 'defensive', 'double play', 'range', 'shortstop', 'throw', 'hands'],
  strength: ['strength', 'conditioning', 'speed', 'agility', 'explosive', 'mobility', 'weight', 'power', 'recovery', 'injury'],
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function localReason(c: CoachProfile): string {
  const skills = (c.skills || []).slice(0, 2).join(' & ');
  return `${cap(c.specialty)} specialist${skills ? ` — ${skills}` : ''} · ${c.rating?.toFixed(1)}★`;
}

/** Deterministic keyword/skill ranking — no network. */
function localMatch(query: string, coaches: CoachProfile[], limit: number): CoachMatch[] {
  const q = query.toLowerCase();
  const scored = coaches.map(c => {
    let score = 0;
    for (const sp of [c.specialty, c.secondary_specialty].filter(Boolean) as string[]) {
      const kws = SPECIALTY_KEYWORDS[sp] || [];
      if (kws.some(k => q.includes(k))) score += 6;
      if (q.includes(sp)) score += 4;
    }
    for (const skill of c.skills || []) {
      const words = skill.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (words.some(w => q.includes(w))) score += 2;
    }
    if (c.city && q.includes(c.city.toLowerCase())) score += 2;
    score += (c.rating || 0) * 0.2; // gentle tiebreaker
    return { c, score };
  });
  const anyMatch = scored.some(s => s.score >= 4);
  return scored
    .sort((a, b) => b.score - a.score || (b.c.rating || 0) - (a.c.rating || 0))
    .slice(0, limit)
    .map(({ c }) => ({ id: c.id, reason: anyMatch ? localReason(c) : `Top-rated ${c.specialty} coach · ${c.rating?.toFixed(1)}★` }));
}

export async function matchCoaches(
  query: string,
  coaches: CoachProfile[],
  limit = 3,
): Promise<CoachMatch[]> {
  if (!coaches.length) return [];

  // Try Gemini first; fall back to local ranking on any failure.
  try {
    const catalog = coaches.map(c => ({
      id: c.id, name: c.name, specialty: c.specialty,
      secondary: c.secondary_specialty || null,
      skills: (c.skills || []).slice(0, 6),
      price: c.price_per_session, city: c.city, rating: c.rating,
      bio: (c.bio || '').replace(/\s+/g, ' ').slice(0, 180),
    }));

    const prompt =
`A baseball player describes what they're looking for:
"""${query}"""

From this list of coaches (JSON), choose the ${limit} best matches, ranked best first.
Weigh specialty and skills first, then level/price fit and location.
Coaches:
${JSON.stringify(catalog)}

Return ONLY a JSON array like:
[{"id":"<coach id from the list>","reason":"<one short sentence, max 18 words, why they fit>"}]
Use only ids that appear in the list. No prose outside the JSON.`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const raw = (res.text || '').trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const validIds = new Set(coaches.map(c => c.id));
      const out = parsed
        .filter((x: any) => x && x.id != null && validIds.has(String(x.id)))
        .map((x: any) => ({ id: String(x.id), reason: String(x.reason || '') }))
        .slice(0, limit);
      if (out.length) return out;
    }
    return localMatch(query, coaches, limit);
  } catch (e) {
    console.warn('[matchCoaches] Gemini unavailable, using local ranking:', e);
    return localMatch(query, coaches, limit);
  }
}
