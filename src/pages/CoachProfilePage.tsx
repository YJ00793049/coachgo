import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Calendar, Shield, CheckCircle2, MapPin, ExternalLink, Heart, Loader2, X, MessageSquare, Zap } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import AnimatedCounter from '../components/AnimatedCounter';
import { SPRING, SPRING_BOUNCY, EASE_OUT } from '../tokens';
import { enabledLocationModes, LOCATION_MODE_META } from '../utils/scheduling';
import { addRecentCoach } from '../utils/discovery';
import { track } from '../utils/analytics';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDoc, orderBy, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { MOCK_COACHES } from './CoachesPage';
import { CoachProfile } from '../types';

interface Review {
  id: string;
  player_id: string;
  player_name: string;
  rating: number;
  comment: string;
  created_at: any;
}

export default function CoachProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  // Resolve the real Firebase UID from the URL's numeric id
  const coachUid = MOCK_COACHES.find(c => c.id === id)?.user_id || id || '';
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  // Always fetch from Firestore and merge on top of hardcoded data
  useEffect(() => {
    if (!id) return;
    const fetchCoach = async () => {
      setLoading(true);
      const base = MOCK_COACHES.find(c => c.id === id) || null;
      try {
        const snap = await getDoc(doc(db, 'coach_profiles', coachUid));
        if (snap.exists()) {
          const d = snap.data();
          setCoach({
            ...(base || {}),
            id: id!,
            user_id: d.user_id || base?.user_id || coachUid,
            specialty: d.specialty || base?.specialty || 'hitting',
            secondary_specialty: d.secondary_specialty || base?.secondary_specialty,
            bio: d.bio || base?.bio || '',
            certifications: d.certifications || base?.certifications || [],
            years_experience: d.years_experience || base?.years_experience || 0,
            price_per_session: d.price_per_session || base?.price_per_session || 0,
            rating: base?.rating || d.rating || 0,
            reviews: base?.reviews || d.reviews || 0,
            session_types: d.session_types || base?.session_types || [],
            availability: d.availability || {},
            is_active: d.is_active ?? base?.is_active ?? true,
            name: base?.name || d.name || 'Coach',
            // Firestore photo_url overrides hardcoded avatar_url
            avatar_url: d.photo_url || base?.avatar_url,
            avatar_position: base?.avatar_position || d.avatar_position,
            street_address: base?.street_address || d.street_address,
            city: base?.city || d.city,
            state: base?.state || d.state,
            zip_code: base?.zip_code || d.zip_code,
            skills: base?.skills || d.skills || [],
            affiliations: base?.affiliations || d.affiliations || [],
            venmo_handle: d.venmo_handle || base?.venmo_handle,
            video_url: d.video_url || base?.video_url,
            packages: d.packages || base?.packages,
            instant_book: d.instant_book === true,
            location_modes: d.location_modes,
            academy_name: d.academy_name || base?.academy_name,
            gallery_urls: Array.isArray(d.gallery_urls) ? d.gallery_urls : base?.gallery_urls,
          } as CoachProfile);
          if (d.availability) setAvailability(d.availability);
        } else if (base) {
          setCoach(base);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'coach_profiles');
        if (base) setCoach(base);
      } finally {
        setLoading(false);
      }
    };
    fetchCoach();
  }, [id]);

  // Favorites listener
  useEffect(() => {
    if (!user || !id) return;
    const q = query(
      collection(db, 'favorites'),
      where('user_id', '==', user.uid),
      where('coach_id', '==', id)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) { setIsFavorite(true); setFavoriteId(snap.docs[0].id); }
      else { setIsFavorite(false); setFavoriteId(null); }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'favorites'));
    return () => unsub();
  }, [user, id]);

  // Reviews listener
  useEffect(() => {
    if (!coachUid) return;
    const q = query(
      collection(db, 'reviews'),
      where('coach_id', '==', coachUid),
      orderBy('created_at', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Review[];
      setReviews(data);
      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'reviews'));
    return () => unsub();
  }, [coachUid]);

  // Log to "recently viewed"
  useEffect(() => {
    if (coach) {
      addRecentCoach({
        id: coach.id,
        name: coach.name || 'Coach',
        specialty: coach.specialty,
        avatar_url: coach.avatar_url,
        price: coach.price_per_session,
      });
    }
  }, [coach?.id]);

  // Log a profile view (analytics) — once per browser session per coach,
  // and never count the coach viewing their own profile.
  useEffect(() => {
    if (!coachUid) return;
    if (user && user.uid === coachUid) return;
    const key = `cg_viewed_${coachUid}`;
    try { if (sessionStorage.getItem(key)) return; } catch { /* ignore */ }
    addDoc(collection(db, 'coach_views'), {
      coach_id: coachUid,
      viewer_id: user?.uid || 'anon',
      created_at: serverTimestamp(),
    }).then(() => { try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ } })
      .catch(() => { /* non-critical */ });
    track('coach_view', { coach_id: coachUid });
  }, [coachUid, user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
      <div className="text-center">
        <Loader2 className="animate-spin mx-auto mb-4" size={36} style={{ color: 'var(--ink-soft)' }} />
        <p style={{ color: 'var(--ink-soft)' }}>Loading coach profile…</p>
      </div>
    </div>
  );

  if (!coach) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
      <div className="text-center">
        <p className="font-display text-2xl mb-4" style={{ color: 'var(--ink)' }}>Coach not found.</p>
        <Link to="/coaches" className="btn-secondary">Browse Coaches</Link>
      </div>
    </div>
  );

  const toggleFavorite = async () => {
    if (!user || !id) return;
    try {
      if (isFavorite && favoriteId) {
        await deleteDoc(doc(db, 'favorites', favoriteId));
      } else {
        await addDoc(collection(db, 'favorites'), {
          user_id: user.uid,
          coach_id: id,
          created_at: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, isFavorite ? OperationType.DELETE : OperationType.CREATE, 'favorites');
    }
  };

  const addressQuery = encodeURIComponent(`${coach.street_address} ${coach.city} ${coach.state} ${coach.zip_code}`);
  const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
  const mapsUrl = isApple
    ? `https://maps.apple.com/?q=${addressQuery}`
    : `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;


  const sessionTypes: { label: string; price?: number }[] = (coach as any).session_types_with_price?.length > 0
    ? (coach as any).session_types_with_price.map((s: any) => ({ label: s.label, price: s.price }))
    : [
        { label: '1-on-1 Private', price: coach.price_per_session },
        ...(['Robert Congalton', 'Casey Henderson', 'Brandon Decker'].includes(coach.name || '')
          ? [{ label: 'Group Session', price: Math.round(coach.price_per_session * 0.4) }]
          : []),
      ];

  const displayRating = avgRating ?? coach.rating;
  const displayReviewCount = reviews.length > 0 ? reviews.length : (coach.reviews ?? 0);

  return (
    <CoachProfileInner
      coach={coach}
      isFavorite={isFavorite}
      toggleFavorite={toggleFavorite}
      availability={availability}
      reviews={reviews}
      avgRating={avgRating}
      displayRating={displayRating}
      displayReviewCount={displayReviewCount}
      sessionTypes={sessionTypes}
      mapsUrl={mapsUrl}
      user={user}
      navigate={navigate}
    />
  );
}

function CoachProfileInner({ coach, isFavorite, toggleFavorite, availability, reviews, avgRating, displayRating, displayReviewCount, sessionTypes, mapsUrl, user, navigate }: any) {
  const prefersReduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  const sectionVariants = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { ...SPRING } },
  };

  const messageCoach = async () => {
    if (!user || !coach) return;
    try {
      const { getDocs, query, collection, where } = await import('firebase/firestore');
      const q = query(
        collection(db, 'conversations'),
        where('coach_id', '==', coach.user_id),
        where('player_id', '==', user.uid)
      );
      const snap = await getDocs(q);
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const playerName = userSnap.exists() ? userSnap.data().name || user.displayName || 'Player' : user.displayName || 'Player';
      const convoId = !snap.empty ? snap.docs[0].id : (await addDoc(collection(db, 'conversations'), {
        coach_id: coach.user_id,
        player_id: user.uid,
        participants: [coach.user_id, user.uid],
        last_message: '',
        last_message_at: serverTimestamp(),
        unread_count_coach: 0,
        unread_count_player: 0,
        coach_name: coach.name,
        player_name: playerName,
      })).id;
      navigate(`/messages/${convoId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'conversations');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-24 pt-20" style={{ background: 'var(--paper)' }}>

        {/* Hero */}
        <section ref={heroRef} className="relative overflow-hidden py-16" style={{ background: 'var(--paper-warm)', borderBottom: '1px solid var(--line)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row gap-10 lg:gap-12 items-center">
              {/* Avatar */}
              <motion.div
                className="relative shrink-0 w-[200px] h-[200px] rounded-[28px] overflow-hidden"
                style={{ background: 'var(--card-cream)', border: '1px solid var(--line)', boxShadow: '0 20px 60px rgba(27,24,19,0.10)' }}
                initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.78, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              >
                {coach.avatar_url ? (
                  <img src={coach.avatar_url} alt={coach.name} className="w-full h-full object-cover"
                    style={{ objectPosition: coach.avatar_position || 'center' }} referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-6xl" style={{ color: 'var(--ink-faint)' }}>
                    {coach.name?.charAt(0)}
                  </div>
                )}
              </motion.div>

              <motion.div
                className="flex-1 text-center md:text-left"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.08 }}
              >
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2.5 mb-4">
                  <span className="eyebrow capitalize">{coach.specialty}</span>
                  {coach.secondary_specialty && <span className="eyebrow capitalize">{coach.secondary_specialty}</span>}
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: 'var(--card-cream)', border: '1px solid var(--line)' }}>
                    <Star size={13} fill="var(--c-reschedule)" style={{ color: 'var(--c-reschedule)' }} />
                    <span className="text-xs" style={{ color: 'var(--ink)' }}>{displayRating} ({displayReviewCount} reviews)</span>
                  </div>
                  {coach.instant_book && (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ background: 'var(--black)', color: 'var(--paper)' }}>
                      <Zap size={12} /> Instant book
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center md:justify-start gap-4 mb-3">
                  <h1 className="display-lg" aria-label={coach.name}>{coach.name}</h1>
                  <button onClick={toggleFavorite}
                    className="p-3 rounded-full transition-colors shrink-0"
                    aria-label="Toggle favorite"
                    style={{
                      background: isFavorite ? 'rgba(188,90,72,0.12)' : 'transparent',
                      border: `1px solid ${isFavorite ? 'rgba(188,90,72,0.3)' : 'var(--line-strong)'}`,
                      color: isFavorite ? 'var(--c-declined)' : 'var(--ink-soft)',
                    }}>
                    <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <p className="text-lg mb-7" style={{ color: 'var(--ink-soft)' }}>
                  Professional baseball coach specializing in {coach.specialty}.
                </p>

                <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3">
                  <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                    <span className="font-display text-xl" style={{ color: 'var(--ink)' }}>$<AnimatedCounter to={coach.price_per_session} /></span> / session
                  </span>
                  {coach.years_experience > 0 && (
                    <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                      <span className="font-display text-xl" style={{ color: 'var(--ink)' }}><AnimatedCounter to={coach.years_experience} />+</span> years experience
                    </span>
                  )}
                  <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
                    <Shield size={16} style={{ color: 'var(--ink-faint)' }} /> Vetted specialist
                  </span>
                  {coach.city && coach.state && (
                    <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
                      <MapPin size={16} style={{ color: 'var(--ink-faint)' }} /> {coach.city}, {coach.state}
                    </span>
                  )}
                  {coach.academy_name && (
                    <Link to={`/coaches?academy=${encodeURIComponent(coach.academy_name)}`}
                      className="text-sm transition-colors hover:text-[var(--ink)] underline-offset-2 hover:underline"
                      style={{ color: 'var(--ink-soft)' }}>
                      @ {coach.academy_name}
                    </Link>
                  )}
                </div>
              </motion.div>

              <motion.div
                className="shrink-0 flex flex-col gap-3 w-full md:w-auto"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.16 }}
              >
                <Link to={`/book/${coach.id}`} className="btn-primary px-10 py-4 text-center justify-center"><Calendar size={17} /> Book a session</Link>
                {user && coach.user_id && coach.user_id.length > 5 && (
                  <button onClick={messageCoach} className="btn-secondary px-10 py-3 flex items-center justify-center gap-2">
                    <MessageSquare size={16} /> Message coach
                  </button>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">

            {/* Left */}
            <div className="lg:col-span-2 space-y-14">

              <motion.section variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
                <h2 className="display-md mb-6">About the coach</h2>
                <p className="leading-relaxed text-lg whitespace-pre-line mb-8" style={{ color: 'var(--ink-soft)' }}>
                  {coach.bio}
                </p>

                {coach.affiliations && coach.affiliations.length > 0 && (
                  <div className="mt-12 pt-12" style={{ borderTop: '1px solid var(--line)' }}>
                    <h3 className="text-xs uppercase tracking-[0.14em] mb-8" style={{ color: 'var(--ink-faint)' }}>Professional affiliations</h3>
                    <div className="overflow-x-hidden">
                      <motion.div
                        className="flex gap-10 items-center cursor-grab active:cursor-grabbing pb-2"
                        drag="x"
                        dragConstraints={{ left: -(Math.max(0, coach.affiliations.length - 1) * 120), right: 0 }}
                        dragElastic={0.1}
                        whileDrag={{ scale: 0.98 }}
                        style={{ width: 'max-content' }}
                      >
                        {coach.affiliations.map((aff: any, idx: number) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.08, ...SPRING }}
                            whileHover={{ scale: 1.06, y: -3 }}
                            className="group relative shrink-0"
                          >
                            <img src={aff.logoUrl} alt={aff.name} className="h-16 w-auto object-contain"
                              referrerPolicy="no-referrer" crossOrigin="anonymous" />
                            <div className="absolute -bottom-7 left-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] tracking-wide whitespace-nowrap px-2 py-1 rounded z-[100] pointer-events-none"
                              style={{ background: 'var(--black)', color: 'var(--paper)' }}>
                              {aff.name}
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                  </div>
                )}
              </motion.section>

              {coach.video_url && (() => {
                const youtubeId = coach.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
                const isDirectVideo = !youtubeId && (
                  coach.video_url.includes('firebasestorage.googleapis.com') ||
                  coach.video_url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)
                );
                if (youtubeId) return (
                  <section style={{ borderTop: '1px solid var(--line)', paddingTop: '3.5rem' }}>
                    <h2 className="display-md mb-6">Coach introduction</h2>
                    <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9', border: '1px solid var(--line)' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        title="Coach Introduction"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                        style={{ border: 'none' }}
                      />
                    </div>
                  </section>
                );
                if (isDirectVideo) return (
                  <section style={{ borderTop: '1px solid var(--line)', paddingTop: '3.5rem' }}>
                    <h2 className="display-md mb-6">Coach introduction</h2>
                    <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--paper-warm)', border: '1px solid var(--line)' }}>
                      <video src={coach.video_url} controls className="w-full h-full" style={{ objectFit: 'contain' }} playsInline />
                    </div>
                  </section>
                );
                return null;
              })()}

              {coach.gallery_urls && coach.gallery_urls.length > 0 && (
                <motion.section
                  variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                  style={{ borderTop: '1px solid var(--line)', paddingTop: '3.5rem' }}
                >
                  <h2 className="display-md mb-6">Gallery</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {coach.gallery_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="aspect-square rounded-2xl overflow-hidden block" style={{ border: '1px solid var(--line)' }}>
                        <img src={url} alt={`${coach.name} ${i + 1}`} loading="lazy" referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                      </a>
                    ))}
                  </div>
                </motion.section>
              )}

              {coach.street_address && (
                <motion.section
                  variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                  style={{ borderTop: '1px solid var(--line)', paddingTop: '3.5rem' }}
                >
                  <h2 className="display-md mb-6">Location</h2>
                  <div className="rounded-3xl overflow-hidden cg-card">
                    <div className="p-7 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--paper-warm)', color: 'var(--ink)' }}>
                          <MapPin size={22} />
                        </div>
                        <div>
                          <h4 className="text-lg mb-1" style={{ color: 'var(--ink)' }}>{coach.street_address}</h4>
                          <p style={{ color: 'var(--ink-soft)' }}>{coach.city}, {coach.state} {coach.zip_code}</p>
                        </div>
                      </div>
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2 py-3 px-6 shrink-0">
                        <ExternalLink size={18} /> Get directions
                      </a>
                    </div>
                    <iframe
                      title="Coach location map"
                      loading="lazy"
                      className="w-full"
                      style={{ border: 0, height: 260, borderTop: '1px solid var(--line)' }}
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(`${coach.street_address || ''} ${coach.city || ''} ${coach.state || ''} ${coach.zip_code || ''}`)}&output=embed`}
                    />
                  </div>
                </motion.section>
              )}

              {coach.skills && coach.skills.length > 0 && (
                <motion.section
                  variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                  style={{ borderTop: '1px solid var(--line)', paddingTop: '3.5rem' }}
                >
                  <h2 className="display-md mb-6">Specialized skills</h2>
                  <div className="flex flex-wrap gap-3">
                    {coach.skills.map((skill: string, i: number) => (
                      <motion.div
                        key={skill}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05, ...SPRING }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                        style={{ background: 'var(--card-cream)', border: '1px solid var(--line-strong)', color: 'var(--ink)' }}
                      >
                        <CheckCircle2 size={14} style={{ color: 'var(--c-confirmed)' }} />
                        {skill}
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              <motion.section
                variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                style={{ borderTop: '1px solid var(--line)', paddingTop: '3.5rem' }}
              >
                <h2 className="display-md mb-6">Session types</h2>
                <div className="flex flex-wrap gap-4">
                  {sessionTypes.map((type: { label: string; price?: number }) => (
                    <div key={type.label} className="cg-card p-6 flex-1 min-w-[260px] max-w-[400px]">
                      <h4 className="font-display text-2xl mb-1" style={{ color: 'var(--ink)' }}>{type.label}</h4>
                      {type.price != null && type.price > 0 ? (
                        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>${type.price} / session</p>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Intensive focused training designed for maximum growth.</p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* Reviews */}
              <motion.section
                variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                style={{ borderTop: '1px solid var(--line)', paddingTop: '3.5rem' }}
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="display-md">Reviews</h2>
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--card-cream)', border: '1px solid var(--line)' }}>
                      <Star size={15} fill="var(--c-reschedule)" style={{ color: 'var(--c-reschedule)' }} />
                      <span style={{ color: 'var(--ink)' }}>{avgRating}</span>
                      <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>({reviews.length} reviews)</span>
                    </div>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="p-12 rounded-3xl text-center" style={{ border: '1px dashed var(--line-strong)', background: 'var(--card-cream)' }}>
                    <Star size={30} className="mx-auto mb-4" style={{ color: 'var(--ink-faint)' }} />
                    <p className="font-display text-2xl mb-2" style={{ color: 'var(--ink)' }}>No reviews yet</p>
                    <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>Be the first to book a session and leave a review.</p>
                    <Link to={`/book/${coach.id}`} className="btn-primary py-2 px-6 text-sm">Book a session</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review: any, i: number) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05, ...SPRING }}
                        className="cg-card p-6"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0"
                              style={{ background: 'var(--paper-warm)', color: 'var(--ink)' }}>
                              {review.player_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm" style={{ color: 'var(--ink)' }}>{review.player_name || 'Player'}</p>
                              <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                                {review.created_at?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) || ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} size={14} fill={star <= review.rating ? 'var(--c-reschedule)' : 'transparent'}
                                style={{ color: star <= review.rating ? 'var(--c-reschedule)' : 'var(--line-strong)' }} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{review.comment}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>
            </div>

            {/* Right — Booking Sidebar */}
            <div className="space-y-6">
              <motion.div
                className="sticky top-28"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.2 }}
              >
                <div className="cg-card p-7">
                  <h3 className="font-display text-2xl mb-6 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                    <Calendar size={20} style={{ color: 'var(--ink-soft)' }} /> Book a session
                  </h3>

                  {Object.keys(availability).length > 0 ? (
                    <div className="space-y-1 mb-6">
                      {Object.entries(availability)
                        .filter(([_, slots]) => (slots as string[]).length > 0)
                        .slice(0, 5)
                        .map(([day, slots]) => (
                          <div key={day} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--line)' }}>
                            <span className="text-sm" style={{ color: 'var(--ink)' }}>{day}</span>
                            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>{(slots as string[]).length} slot{(slots as string[]).length !== 1 ? 's' : ''}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>Contact coach for availability.</p>
                  )}

                  {coach.location_modes && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {enabledLocationModes(coach.location_modes).map((m) => (
                        <span key={m} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'var(--paper-warm)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}>
                          {LOCATION_MODE_META[m].label}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => window.location.href = `/book/${coach.id}`}
                    className="btn-primary w-full justify-center mb-3 py-4 text-base"
                  >
                    {coach.instant_book ? 'Book instantly' : 'Book now'} — ${coach.price_per_session}
                  </button>
                  {user && (
                    <button onClick={messageCoach} className="btn-secondary w-full flex items-center justify-center gap-2 mb-4">
                      <MessageSquare size={16} /> Message coach
                    </button>
                  )}
                  {coach.packages && coach.packages.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {coach.packages.map((pkg: any, i: number) => (
                        <Link key={i} to={`/book/${coach.id}?pkg=${pkg.sessions}`}
                          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors hover:bg-[rgba(27,24,19,0.04)]"
                          style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                          <span>{pkg.label}</span>
                          <span className="font-display text-lg">${Math.round(coach.price_per_session * pkg.sessions * (1 - pkg.discount_pct / 100))}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {coach.venmo_handle && (
                    <div className="flex items-center gap-2 justify-center mb-3">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: 'var(--c-venmo)' }}>
                        V
                      </div>
                      <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                        Pay via Venmo <span style={{ color: 'var(--ink)' }}>@{coach.venmo_handle}</span>
                      </p>
                    </div>
                  )}
                  <p className="text-[11px] text-center uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                    Payment due after coach confirms
                  </p>
                </div>
              </motion.div>
            </div>

          </div>
        </div>

        {/* Sticky mobile booking bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40"
          style={{ background: 'rgba(246,244,239,0.95)', borderTop: '1px solid var(--line)', backdropFilter: 'blur(10px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center gap-3 px-4 py-3" style={{ paddingRight: 88 }}>
            <div className="shrink-0">
              <p className="text-[11px] leading-none mb-1" style={{ color: 'var(--ink-faint)' }}>From</p>
              <p className="font-display text-xl leading-none" style={{ color: 'var(--ink)' }}>${coach.price_per_session}</p>
            </div>
            <Link to={`/book/${coach.id}`} className="btn-primary flex-1 justify-center py-3">
              {coach.instant_book ? 'Book instantly' : 'Book a session'}
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}