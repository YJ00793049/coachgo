export type UserRole = 'player' | 'coach' | 'admin';
export type Specialty = 'hitting' | 'pitching' | 'fielding' | 'strength';
export type SkillLevel = 'beginner' | 'developing' | 'competitive';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined' | 'reschedule_requested';
export type LocationMode = 'facility' | 'travel' | 'virtual';

export interface LocationModes {
  facility?: boolean;
  travel?: boolean;
  virtual?: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Affiliation {
  name: string;
  logoUrl: string;
}

export interface CoachProfile {
  id: string;
  user_id: string;
  specialty: Specialty;
  secondary_specialty?: Specialty;
  bio: string;
  certifications: string[];
  years_experience: number;
  price_per_session: number;
  rating: number;
  session_types: string[];
  availability: Record<string, any>;
  is_active: boolean;
  name?: string; // Joined from User
  avatar_url?: string; // Joined from User
  avatar_position?: string; // CSS object-position (e.g., 'top', 'center 20%')
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  affiliations?: Affiliation[];
  skills?: string[];
  reviews?: number;
  venmo_handle?: string;
  video_url?: string;
  packages?: SessionPackage[];
  // ── Scheduling & booking depth ──
  instant_book?: boolean;            // true → bookings auto-confirm
  location_modes?: LocationModes;    // which session locations the coach offers
  travel_radius_miles?: number;      // optional, for "travels to you"
  buffer_minutes?: number;           // rest/travel gap enforced between sessions
  timezone?: string;                 // IANA tz, e.g. "America/Los_Angeles"
  // ── Supply-side tools ──
  promo_codes?: PromoCode[];
  academy_name?: string;             // facility / academy this coach belongs to
}

export interface SessionPackage {
  sessions: number;
  discount_pct: number;
  label: string;
}

export interface PromoCode {
  code: string;
  type: 'percent' | 'amount';
  value: number;
  active: boolean;
}

export interface PlayerProfile {
  id: string;
  user_id: string;
  age: number;
  skill_level: SkillLevel;
  primary_position: string;
}

export interface Booking {
  id: string;
  player_id: string;
  coach_id: string;
  session_type: string;
  date: string;
  time_slot: string;
  status: BookingStatus;
  total_price: number;
  notes?: string;
  coach_name?: string;
  player_name?: string;
  reschedule_date?: string;
  reschedule_time?: string;
  reschedule_note?: string;
  reminder_sent_24h?: boolean;
  session_count?: number;
  is_package?: boolean;
  // ── Scheduling & booking depth ──
  location_mode?: LocationMode;
  recurring_group_id?: string;   // links sessions in a standing/recurring series
  is_recurring?: boolean;
  timezone?: string;
  promo_code?: string;
  discount_amount?: number;
}

export interface WaitlistEntry {
  id: string;
  coach_id: string;
  player_id: string;
  player_name?: string;
  coach_name?: string;
  date: string;
  time_slot: string;
  session_type: string;
  created_at: any;
  notified?: boolean;
}

export interface Review {
  id: string;
  booking_id: string;
  player_id: string;
  coach_id: string;
  rating: number;
  comment: string;
  created_at: string;
  player_name?: string;
}
