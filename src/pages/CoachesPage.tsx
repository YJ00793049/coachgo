import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Search, ArrowUpDown, MapPin, X, Star, Check, Bookmark, Zap, Trash2, GitCompare } from 'lucide-react';
import CoachCard from '../components/CoachCard';
import { CoachProfile, LocationMode } from '../types';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SPRING, EASE_OUT } from '../tokens';
import {
  getRecentCoaches, getSavedSearches, saveSearch as persistSearch, deleteSavedSearch,
  seenFlag, markSeen, type RecentCoach, type SavedSearch,
} from '../utils/discovery';
import { enabledLocationModes, LOCATION_MODE_META } from '../utils/scheduling';

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

export default function CoachesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const academyFilter = searchParams.get('academy');
  const [searchQuery, setSearchQuery]     = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState(searchParams.get('specialty') || 'all');
  const [locationFilter, setLocationFilter]   = useState('All Locations');
  const [sortOption, setSortOption]           = useState<SortOption>('default');
  const [coaches, setCoaches]                 = useState<CoachProfile[]>(MOCK_COACHES);
  const [filteredCoaches, setFilteredCoaches] = useState<CoachProfile[]>(MOCK_COACHES);
  const [availableCities, setAvailableCities] = useState<string[]>(CITIES);
  const [searchFocused, setSearchFocused]     = useState(false);
  const prefersReduced = useReducedMotion();

  // ── Discovery state ──
  const [availableNow, setAvailableNow] = useState(false);
  const priceBounds = useMemo(() => {
    const ps = coaches.map(c => c.price_per_session).filter(p => p > 0);
    return { min: ps.length ? Math.min(...ps) : 0, max: ps.length ? Math.max(...ps) : 200 };
  }, [coaches]);
  const [priceRange, setPriceRange] = useState<[number, number]>([priceBounds.min, priceBounds.max]);
  useEffect(() => { setPriceRange([priceBounds.min, priceBounds.max]); }, [priceBounds.min, priceBounds.max]);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentCoaches, setRecentCoaches] = useState<RecentCoach[]>([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showTip, setShowTip] = useState(false);

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    setSavedSearches(getSavedSearches());
    setRecentCoaches(getRecentCoaches());
    setShowTip(!seenFlag('coaches_tip'));
  }, []);

  const priceActive = priceRange[0] > priceBounds.min || priceRange[1] < priceBounds.max;
  const anyFilter = !!searchQuery || specialtyFilter !== 'all' || locationFilter !== 'All Locations'
    || sortOption !== 'default' || availableNow || priceActive;

  const hasAvailability = (c: CoachProfile) =>
    !!(c as any).instant_book ||
    (c.availability && Object.values(c.availability).some((a: any) => Array.isArray(a) && a.length > 0));

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : (prev.length >= 3 ? prev : [...prev, id]));
  };

  const clearAll = () => {
    setSearchQuery(''); setSpecialtyFilter('all'); setLocationFilter('All Locations');
    setSortOption('default'); setAvailableNow(false); setPriceRange([priceBounds.min, priceBounds.max]);
  };

  const handleSaveSearch = () => {
    const name = saveName.trim() || `${specialtyFilter === 'all' ? 'All' : specialtyFilter} · ${locationFilter}`;
    setSavedSearches(persistSearch(name, {
      searchQuery, specialty: specialtyFilter, location: locationFilter,
      sort: sortOption, maxPrice: priceRange[1], availableNow,
    }));
    setShowSaveInput(false); setSaveName('');
  };

  const applySaved = (s: SavedSearch) => {
    const p = s.params;
    setSearchQuery(p.searchQuery || '');
    setSpecialtyFilter(p.specialty || 'all');
    setLocationFilter(p.location || 'All Locations');
    setSortOption((p.sort as SortOption) || 'default');
    setAvailableNow(!!p.availableNow);
    if (p.maxPrice != null) setPriceRange([priceBounds.min, p.maxPrice]);
  };

  const compareCoaches = coaches.filter(c => compareIds.includes(c.id));

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
            if (data.academy_name) override.academy_name = data.academy_name;
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
              video_url: data.video_url, academy_name: data.academy_name,
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
      const matchesPrice = c.price_per_session >= priceRange[0] && c.price_per_session <= priceRange[1];
      const matchesAvailable = !availableNow || hasAvailability(c);
      const matchesAcademy = !academyFilter || (c.academy_name || '') === academyFilter;
      return matchesSearch && matchesSpecialty && matchesLocation && matchesPrice && matchesAvailable && matchesAcademy;
    });
    if (sortOption === 'price-asc')    filtered = [...filtered].sort((a, b) => a.price_per_session - b.price_per_session);
    if (sortOption === 'price-desc')   filtered = [...filtered].sort((a, b) => b.price_per_session - a.price_per_session);
    if (sortOption === 'rating-desc')  filtered = [...filtered].sort((a, b) => b.rating - a.rating);
    setFilteredCoaches(filtered);
  }, [searchQuery, specialtyFilter, locationFilter, sortOption, coaches, priceRange, availableNow, academyFilter]);

  const specialtyLabels: Record<string, string> = {
    all: 'All', hitting: 'Hitting', pitching: 'Pitching', fielding: 'Fielding', strength: 'Strength'
  };

  return (
    <PageTransition>
      <div className="relative" style={{ minHeight: '100vh', background: 'var(--paper)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }} className="mb-10"
          >
            <span className="eyebrow mb-5 inline-flex">The marketplace</span>
            <h1 className="display-lg mb-3">Find your coach</h1>
            <p className="text-base" style={{ color: 'var(--ink-soft)' }}>Browse our marketplace of vetted San Diego baseball specialists.</p>
          </motion.div>

          {/* Academy filter banner */}
          {academyFilter && (
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl mb-6" style={{ background: 'var(--paper-warm)', border: '1px solid var(--line-strong)' }}>
              <p className="text-sm" style={{ color: 'var(--ink)' }}>
                Showing coaches at <strong>{academyFilter}</strong>
              </p>
              <button onClick={() => navigate('/coaches')} className="text-sm transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-soft)' }}>
                Clear
              </button>
            </div>
          )}

          {/* First-run tip */}
          <AnimatePresence>
            {showTip && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex items-start gap-3 p-4 rounded-2xl mb-6"
                style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)' }}
              >
                <Zap size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--ink-soft)' }} />
                <p className="text-sm flex-1" style={{ color: 'var(--ink-soft)' }}>
                  Tip: filter by specialty, price, and location — then <strong style={{ color: 'var(--ink)' }}>save a search</strong> or
                  pick a few coaches to <strong style={{ color: 'var(--ink)' }}>compare side by side</strong>.
                </p>
                <button onClick={() => { setShowTip(false); markSeen('coaches_tip'); }} aria-label="Dismiss tip"
                  className="p-1 rounded-full transition-colors hover:bg-[rgba(27,24,19,0.06)]" style={{ color: 'var(--ink-faint)' }}>
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recently viewed */}
          {recentCoaches.length > 0 && (
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--ink-faint)' }}>Recently viewed</p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {recentCoaches.slice(0, 8).map(r => (
                  <Link key={r.id} to={`/coaches/${r.id}`}
                    className="shrink-0 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full transition-colors hover:border-[var(--ink)]"
                    style={{ background: 'var(--card-cream)', border: '1px solid var(--line)' }}>
                    <span className="w-7 h-7 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--paper-warm)' }}>
                      {r.avatar_url
                        ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
                        : <span className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--ink-faint)' }}>{r.name.charAt(0)}</span>}
                    </span>
                    <span className="text-sm whitespace-nowrap" style={{ color: 'var(--ink)' }}>{r.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Specialty filter tabs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE_OUT }}
            className="flex items-center gap-1 p-1 rounded-full mb-6 flex-wrap"
            style={{ background: 'var(--card-cream)', border: '1px solid var(--line)', display: 'inline-flex' }}
          >
            {SPECIALTIES.map(spec => (
              <button
                key={spec}
                onClick={() => setSpecialtyFilter(spec)}
                className="relative px-4 py-2 rounded-full text-sm z-10 transition-colors capitalize"
                style={{ color: specialtyFilter === spec ? 'var(--paper)' : 'var(--ink-soft)' }}
              >
                {specialtyFilter === spec && (
                  <motion.div
                    layoutId="activeFilter"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'var(--black)' }}
                    transition={{ ...SPRING }}
                  />
                )}
                <span className="relative z-10">{specialtyLabels[spec]}</span>
              </button>
            ))}
          </motion.div>

          {/* Search + sort row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14, ease: EASE_OUT }}
            className="flex flex-col md:flex-row gap-3 mb-8"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
                style={{ color: searchFocused ? 'var(--ink)' : 'var(--ink-faint)' }}
              />
              <input
                type="text"
                placeholder="Search by name or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="cg-input pl-11"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" size={16} style={{ color: 'var(--ink-faint)' }} />
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
                className="cg-input pl-11 pr-10 appearance-none cursor-pointer"
                style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}>
                {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" size={16} style={{ color: 'var(--ink-faint)' }} />
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="cg-input pl-11 pr-10 appearance-none cursor-pointer"
                style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}>
                <option value="default">Sort By</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Top Rated</option>
              </select>
            </div>
          </motion.div>

          {/* Refine row: price + availability + save */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: EASE_OUT }}
            className="flex flex-col lg:flex-row lg:items-end gap-4 mb-6"
          >
            <div className="w-full lg:max-w-xs">
              <label className="text-xs uppercase tracking-[0.14em] block mb-2" style={{ color: 'var(--ink-faint)' }}>Price range</label>
              <PriceRange min={priceBounds.min} max={priceBounds.max} value={priceRange} onChange={setPriceRange} />
            </div>

            <button
              type="button"
              onClick={() => setAvailableNow(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-colors shrink-0"
              style={{
                background: availableNow ? 'var(--black)' : 'var(--card-cream)',
                border: `1px solid ${availableNow ? 'var(--black)' : 'var(--line-strong)'}`,
                color: availableNow ? 'var(--paper)' : 'var(--ink)',
              }}
            >
              <Zap size={14} /> Available now
            </button>

            <div className="flex-1" />

            {/* Save current search */}
            {anyFilter && (
              showSaveInput ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveSearch(); if (e.key === 'Escape') setShowSaveInput(false); }}
                    placeholder="Name this search"
                    className="cg-input py-2"
                    style={{ width: 180 }}
                  />
                  <button onClick={handleSaveSearch} className="btn-primary py-2 px-4 text-sm">Save</button>
                  <button onClick={() => setShowSaveInput(false)} className="p-2 rounded-full" style={{ color: 'var(--ink-soft)' }}><X size={16} /></button>
                </div>
              ) : (
                <button onClick={() => setShowSaveInput(true)} className="btn-secondary py-2.5 px-4 text-sm shrink-0">
                  <Bookmark size={14} /> Save search
                </button>
              )
            )}
            {anyFilter && (
              <button onClick={clearAll} className="text-sm shrink-0 transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-soft)' }}>
                Clear all
              </button>
            )}
          </motion.div>

          {/* Saved searches */}
          {savedSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>Saved:</span>
              {savedSearches.map(s => (
                <span key={s.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm" style={{ background: 'var(--card-cream)', border: '1px solid var(--line-strong)', color: 'var(--ink)' }}>
                  <button onClick={() => applySaved(s)} className="hover:underline">{s.name}</button>
                  <button onClick={() => setSavedSearches(deleteSavedSearch(s.id))} aria-label="Delete saved search" className="w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(27,24,19,0.06)]" style={{ color: 'var(--ink-faint)' }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Inline counter */}
          <p className="text-xs uppercase tracking-[0.14em] mb-6" style={{ color: 'var(--ink-faint)' }}>
            {filteredCoaches.length} coach{filteredCoaches.length !== 1 ? 'es' : ''} found
          </p>

          {/* Floating count pill */}
          <AnimatePresence>
            <motion.div
              key={filteredCoaches.length}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.9 }}
              transition={SPRING}
              className="fixed bottom-8 right-8 z-40 pointer-events-none hidden md:block"
            >
              <div
                className="rounded-full px-5 py-3 flex items-center gap-3"
                style={{ background: 'var(--card-cream)', border: '1px solid var(--line-strong)', boxShadow: '0 14px 40px rgba(27,24,19,0.12)' }}
              >
                <span className="font-display text-3xl leading-none" style={{ color: 'var(--ink)' }}>
                  {filteredCoaches.length}
                </span>
                <span className="text-[11px] uppercase tracking-[0.14em] leading-tight" style={{ color: 'var(--ink-soft)' }}>
                  Coach{filteredCoaches.length !== 1 ? 'es' : ''}<br />found
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {filteredCoaches.length > 0 ? (
              <motion.div
                key={`${specialtyFilter}-${locationFilter}-${sortOption}`}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={{ visible: { transition: { staggerChildren: prefersReduced ? 0 : 0.05 } } }}
                initial="hidden"
                animate="visible"
              >
                {filteredCoaches.map((coach) => {
                  const selected = compareIds.includes(coach.id);
                  const atLimit = compareIds.length >= 3 && !selected;
                  return (
                    <motion.div
                      key={coach.id}
                      className="relative"
                      variants={{
                        hidden:   { opacity: 0, y: 24 },
                        visible:  { opacity: 1, y: 0, transition: { ...SPRING } },
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCompare(coach.id)}
                        disabled={atLimit}
                        aria-label={selected ? 'Remove from compare' : 'Add to compare'}
                        title={atLimit ? 'Compare up to 3' : 'Compare'}
                        className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                        style={{
                          background: selected ? 'var(--black)' : 'rgba(251,250,246,0.92)',
                          border: `1px solid ${selected ? 'var(--black)' : 'var(--line-strong)'}`,
                          color: selected ? 'var(--paper)' : 'var(--ink-soft)',
                        }}
                      >
                        {selected ? <Check size={15} /> : <GitCompare size={14} />}
                      </button>
                      <CoachCard coach={coach} />
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center py-20 px-6 rounded-3xl"
                style={{ border: '1px dashed var(--line-strong)', background: 'var(--card-cream)' }}
              >
                <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'var(--paper-warm)' }}>
                  <Search size={24} style={{ color: 'var(--ink-faint)' }} />
                </div>
                <h3 className="font-display text-2xl mb-2" style={{ color: 'var(--ink)' }}>No coaches match those filters</h3>
                <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: 'var(--ink-soft)' }}>
                  {availableNow
                    ? 'Try turning off “Available now,” widening the price range, or clearing a filter.'
                    : 'Try a wider price range, a different specialty, or another location.'}
                </p>
                <button onClick={clearAll} className="btn-primary py-2.5 px-6 text-sm">Clear all filters</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Compare bar */}
        <AnimatePresence>
          {compareIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              transition={SPRING}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="flex items-center gap-4 pl-5 pr-3 py-3 rounded-full"
                style={{ background: 'var(--card-cream)', border: '1px solid var(--line-strong)', boxShadow: '0 16px 40px rgba(27,24,19,0.16)' }}>
                <div className="flex -space-x-2">
                  {compareCoaches.map(c => (
                    <span key={c.id} className="w-8 h-8 rounded-full overflow-hidden" style={{ border: '2px solid var(--card-cream)', background: 'var(--paper-warm)' }}>
                      {c.avatar_url
                        ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
                        : <span className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--ink-faint)' }}>{c.name?.charAt(0)}</span>}
                    </span>
                  ))}
                </div>
                <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{compareIds.length} selected</span>
                <button
                  onClick={() => setShowCompare(true)}
                  disabled={compareIds.length < 2}
                  className="btn-primary py-2 px-5 text-sm disabled:opacity-40"
                >
                  Compare
                </button>
                <button onClick={() => setCompareIds([])} aria-label="Clear compare"
                  className="p-2 rounded-full transition-colors hover:bg-[rgba(27,24,19,0.06)]" style={{ color: 'var(--ink-soft)' }}>
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCompare && (
            <CompareModal coaches={compareCoaches} onClose={() => setShowCompare(false)} navigate={navigate} />
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

/* ── Dual-thumb price range ──────────────────────────────────────── */
function PriceRange({ min, max, value, onChange }: {
  min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void;
}) {
  const span = Math.max(1, max - min);
  const [lo, hi] = value;
  const loPct = ((lo - min) / span) * 100;
  const hiPct = ((hi - min) / span) * 100;
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--ink)' }}>
        <span>${lo}</span><span>${hi}{hi >= max ? '+' : ''}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full" style={{ background: 'var(--black)', left: `${loPct}%`, right: `${100 - hiPct}%` }} />
        <input type="range" min={min} max={max} value={lo} aria-label="Minimum price"
          onChange={e => onChange([Math.min(Number(e.target.value), hi), hi])}
          className="cg-range absolute inset-0 w-full" />
        <input type="range" min={min} max={max} value={hi} aria-label="Maximum price"
          onChange={e => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className="cg-range absolute inset-0 w-full" />
      </div>
    </div>
  );
}

/* ── Compare modal ───────────────────────────────────────────────── */
function CompareModal({ coaches, onClose, navigate }: {
  coaches: CoachProfile[]; onClose: () => void; navigate: (to: string) => void;
}) {
  const rows: { label: string; render: (c: CoachProfile) => ReactNode }[] = [
    { label: 'Specialty', render: c => <span className="capitalize">{c.specialty}{c.secondary_specialty ? `, ${c.secondary_specialty}` : ''}</span> },
    { label: 'Price', render: c => <span className="font-display text-xl">${c.price_per_session}</span> },
    { label: 'Rating', render: c => <span className="inline-flex items-center gap-1"><Star size={12} fill="var(--c-reschedule)" style={{ color: 'var(--c-reschedule)' }} />{c.rating?.toFixed(1)} ({c.reviews ?? 0})</span> },
    { label: 'Experience', render: c => <span>{c.years_experience ? `${c.years_experience}+ yrs` : '—'}</span> },
    { label: 'Location', render: c => <span>{c.city && c.state ? `${c.city}, ${c.state}` : '—'}</span> },
    { label: 'Instant book', render: c => (c as any).instant_book ? <Check size={15} style={{ color: 'var(--c-confirmed)' }} /> : <span style={{ color: 'var(--ink-faint)' }}>—</span> },
    { label: 'Sessions', render: c => <span>{(c as any).location_modes ? enabledLocationModes((c as any).location_modes).map((m: LocationMode) => LOCATION_MODE_META[m].short).join(', ') : 'In person'}</span> },
    { label: 'Top skills', render: c => <span className="text-xs">{(c.skills || []).slice(0, 3).join(' · ') || '—'}</span> },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(27,24,19,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ background: 'var(--card-cream)', border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between p-6 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
          <h3 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>Compare coaches</h3>
          <button onClick={onClose} className="p-2 rounded-full transition-colors hover:bg-[rgba(27,24,19,0.06)]" style={{ color: 'var(--ink-soft)' }}><X size={20} /></button>
        </div>
        <div className="overflow-auto p-6">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left align-bottom pb-4 pr-3" />
                {coaches.map(c => (
                  <th key={c.id} className="text-left align-bottom pb-4 px-3" style={{ minWidth: 140 }}>
                    <div className="w-14 h-14 rounded-2xl overflow-hidden mb-2" style={{ background: 'var(--paper-warm)' }}>
                      {c.avatar_url
                        ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
                        : <span className="w-full h-full flex items-center justify-center font-display text-2xl" style={{ color: 'var(--ink-faint)' }}>{c.name?.charAt(0)}</span>}
                    </div>
                    <p className="font-display text-lg leading-tight" style={{ color: 'var(--ink)' }}>{c.name}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="py-3 pr-3 text-xs uppercase tracking-wide align-top" style={{ color: 'var(--ink-faint)' }}>{row.label}</td>
                  {coaches.map(c => (
                    <td key={c.id} className="py-3 px-3 text-sm align-top" style={{ color: 'var(--ink)' }}>{row.render(c)}</td>
                  ))}
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid var(--line)' }}>
                <td />
                {coaches.map(c => (
                  <td key={c.id} className="py-4 px-3">
                    <button onClick={() => { onClose(); navigate(`/coaches/${c.id}`); }} className="btn-primary py-2 px-4 text-sm w-full justify-center">View</button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
