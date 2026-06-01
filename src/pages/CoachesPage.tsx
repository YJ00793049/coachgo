import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, MapPin } from 'lucide-react';
import CoachCard from '../components/CoachCard';
import { CoachProfile } from '../types';
import { useSearchParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SPRING } from '../tokens';

export const MOCK_COACHES: CoachProfile[] = [
  {
    id: '1', user_id: 'Z6zXkui7gTdniYIUBQYpIKMcJfY2', name: 'Shim Jeong-soo', specialty: 'hitting',
    venmo_handle: 'shimjeongsoo',
    bio: "• 5x Korean Series Champion (1995, 2003, 2004, 2005, 2006) — including four consecutive titles from 2003–2006\n• 53 HR & 142 RBI in 2003 — his best season, hitting .335 and leading the Hyundai Unicorns to a championship\n• 3x KBO Golden Glove Award (2002, 2003, 2007) — recognized as one of the league's top outfielders\n• Led the KBO in home runs and RBI in 2007 — with 31 HR and 101 RBI in his age-32 season\n• 328 career home runs — ranking 6th all-time in KBO League history",
    price_per_session: 120, rating: 4.9, skills: ['Swing Mechanics', 'Exit Velocity', 'Power Hitting', 'Mental Approach'],
    reviews: 42, certifications: [], years_experience: 15, session_types: [], availability: {}, is_active: true,
    avatar_url: '/shim_new.png', avatar_position: 'top',
    street_address: 'Spring Canyon Neighborhood Park, 11011 Scripps Poway Pkwy', city: 'San Diego', state: 'CA', zip_code: '92131',
    affiliations: [{ name: 'KBO Hyundai Unicorns', logoUrl: '/unicorns.png' }, { name: 'KBO Samsung Lions', logoUrl: '/lions.png' }, { name: 'KBO Doosan Bears', logoUrl: '/doosan.png' }]
  },
  {
    id: '2', user_id: 'CUs50WIYsUbNYJhF1q3r273Vkcu2', name: 'Kris Benson', specialty: 'pitching',
    venmo_handle: 'krisbenson',
    bio: "• #1 overall pick in the 1996 MLB Draft out of Clemson University\n• Consensus College Player of the Year & Dick Howser Trophy winner\n• 1996 Atlanta Summer Olympics bronze medalist\n• 13 professional seasons across six MLB franchises, 10+ years of Major League service\n• Roberto Clemente, Thurman Munson & Joan Payson Humanitarian Award recipient\n• Third season as Varsity Pitching Coach at Del Norte High School",
    price_per_session: 150, rating: 5.0, skills: ['Pitch Design', 'Command', 'Arm Health', 'Velocity Training'],
    reviews: 28, certifications: [], years_experience: 12, session_types: [], availability: {}, is_active: true,
    avatar_url: '/krisbenson.webp', avatar_position: 'top',
    street_address: '16601 Nighthawk Ln', city: 'San Diego', state: 'CA', zip_code: '92127',
    affiliations: [
      { name: 'Clemson', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Clemson_Tigers_logo.svg' },
      { name: 'Pittsburgh Pirates', logoUrl: 'https://www.mlbstatic.com/team-logos/134.svg' },
      { name: 'New York Mets', logoUrl: 'https://www.mlbstatic.com/team-logos/121.svg' },
      { name: 'Baltimore Orioles', logoUrl: 'https://www.mlbstatic.com/team-logos/110.svg' },
      { name: 'Texas Rangers', logoUrl: 'https://www.mlbstatic.com/team-logos/140.svg' },
      { name: 'Arizona Diamondbacks', logoUrl: 'https://www.mlbstatic.com/team-logos/109.svg' },
    ]
  },
  {
    id: '3', user_id: 'PEZr6wb06YYLzc08MLUsq7B4PDo2', name: 'Casey Henderson', specialty: 'fielding',
    venmo_handle: 'caseyhenderson',
    bio: "• First Team All-Pacific Coast Athletic Conference (2016) — earned top conference honors at Palomar College before transferring to California State University, Chico\n• All-CCAA Honorable Mention (2017) — recognized as one of the best players in the California Collegiate Athletic Association at shortstop\n• .625 Batting Average in the NCAA Championship Tournament West Regional — delivered his best baseball in the sport's biggest moments\n• First Team All-Palomar League, Second Team All-CIF, and Third Team All-State as a senior — one of the most decorated high school players in the San Diego area\n• Helped lead Rancho Bernardo High School to four league titles and a CIF championship — proven winner at every level of his career",
    price_per_session: 90, rating: 4.8, skills: ['Infield Drills', 'Footwork', 'Glove-work', 'Double Plays'],
    reviews: 15, certifications: [], years_experience: 8, session_types: [], availability: {}, is_active: true,
    avatar_url: '/caseyhenderson.webp', avatar_position: 'top',
    street_address: '789 Infield Dr', city: 'Poway', state: 'CA', zip_code: '92064',
    affiliations: [{ name: 'California State University, Chico', logoUrl: '/chico.png' }]
  },
  {
    id: '4', user_id: 'BKRGmiaM75hdsI0mauIUaEsbDXv2', name: 'Brandon Decker', specialty: 'hitting',
    venmo_handle: 'brandondecker',
    bio: "• Former professional baseball player, played at San Diego State under Hall of Fame coach Tony Gwynn\n• 13+ years of coaching experience across all levels\n• WCC Championship at USD & MWC Championship at San Diego State University as assistant coach\n• 11th season as Varsity Assistant Coach at Del Norte High School\n• Founder of Trosky Force Travel Baseball program (7U–18U)\n• Owner of The Upper Deck Training Facility in Scripps Ranch—available to our players throughout the season",
    price_per_session: 100, rating: 4.7, skills: ['Swing Plane', 'Plate Discipline', 'Video Analysis'],
    reviews: 19, certifications: [], years_experience: 6, session_types: [], availability: {}, is_active: true,
    avatar_url: '/brandondecker.webp', avatar_position: 'top',
    street_address: '101 Batter Up Blvd', city: 'San Diego', state: 'CA', zip_code: '92014',
    affiliations: [{ name: 'San Diego State University', logoUrl: '/sdsu.png' }]
  },
  {
    id: '5', user_id: 'Mh33Uip3JOVvc1FryPwyhdf0X7g1', name: 'Brett Balkan', specialty: 'hitting',
    venmo_handle: 'brettbalkan',
    bio: "• 5-sport varsity athlete at Carlsbad High School; earned First-Team All-American, First-Team All-Conference, and Rawlings Gold Glove honors at San Diego Mesa College before signing with California State University, Northridge on a baseball scholarship\n• Named All-Conference (Big West) and team Defensive Player of the Year at California State University, Northridge with a .982 fielding percentage at shortstop\n• Played 5 professional seasons in Independent Baseball, posting a .320 average, .427 OBP, 2 championships, 2 All-Star selections, and back-to-back Regular Season and Postseason MVP awards\n• 10 years of coaching experience as an infield and hitting coach at Rancho Bernardo and Mount Carmel High Schools, plus a decade of travel baseball coaching at all ages\n• Specializes in video analysis for hitting and infield instruction\n• B.A. in Communications, California State University, Northridge (2014); M.S. in Coaching & Athletic Administration, Concordia University Irvine (2019)",
    price_per_session: 85, rating: 4.6, skills: ['Elite Mechanics', 'Arm Path', 'Video Analysis', 'Balance'],
    reviews: 12, certifications: [], years_experience: 5, session_types: [], availability: {}, is_active: true,
    avatar_url: '/brettbalkan.jpg', avatar_position: 'top',
    street_address: '202 Base Hit St', city: 'Escondido', state: 'CA', zip_code: '92025',
    affiliations: [{ name: 'California State University, Northridge', logoUrl: '/csun.png' }]
  },
  {
    id: '6', user_id: 'UDqp6R2PGkUUBwvyEfIbwMGudpk1', name: 'Chris Hyndman', specialty: 'pitching',
    venmo_handle: 'chrishyndman',
    bio: 'Expert in velocity development and weighted ball programs. Specializes in helping pitchers add velocity while maintaining arm health and mechanics.',
    price_per_session: 110, rating: 4.9, skills: ['Mechanics', 'Balance', 'Power', 'Command'],
    reviews: 31, certifications: [], years_experience: 9, session_types: [], availability: {}, is_active: true,
    avatar_url: 'https://picsum.photos/seed/hyndman/400/300',
    street_address: '3120 Rue Montreux', city: 'Escondido', state: 'CA', zip_code: '92026'
  },
  {
    id: '8', user_id: 'RwrKoCiodmdNn6afwjv9Xl69sBn1', name: 'Nick Rocha', specialty: 'fielding',
    secondary_specialty: 'hitting', venmo_handle: 'nickrocha',
    bio: 'Elite infielder coach focusing on footwork, glove-work, and transition speed.',
    price_per_session: 95, rating: 4.7, skills: ['Infield Footwork', 'Glove-work', 'Transition Speed', 'Range'],
    reviews: 18, certifications: [], years_experience: 7, session_types: [], availability: {}, is_active: true,
    avatar_url: 'https://picsum.photos/seed/nickrocha/400/300',
    street_address: '505 Shortstop Way', city: 'San Marcos', state: 'CA', zip_code: '92069'
  },
  {
    id: '9', user_id: '7j9Yyu4A9SZu9Eap02VpszPYfsN2', name: 'Robert Congalton', specialty: 'strength',
    venmo_handle: 'robertcongalton',
    bio: "• Co-owner of 1RM Performance — built a premier training facility in San Diego, establishing himself as a leading figure in the strength & sports performance community\n• Former Division 1 Javelin Thrower — competed at the highest level of collegiate athletics, bringing elite athlete experience to his coaching\n• Elite Strength Numbers — 445 lb bench, 455 lb squat, and 545 lb deadlift, demonstrating elite-level powerlifting credentials\n• Exceptional Athleticism — 35\" vertical, 9'8\" standing broad jump, and a 4.5 second 40-yard dash, showcasing rare combination of strength and explosiveness\n• DNS-Integrated Coaching System — developed a unique training methodology blending Dynamic Neuromuscular Stabilization with modern sports performance models, driving results for athletes both in the gym and on the field",
    price_per_session: 80, rating: 4.9, skills: ['Strength Training', 'Conditioning', 'Explosive Power', 'Injury Prevention'],
    reviews: 35, certifications: [], years_experience: 10, session_types: [], availability: {}, is_active: true,
    avatar_url: '/bobbycongalton.jpg',
    street_address: '4040 Sorrento Valley Blvd', city: 'San Diego', state: 'CA', zip_code: '92121',
    affiliations: [{ name: 'San Diego State University', logoUrl: '/sdsu.png' }]
  },
];

const CITIES = ['All Locations', ...Array.from(new Set(MOCK_COACHES.map(c => c.city).filter(Boolean))) as string[]];
const SPECIALTIES = ['all', 'hitting', 'pitching', 'fielding', 'strength'] as const;
type SortOption = 'default' | 'price-asc' | 'price-desc' | 'rating-desc';

// ─── PARTICLE FIELD ────────────────────────────────────────────────
function ParticleField() {
  const prefersReduced = useReducedMotion();
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.8,
      duration: Math.random() * 14 + 8,
      delay: -(Math.random() * 14),
    })),
  []);
  if (prefersReduced) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: 'rgba(79,142,247,0.45)' }}
          animate={{ y: [0, -20, 0], opacity: [0.15, 0.6, 0.15] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export default function CoachesPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery]     = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState(searchParams.get('specialty') || 'all');
  const [locationFilter, setLocationFilter]   = useState('All Locations');
  const [sortOption, setSortOption]           = useState<SortOption>('default');
  const [coaches, setCoaches]                 = useState<CoachProfile[]>(MOCK_COACHES);
  const [filteredCoaches, setFilteredCoaches] = useState<CoachProfile[]>(MOCK_COACHES);
  const [availableCities, setAvailableCities] = useState<string[]>(CITIES);
  const [searchFocused, setSearchFocused]     = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const fetchOverrides = async () => {
      try {
        const snap = await getDocs(collection(db, 'coach_profiles'));
        const overrides: Record<string, Partial<CoachProfile>> = {};
        const newCoaches: CoachProfile[] = [];
        snap.forEach(d => {
          const data = d.data();
          const isMock = MOCK_COACHES.some(c => c.user_id === d.id);
          if (isMock) {
            const override: Partial<CoachProfile> = {};
            if (data.photo_url) override.avatar_url = data.photo_url;
            if (data.bio) override.bio = data.bio;
            if (data.venmo_handle) override.venmo_handle = data.venmo_handle;
            if (data.video_url) override.video_url = data.video_url;
            if (data.price_per_session) override.price_per_session = data.price_per_session;
            if (data.name) override.name = data.name;
            if (data.session_types_with_price) (override as any).session_types_with_price = data.session_types_with_price;
            if (Object.keys(override).length > 0) overrides[d.id] = override;
          } else if (data.specialty && data.is_active !== false) {
            newCoaches.push({
              id: d.id, user_id: d.id, name: data.name || 'Coach', specialty: data.specialty,
              secondary_specialty: data.secondary_specialty || undefined,
              bio: data.bio || '', price_per_session: data.price_per_session || 0,
              rating: data.rating || 0, skills: data.skills || [], reviews: data.reviews || 0,
              certifications: data.certifications || [], years_experience: data.years_experience || 0,
              session_types: [], availability: data.availability || {}, is_active: true,
              avatar_url: data.photo_url || undefined, city: data.city, state: data.state,
              street_address: data.street_address, affiliations: [], venmo_handle: data.venmo_handle,
              video_url: data.video_url,
            });
          }
        });
        const updated = MOCK_COACHES.map(c => overrides[c.user_id] ? { ...c, ...overrides[c.user_id] } : c);
        if (updated.length !== MOCK_COACHES.length || newCoaches.length > 0) setCoaches([...updated, ...newCoaches]);
        const allCities = ['All Locations', ...Array.from(new Set([
          ...MOCK_COACHES.map(c => c.city),
          ...newCoaches.map(c => c.city),
        ].filter(Boolean))) as string[]];
        setAvailableCities(allCities);
      } catch { /* fall back to hardcoded */ }
    };
    fetchOverrides();
  }, []);

  useEffect(() => {
    let filtered = coaches.filter(c => {
      const matchesSearch = !searchQuery || [c.name, c.bio, c.city, c.specialty, ...(c.skills || [])].some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSpecialty = specialtyFilter === 'all' || c.specialty === specialtyFilter || c.secondary_specialty === specialtyFilter;
      const matchesLocation = locationFilter === 'All Locations' || c.city === locationFilter;
      return matchesSearch && matchesSpecialty && matchesLocation;
    });
    if (sortOption === 'price-asc')    filtered = [...filtered].sort((a, b) => a.price_per_session - b.price_per_session);
    if (sortOption === 'price-desc')   filtered = [...filtered].sort((a, b) => b.price_per_session - a.price_per_session);
    if (sortOption === 'rating-desc')  filtered = [...filtered].sort((a, b) => b.rating - a.rating);
    setFilteredCoaches(filtered);
  }, [searchQuery, specialtyFilter, locationFilter, sortOption, coaches]);

  const specialtyLabels: Record<string, string> = {
    all: 'All', hitting: 'Hitting', pitching: 'Pitching', fielding: 'Fielding', strength: 'Strength'
  };

  return (
    <PageTransition>
      <div className="relative" style={{ minHeight: '100vh', background: '#080B14' }}>
        <ParticleField />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING }} className="mb-12"
          >
            <h1 className="font-display text-6xl md:text-7xl text-white leading-none mb-4">Find Your Coach</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Browse our marketplace of vetted baseball specialists.</p>
          </motion.div>

          {/* Animated specialty filter tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.1 }}
            className="flex items-center gap-1 p-1 rounded-2xl mb-6 flex-wrap"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'inline-flex' }}
          >
            {SPECIALTIES.map(spec => (
              <button
                key={spec}
                onClick={() => setSpecialtyFilter(spec)}
                className="relative px-4 py-2 rounded-xl text-sm font-bold z-10 transition-colors capitalize"
                style={{ color: specialtyFilter === spec ? 'white' : 'rgba(255,255,255,0.45)' }}
              >
                {specialtyFilter === spec && (
                  <motion.div
                    layoutId="activeFilter"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #4F8EF7, #2563EB)' }}
                    transition={{ ...SPRING }}
                  />
                )}
                <span className="relative z-10">{specialtyLabels[spec]}</span>
              </button>
            ))}
          </motion.div>

          {/* Search + sort row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.18 }}
            className="flex flex-col md:flex-row gap-3 mb-8"
          >
            <div className="relative flex-1">
              {/* Animated outer focus ring */}
              <motion.div
                aria-hidden
                className="absolute -inset-[2px] rounded-[14px] pointer-events-none"
                style={{ background: 'conic-gradient(from 0deg, #4F8EF7, #7C3AED, #06B6D4, #4F8EF7)' }}
                animate={searchFocused ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="relative rounded-xl"
                animate={searchFocused ? {} : {}}
              >
                <motion.div
                  animate={searchFocused ? { x: -2, scale: 1.15, rotate: -8, color: '#4F8EF7' } : { x: 0, scale: 1, rotate: 0, color: 'rgba(255,255,255,0.3)' }}
                  transition={SPRING}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none origin-center"
                >
                  <Search size={18} />
                </motion.div>
                <input
                  type="text"
                  placeholder="Search by name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="relative w-full border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none transition-all"
                  style={{
                    background: searchFocused ? 'rgba(8,11,20,0.85)' : 'rgba(255,255,255,0.04)',
                    borderColor: searchFocused ? 'rgba(79,142,247,0.55)' : 'rgba(255,255,255,0.08)',
                    boxShadow: searchFocused ? '0 0 0 4px rgba(79,142,247,0.12), 0 0 28px rgba(79,142,247,0.18)' : 'none',
                  }}
                />
              </motion.div>
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full border rounded-xl py-3 pl-12 pr-10 appearance-none focus:outline-none text-white cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full border rounded-xl py-3 pl-12 pr-10 appearance-none focus:outline-none text-white cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <option value="default">Sort By</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Top Rated</option>
              </select>
            </div>
          </motion.div>

          {/* Inline counter (kept for layout flow) */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="text-[10px] uppercase tracking-widest font-bold mb-6"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {filteredCoaches.length} coach{filteredCoaches.length !== 1 ? 'es' : ''} found
          </motion.p>

          {/* Floating count pill — sticks to bottom-right while browsing */}
          <AnimatePresence>
            <motion.div
              key={filteredCoaches.length}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={SPRING}
              className="fixed bottom-8 right-8 z-40 pointer-events-none hidden md:block"
            >
              <div
                className="relative rounded-full px-5 py-3 flex items-center gap-3 backdrop-blur-xl"
                style={{
                  background: 'rgba(8,11,20,0.7)',
                  border: '1px solid rgba(79,142,247,0.25)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,142,247,0.1), 0 0 30px rgba(79,142,247,0.15)',
                }}
              >
                <motion.span
                  className="font-display text-3xl leading-none"
                  style={{ color: '#4F8EF7' }}
                  key={`n-${filteredCoaches.length}`}
                  initial={{ scale: 0.7, y: -8 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={SPRING}
                >
                  {filteredCoaches.length}
                </motion.span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Coach{filteredCoaches.length !== 1 ? 'es' : ''}<br />Found
                </span>
                <motion.span
                  aria-hidden
                  className="absolute -inset-px rounded-full pointer-events-none"
                  style={{ border: '1px solid rgba(79,142,247,0.5)' }}
                  animate={prefersReduced ? {} : { opacity: [0.4, 0, 0.4], scale: [1, 1.18, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {filteredCoaches.length > 0 ? (
              <motion.div
                key={`${specialtyFilter}-${locationFilter}-${sortOption}`}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                variants={{ visible: { transition: { staggerChildren: prefersReduced ? 0 : 0.06 } } }}
                initial="hidden"
                animate="visible"
              >
                {filteredCoaches.map((coach) => (
                  <motion.div
                    key={coach.id}
                    variants={{
                      hidden:   { opacity: 0, y: 40, scale: 0.92 },
                      visible:  { opacity: 1, y: 0,  scale: 1, transition: { ...SPRING } },
                    }}
                  >
                    <CoachCard coach={coach} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-24 rounded-3xl border border-dashed"
                style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
              >
                <p style={{ color: 'rgba(255,255,255,0.45)' }}>No coaches found matching your criteria.</p>
                <button
                  onClick={() => { setSearchQuery(''); setSpecialtyFilter('all'); setLocationFilter('All Locations'); setSortOption('default'); }}
                  className="mt-6 btn-secondary py-2 px-6 text-sm"
                >
                  Clear all filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
