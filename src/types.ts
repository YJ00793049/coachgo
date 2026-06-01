export type UserRole = 'player' | 'coach' | 'admin';
export type Specialty = 'hitting' | 'pitching' | 'fielding' | 'strength';
export type SkillLevel = 'beginner' | 'developing' | 'competitive';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined' | 'reschedule_requested';

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
}

export interface SessionPackage {
  sessions: number;
  discount_pct: number;
  label: string;
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
