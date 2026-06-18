export type UserRole = 'player' | 'coach' | 'admin';
export type Specialty = 'hitting' | 'pitching' | 'fielding' | 'strength';
export type SkillLevel = 'beginner' | 'developing' | 'competitive';
export type LocationMode = 'facility' | 'travel' | 'virtual';

// What a coach offers — informational only (no booking behind it).
export type SessionOffering = '1-on-1' | 'group';

// Connection request lifecycle (replaces the old booking lifecycle).
export type ConnectionStatus = 'pending' | 'accepted' | 'ignored';

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
  price_per_session: number;    // informational "starting at" price
  session_offerings?: SessionOffering[]; // 1-on-1 / group tags
  rating: number;
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
  video_url?: string;
  // ── Profile enrichments (informational) ──
  location_modes?: LocationModes;    // where the coach trains (in person / travels / virtual)
  academy_name?: string;             // facility / academy this coach belongs to
  gallery_urls?: string[];           // extra profile photos
}

export interface PlayerProfile {
  id?: string;
  user_id: string;
  name?: string;
  age?: number;
  grade?: string;             // e.g. "Sophomore", "8th grade"
  primary_position?: string;  // e.g. "Shortstop", "Pitcher"
  skill_level?: SkillLevel;
  goals?: string;             // what the player wants to work on
  bio?: string;
  updated_at?: any;
}

// A player asking a coach to connect. The coach reaches out directly.
export interface Connection {
  id: string;
  player_id: string;         // Firebase uid of the player
  player_name: string;
  coach_id: string;          // numeric MOCK id (e.g. "2")
  coach_user_id: string;     // coach Firebase uid (rules + email lookup)
  coach_name: string;
  player_phone?: string | null;
  player_email?: string | null;
  player_note?: string;
  status: ConnectionStatus;
  created_at: any;
  updated_at?: any;
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
