// ─── Discovery helpers: recently-viewed coaches + saved searches ────────────
// localStorage-backed, no auth required. Pure & defensive (SSR/quota safe).

export interface RecentCoach {
  id: string;
  name: string;
  specialty: string;
  avatar_url?: string;
  price?: number;
  viewed_at: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  params: {
    searchQuery?: string;
    specialty?: string;
    location?: string;
    sort?: string;
    maxPrice?: number | null;
    availableNow?: boolean;
  };
  created_at: number;
}

const RECENT_KEY = 'coachgo_recent_coaches';
const SAVED_KEY = 'coachgo_saved_searches';
const RECENT_CAP = 10;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

// ── Recently viewed ─────────────────────────────────────────────────────────
export function getRecentCoaches(): RecentCoach[] {
  return read<RecentCoach[]>(RECENT_KEY, []);
}

export function addRecentCoach(coach: Omit<RecentCoach, 'viewed_at'>) {
  if (!coach?.id) return;
  const existing = getRecentCoaches().filter(c => c.id !== coach.id);
  const next = [{ ...coach, viewed_at: Date.now() }, ...existing].slice(0, RECENT_CAP);
  write(RECENT_KEY, next);
}

// ── Saved searches ──────────────────────────────────────────────────────────
export function getSavedSearches(): SavedSearch[] {
  return read<SavedSearch[]>(SAVED_KEY, []);
}

export function saveSearch(name: string, params: SavedSearch['params']): SavedSearch[] {
  const entry: SavedSearch = {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'Saved search',
    params,
    created_at: Date.now(),
  };
  const next = [entry, ...getSavedSearches()].slice(0, 12);
  write(SAVED_KEY, next);
  return next;
}

export function deleteSavedSearch(id: string): SavedSearch[] {
  const next = getSavedSearches().filter(s => s.id !== id);
  write(SAVED_KEY, next);
  return next;
}

// ── One-time UI flags (first-run tips) ──────────────────────────────────────
export function seenFlag(key: string): boolean {
  try { return localStorage.getItem(`coachgo_seen_${key}`) === '1'; } catch { return true; }
}
export function markSeen(key: string) {
  try { localStorage.setItem(`coachgo_seen_${key}`, '1'); } catch { /* ignore */ }
}
