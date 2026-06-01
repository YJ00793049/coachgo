import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Calendar, Shield, CheckCircle2, MapPin, ExternalLink, Heart, Loader2, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import AnimatedCounter from '../components/AnimatedCounter';
import { SPRING, SPRING_BOUNCY } from '../tokens';
import { GlowingEffect } from '@/components/ui/glowing-effect-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="text-center">
        <Loader2 className="animate-spin mx-auto mb-4" size={40} style={{ color: '#4F8EF7' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading coach profile...</p>
      </div>
    </div>
  );

  if (!coach) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="text-center">
        <p className="text-white font-bold mb-4">Coach not found.</p>
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
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, prefersReduced ? 0 : -80]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.6]);
  const heroScale = useTransform(scrollY, [0, 400], [1, prefersReduced ? 1 : 1.08]);

  const sectionVariants = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 40 },
    visible: { opacity: 1, y: 0, transition: { ...SPRING } },
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-24 pt-20" style={{ background: '#080B14' }}>

        {/* Parallax Hero */}
        <section ref={heroRef} className="relative overflow-hidden py-20" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Ambient glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 60% 40%, rgba(79,142,247,0.12) 0%, transparent 65%)' }}
          />
          <motion.div
            style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
          >
            <div className="flex flex-col md:flex-row gap-12 items-center">
              {/* Avatar — 220px, glowing pulsing border */}
              <div className="relative shrink-0">
                {/* Pulsing glow ring */}
                <motion.div
                  className="absolute inset-[-4px] rounded-3xl pointer-events-none"
                  style={{ background: 'conic-gradient(from 0deg, #4F8EF7, #7C3AED, #06B6D4, #4F8EF7)' }}
                  animate={prefersReduced ? {} : { rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="relative w-[220px] h-[220px] rounded-3xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.04)', zIndex: 1 }}
                  initial={{ opacity: 0, scale: 0.85, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ ...SPRING }}
                  whileHover={{ scale: 1.04, boxShadow: '0 30px 80px rgba(79,142,247,0.35)' }}
                >
                  {coach.avatar_url ? (
                    <img src={coach.avatar_url} alt={coach.name} className="w-full h-full object-cover"
                      style={{ objectPosition: coach.avatar_position || 'center' }} referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl font-bold" style={{ color: 'rgba(255,255,255,0.1)' }}>
                      {coach.name?.charAt(0)}
                    </div>
                  )}
                </motion.div>
              </div>

              <motion.div
                className="flex-1 text-center md:text-left"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, delay: 0.1 }}
              >
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                  <span className="tag-badge capitalize">{coach.specialty}</span>
                  {coach.secondary_specialty && <span className="tag-badge capitalize">{coach.secondary_specialty}</span>}
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Star size={14} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                    <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>{displayRating} ({displayReviewCount} reviews)</span>
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                  <motion.h1
                    className="font-display text-5xl text-white"
                    variants={{ visible: { transition: { staggerChildren: prefersReduced ? 0 : 0.04 } } }}
                    initial="hidden"
                    animate="visible"
                    aria-label={coach.name}
                  >
                    {(coach.name || '').split('').map((ch: string, i: number) => (
                      <motion.span
                        key={i}
                        className="inline-block"
                        style={ch === ' ' ? { whiteSpace: 'pre' } : {}}
                        variants={{
                          hidden:  { opacity: 0, y: 40, rotate: -5 },
                          visible: { opacity: 1, y: 0, rotate: 0, transition: { ...SPRING_BOUNCY } },
                        }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </motion.h1>
                  <motion.button onClick={toggleFavorite}
                    className="p-3 rounded-full border transition-all"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      background: isFavorite ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                      borderColor: isFavorite ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
                      color: isFavorite ? '#ef4444' : 'rgba(255,255,255,0.5)',
                    }}>
                    <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                  </motion.button>
                </div>

                <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Professional Baseball Coach specializing in {coach.specialty}.
                </p>

                <div className="flex flex-wrap justify-center md:justify-start gap-6">
                  <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span className="text-sm">
                      <span className="font-bold text-white">$<AnimatedCounter to={coach.price_per_session} /></span> / session
                    </span>
                  </div>
                  {coach.years_experience > 0 && (
                    <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <span className="text-sm">
                        <span className="font-bold text-white"><AnimatedCounter to={coach.years_experience} />+</span> years experience
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <Shield size={16} style={{ color: '#4F8EF7' }} />
                    <span className="text-sm">Vetted Specialist</span>
                  </div>
                  {coach.city && coach.state && (
                    <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <MapPin size={16} style={{ color: '#4F8EF7' }} />
                      <span className="text-sm">{coach.city}, {coach.state}</span>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                className="shrink-0 flex flex-col gap-3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, delay: 0.2 }}
              >
                <Link to={`/book/${coach.id}`} className="btn-primary px-12 py-4 text-center">Book a Session</Link>
                {user && coach.user_id && coach.user_id.length > 5 && (
                  <button
                    onClick={async () => {
                      if (!user || !coach) return;
                      // Find or create conversation
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
                    }}
                    className="btn-secondary px-12 py-3 flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} /> Message Coach
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">

            {/* Left */}
            <div className="lg:col-span-2 space-y-16">

              <motion.section
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
              >
                <h2 className="font-display text-3xl text-white mb-6">About the Coach</h2>
                <p className="leading-relaxed text-lg whitespace-pre-line mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {coach.bio}
                </p>

                {coach.affiliations && coach.affiliations.length > 0 && (
                  <div className="mt-12 pt-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-8" style={{ color: 'rgba(255,255,255,0.2)' }}>Professional Affiliations</h3>
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
                            whileHover={{ scale: 1.1, y: -4 }}
                            className="group relative shrink-0"
                          >
                            <img src={aff.logoUrl} alt={aff.name} className="h-20 w-auto transition-all duration-500 object-contain"
                              referrerPolicy="no-referrer" crossOrigin="anonymous" />
                            <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold uppercase tracking-widest whitespace-nowrap px-2 py-1 rounded z-[100] pointer-events-none"
                              style={{ background: '#4F8EF7', color: 'white' }}>
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
                  <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4rem' }}>
                    <h2 className="font-display text-3xl text-white mb-6">Coach Introduction</h2>
                    <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
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
                  <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4rem' }}>
                    <h2 className="font-display text-3xl text-white mb-6">Coach Introduction</h2>
                    <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9', background: 'rgba(0,0,0,0.4)' }}>
                      <video
                        src={coach.video_url}
                        controls
                        className="w-full h-full"
                        style={{ objectFit: 'contain' }}
                        playsInline
                      />
                    </div>
                  </section>
                );
                return null;
              })()}

              {coach.street_address && (
                <motion.section
                  variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4rem' }}
                >
                  <h2 className="font-display text-3xl text-white mb-6">Location</h2>
                  <div className="p-8 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-8"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(79,142,247,0.15)', color: '#4F8EF7' }}>
                        <MapPin size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-white mb-1">{coach.street_address}</h4>
                        <p style={{ color: 'rgba(255,255,255,0.4)' }}>{coach.city}, {coach.state} {coach.zip_code}</p>
                      </div>
                    </div>
                    <motion.a
                      href={mapsUrl} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-2 py-3 px-6"
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    >
                      <ExternalLink size={18} /> Get Directions
                    </motion.a>
                  </div>
                </motion.section>
              )}

              {coach.skills && coach.skills.length > 0 && (
                <motion.section
                  variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4rem' }}
                >
                  <h2 className="font-display text-3xl text-white mb-6">Specialized Skills</h2>
                  <div className="flex flex-wrap gap-3">
                    {coach.skills.map((skill: string, i: number) => (
                      <motion.div
                        key={skill}
                        initial={{ opacity: 0, scale: 0.85 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05, ...SPRING }}
                        whileHover={{ scale: 1.06, y: -2 }}
                        className="relative"
                      >
                        <GlowingEffect disabled={false} spread={20} borderWidth={1} proximity={40} />
                        <div
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-default relative"
                          style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', color: 'rgba(255,255,255,0.7)' }}
                        >
                          <CheckCircle2 size={14} style={{ color: 'rgba(79,142,247,0.7)' }} />
                          {skill}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              <motion.section
                variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4rem' }}
              >
                <h2 className="font-display text-3xl text-white mb-6">Session Types</h2>
                <div className="flex flex-wrap gap-4">
                  {sessionTypes.map((type, i) => (
                    <motion.div
                      key={type.label}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, ...SPRING }}
                      whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(79,142,247,0.15)', willChange: 'transform' }}
                      className="p-6 rounded-2xl flex-1 min-w-[280px] max-w-[400px]"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <h4 className="font-bold text-white mb-2">{type.label}</h4>
                      {type.price != null && type.price > 0 ? (
                        <p className="text-sm font-bold" style={{ color: '#4F8EF7' }}>${type.price} / session</p>
                      ) : (
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Intensive focused training designed for maximum growth.</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.section>

              {/* Reviews Section */}
              <motion.section
                variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4rem' }}
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-display text-3xl text-white">Reviews</h2>
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <Star size={16} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                      <span className="font-bold text-white">{avgRating}</span>
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>({reviews.length} reviews)</span>
                    </div>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="p-12 rounded-3xl text-center" style={{ border: '1px dashed rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                    <Star size={32} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="font-bold text-white mb-2">No reviews yet</p>
                    <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Be the first to book a session and leave a review.</p>
                    <Link to={`/book/${coach.id}`} className="btn-primary py-2 px-6 text-sm">Book a Session</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review: any, i: number) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06, ...SPRING }}
                        whileHover={{ x: 4 }}
                        className="p-6 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                              style={{ background: 'rgba(79,142,247,0.15)', color: '#4F8EF7' }}>
                              {review.player_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{review.player_name || 'Player'}</p>
                              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                {review.created_at?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) || ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(star => (
                              <motion.span
                                key={star}
                                initial={{ scale: 0, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ ...SPRING_BOUNCY, delay: i * 0.06 + star * 0.1 }}
                                style={{ display: 'inline-flex' }}
                              >
                                <Star size={14} fill={star <= review.rating ? '#F59E0B' : 'transparent'}
                                  style={{ color: star <= review.rating ? '#F59E0B' : 'rgba(255,255,255,0.15)' }} />
                              </motion.span>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{review.comment}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>
            </div>

            {/* Right — Animated Booking Sidebar */}
            <div className="space-y-6">
              <motion.div
                className="relative rounded-3xl sticky top-28"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, delay: 0.3 }}
              >
                <GlowingEffect disabled={false} spread={50} borderWidth={2} proximity={80} />
              <div
                className="rounded-3xl p-8"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Calendar size={20} style={{ color: '#4F8EF7' }} /> Book a Session
                </h3>

                {Object.keys(availability).length > 0 ? (
                  <div className="space-y-2 mb-6">
                    {Object.entries(availability)
                      .filter(([_, slots]) => (slots as string[]).length > 0)
                      .slice(0, 5)
                      .map(([day, slots]) => (
                        <div key={day} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span className="text-sm font-medium text-white">{day}</span>
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{(slots as string[]).length} slot{(slots as string[]).length !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Contact coach for availability.</p>
                )}

                <ShimmerButton
                  shimmerColor="#4F8EF7"
                  shimmerDuration="2.5s"
                  borderRadius="12px"
                  background="linear-gradient(135deg, #4F8EF7 0%, #2563EB 100%)"
                  className="w-full mb-3 font-bold py-4 text-base"
                  onClick={() => window.location.href = `/book/${coach.id}`}
                >
                  Book Now — ${coach.price_per_session}
                </ShimmerButton>
                {user && (
                  <button
                    onClick={async () => {
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
                    }}
                    className="btn-secondary w-full flex items-center justify-center gap-2 mb-4"
                  >
                    <MessageSquare size={16} /> Message Coach
                  </button>
                )}
                {coach.packages && coach.packages.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {coach.packages.map((pkg, i) => (
                      <Link key={i} to={`/book/${coach.id}?pkg=${pkg.sessions}`}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-white/10"
                        style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', color: '#4F8EF7' }}>
                        <span>{pkg.label}</span>
                        <span className="text-white">${Math.round(coach.price_per_session * pkg.sessions * (1 - pkg.discount_pct / 100))}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {coach.venmo_handle && (
                  <div className="flex items-center gap-2 justify-center mb-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: '#008DF5' }}>
                      V
                    </div>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Pay via Venmo <span className="text-white font-semibold">@{coach.venmo_handle}</span>
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-center uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>
                  Payment due after coach confirms
                </p>
              </div>
              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}