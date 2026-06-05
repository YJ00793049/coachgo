import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useSpring } from 'framer-motion';
import { CheckCircle2, ChevronRight, Loader2, Target, DollarSign, MapPin, User, Zap, CreditCard, Plus, X, Camera, Video, Upload } from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import PageTransition from '../components/PageTransition';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { getBrowserTimezone } from '../utils/scheduling';
import { SPRING, SPRING_BOUNCY } from '../tokens';

// Step transition variants — 3D flip
const stepEnter = { opacity: 0, rotateY: 90 };
const stepShow  = { opacity: 1, rotateY: 0,   transition: { ...SPRING } };
const stepExit  = { opacity: 0, rotateY: -90, transition: { duration: 0.25 } };

// 3D tilt card for specialty selection
interface TiltSpecialtyCardProps {
  spec: string;
  selected: boolean;
  onClick: () => void;
  secondary?: boolean;
}
const TiltSpecialtyCard: React.FC<TiltSpecialtyCardProps> = ({ spec, selected, onClick, secondary = false }) => {
  const prefersReduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sRotX = useSpring(rotX, { stiffness: 300, damping: 25 });
  const sRotY = useSpring(rotY, { stiffness: 300, damping: 25 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const r = cardRef.current?.getBoundingClientRect(); if (!r) return;
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    rotY.set(dx * 12);
    rotX.set(-dy * 12);
  };
  const onLeave = () => { rotX.set(0); rotY.set(0); };

  return (
    <div style={{ perspective: 800 }}>
      <motion.div
        ref={cardRef}
        onClick={onClick}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        whileTap={{ scale: 0.97 }}
        style={{
          rotateX: prefersReduced ? 0 : sRotX,
          rotateY: prefersReduced ? 0 : sRotY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        className="relative rounded-2xl cursor-pointer"
      >
        {/* Selected conic border */}
        {selected && (
          <motion.span
            aria-hidden
            className="absolute -inset-[2px] rounded-[18px] pointer-events-none"
            style={{ background: '#16130E' }}
            animate={prefersReduced ? {} : { rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          />
        )}
        <div
          className={`relative ${secondary ? 'p-4 text-sm' : 'p-6'} rounded-2xl capitalize font-bold transition-colors`}
          style={{
            background: selected ? 'rgba(27,24,19,0.15)' : 'rgba(27,24,19,0.02)',
            border: selected ? '2px solid transparent' : '2px solid rgba(27,24,19,0.08)',
            color: selected ? '#1B1813' : (secondary ? 'rgba(27,24,19,0.4)' : 'rgba(27,24,19,0.5)'),
          }}
        >
          {spec}
        </div>
      </motion.div>
    </div>
  );
};

const SPECIALTIES = ['hitting', 'pitching', 'fielding', 'strength'];

const AFFILIATION_OPTIONS: { name: string; category: string; logoUrl: string | null }[] = [
  { name: 'New York Yankees', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/147.svg' },
  { name: 'Boston Red Sox', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/111.svg' },
  { name: 'Los Angeles Dodgers', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/119.svg' },
  { name: 'San Francisco Giants', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/137.svg' },
  { name: 'Chicago Cubs', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/112.svg' },
  { name: 'St. Louis Cardinals', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/138.svg' },
  { name: 'Houston Astros', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/117.svg' },
  { name: 'Philadelphia Phillies', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/143.svg' },
  { name: 'Atlanta Braves', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/144.svg' },
  { name: 'New York Mets', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/121.svg' },
  { name: 'Pittsburgh Pirates', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/134.svg' },
  { name: 'Baltimore Orioles', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/110.svg' },
  { name: 'Texas Rangers', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/140.svg' },
  { name: 'Arizona Diamondbacks', category: 'MLB', logoUrl: 'https://www.mlbstatic.com/team-logos/109.svg' },
  { name: 'San Diego State', category: 'D1 College', logoUrl: '/sdsu.png' },
  { name: 'USC', category: 'D1 College', logoUrl: null },
  { name: 'UCLA', category: 'D1 College', logoUrl: null },
  { name: 'Stanford', category: 'D1 College', logoUrl: null },
  { name: 'Vanderbilt', category: 'D1 College', logoUrl: null },
  { name: 'LSU', category: 'D1 College', logoUrl: null },
  { name: 'Texas', category: 'D1 College', logoUrl: null },
  { name: 'Arizona State', category: 'D1 College', logoUrl: null },
  { name: 'Cal State Fullerton', category: 'D1 College', logoUrl: null },
  { name: 'Long Beach State', category: 'D1 College', logoUrl: null },
  { name: 'Pepperdine', category: 'D1 College', logoUrl: null },
  { name: 'University of San Diego', category: 'D1 College', logoUrl: null },
  { name: 'Clemson', category: 'D1 College', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Clemson_Tigers_logo.svg' },
  { name: 'Florida', category: 'D1 College', logoUrl: null },
  { name: 'Mississippi State', category: 'D1 College', logoUrl: null },
  { name: 'Oregon State', category: 'D1 College', logoUrl: null },
  { name: 'Cal State Northridge', category: 'D1 College', logoUrl: '/csun.png' },
  { name: 'Cal State Chico', category: 'D1 College', logoUrl: '/chico.png' },
  { name: 'KBO Hyundai Unicorns', category: 'KBO', logoUrl: '/unicorns.png' },
  { name: 'KBO Samsung Lions', category: 'KBO', logoUrl: '/lions.png' },
  { name: 'KBO Doosan Bears', category: 'KBO', logoUrl: '/doosan.png' },
  { name: 'Independent League', category: 'Other', logoUrl: null },
  { name: 'Minor Leagues', category: 'Other', logoUrl: null },
];

const skillSuggestions: Record<string, string[]> = {
  hitting: ['Swing Mechanics', 'Exit Velocity', 'Plate Discipline', 'Power Hitting', 'Contact Hitting', 'Mental Approach', 'Video Analysis', 'Bat Speed'],
  pitching: ['Pitch Design', 'Command', 'Arm Health', 'Velocity Training', 'Mechanics', 'Spin Rate', 'Changeup', 'Breaking Ball'],
  fielding: ['Footwork', 'Glove-work', 'Double Plays', 'Range', 'Arm Strength', 'Infield Drills', 'Outfield Routes', 'First Step Quickness'],
  strength: ['Strength Training', 'Explosive Power', 'Conditioning', 'Injury Prevention', 'Speed & Agility', 'Rotational Power', 'Recovery', 'Nutrition'],
};

const ONBOARDING_DRAFT_KEY = 'coachgo_onboarding_draft';

export default function CoachOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploadedUrl, setPhotoUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoUploadedUrl, setVideoUploadedUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const videoRecordRef = useRef<HTMLInputElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [affiliationSearch, setAffiliationSearch] = useState('');
  const [showAffiliationDropdown, setShowAffiliationDropdown] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [showCustomSkillInput, setShowCustomSkillInput] = useState(false);
  const DEFAULT_PROFILE = {
    specialty: '',
    secondarySpecialty: '',
    bio: '',
    yearsExperience: '',
    sessionTypes: [{ label: '1-on-1 Private', price: '' }] as { label: string; price: string }[],
    venmoHandle: '',
    city: '',
    state: '',
    streetAddress: '',
    skills: [] as string[],
    certifications: [] as string[],
    affiliations: [] as { name: string; logoUrl: string | null }[],
  };
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw).profile };
    } catch { /* ignore */ }
    return DEFAULT_PROFILE;
  });
  const [draftSaved, setDraftSaved] = useState(false);

  // Persist the in-progress draft (serializable fields only — not file uploads)
  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify({ profile }));
      setDraftSaved(true);
    } catch { /* ignore */ }
  }, [profile]);

  const totalSteps = 5;
  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const toggleSkill = (skill: string) => {
    setProfile(p => ({
      ...p,
      skills: p.skills.includes(skill)
        ? p.skills.filter(s => s !== skill)
        : p.skills.length < 6 ? [...p.skills, skill] : p.skills
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5MB'); return; }
    setPhotoPreview(URL.createObjectURL(file));
    if (!auth.currentUser) { alert('Session expired. Please refresh and log in again.'); return; }
    setIsUploading(true);
    setUploadProgress(0);
    setPhotoUploadedUrl(null);
    const uid = auth.currentUser.uid;
    const sRef = ref(storage, `coach_photos/${uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(sRef, file);
    uploadTask.on('state_changed',
      (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
      (error) => { console.error(error); setIsUploading(false); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setPhotoUploadedUrl(url);
        setIsUploading(false);
      }
    );
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { alert('Video must be under 500MB'); return; }
    setVideoPreviewUrl(URL.createObjectURL(file));
    setVideoFileName(file.name);
    if (!auth.currentUser) { alert('Session expired. Please refresh and log in again.'); return; }
    setIsVideoUploading(true);
    setVideoUploadProgress(0);
    setVideoUploadedUrl(null);
    const uid = auth.currentUser.uid;
    const ext = file.name.split('.').pop() || 'mp4';
    const vRef = ref(storage, `coach_videos/${uid}/intro.${ext}`);
    const uploadTask = uploadBytesResumable(vRef, file);
    uploadTask.on('state_changed',
      (snapshot) => setVideoUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
      (error) => { console.error(error); setIsVideoUploading(false); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setVideoUploadedUrl(url);
        setIsVideoUploading(false);
      }
    );
    // Reset the input value so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    if (!videoUploadedUrl) {
      alert('Please upload your intro video first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const uid = auth.currentUser.uid;
      const prices = profile.sessionTypes.map(s => Number(s.price)).filter(p => p > 0);

      // merge:true preserves rating/reviews if coach re-runs onboarding
      await setDoc(doc(db, 'coach_profiles', uid), {
        user_id: uid,
        name: auth.currentUser.displayName || '',
        specialty: profile.specialty,
        secondary_specialty: profile.secondarySpecialty || null,
        bio: profile.bio,
        years_experience: Number(profile.yearsExperience),
        session_types_with_price: profile.sessionTypes.map(s => ({ label: s.label.trim(), price: Number(s.price) })),
        price_per_session: prices.length > 0 ? Math.min(...prices) : 0,
        venmo_handle: profile.venmoHandle.replace('@', '').trim(),
        video_url: videoUploadedUrl,
        city: profile.city,
        state: profile.state,
        street_address: profile.streetAddress,
        skills: profile.skills,
        certifications: profile.certifications,
        affiliations: profile.affiliations,
        availability: {},
        is_active: true,
        photo_url: photoUploadedUrl || null,
        instant_book: false,
        location_modes: { facility: true, travel: false, virtual: false },
        buffer_minutes: 0,
        timezone: getBrowserTimezone(),
        updated_at: serverTimestamp(),
      }, { merge: true });

      // Update user role to 'coach' in users collection
      try {
        await updateDoc(doc(db, 'users', uid), { role: 'coach' });
      } catch {
        await setDoc(doc(db, 'users', uid), {
          name: auth.currentUser.displayName || '',
          email: auth.currentUser.email || '',
          role: 'coach',
          created_at: serverTimestamp(),
        });
      }

      try { localStorage.removeItem(ONBOARDING_DRAFT_KEY); } catch { /* ignore */ }
      setSuccessMsg('Profile created! Taking you to your dashboard...');
      await new Promise(r => setTimeout(r, 1500));
      navigate('/dashboard');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'coach_profiles');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepIcons = [Target, User, Zap, DollarSign, MapPin];
  const StepIcon = stepIcons[step - 1];

  return (
    <PageTransition>
      <div className="min-h-screen" style={{ background: '#F6F4EF' }}>

        {successMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-medium text-ink text-sm"
            style={{ background: 'var(--card-cream)', border: '1px solid var(--line)', boxShadow: '0 12px 32px rgba(27,24,19,0.14)' }}>
            {successMsg}
          </div>
        )}

        {/* Header */}
        <div className="py-12 pt-28" style={{ background: 'rgba(27,24,19,0.05)', borderBottom: '1px solid rgba(27,24,19,0.06)' }}>
          <div className="max-w-2xl mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1B1813' }}>Coach Setup</p>
              <h1 className="text-3xl font-bold text-ink mb-2">Build your CoachGo profile</h1>
              <p style={{ color: 'rgba(27,24,19,0.4)' }}>This takes less than 2 minutes. You can update everything later.</p>
            </motion.div>
            {/* Progress dots — active morphs to pill via layoutId */}
            <div className="flex justify-center items-center gap-2 mt-8">
              {Array.from({ length: totalSteps }).map((_, i) => {
                const idx = i + 1;
                const active = idx === step;
                const completed = idx < step;
                return (
                  <div key={i} className="relative flex items-center justify-center" style={{ width: active ? 32 : 12, height: 12 }}>
                    {active ? (
                      <motion.div
                        layoutId="activeDot"
                        className="absolute inset-0 rounded-full"
                        transition={{ ...SPRING }}
                        style={{ background: '#1B1813', boxShadow: '0 0 12px rgba(27,24,19,0.6)', height: 8, top: 2, willChange: 'transform' }}
                      />
                    ) : completed ? (
                      <div className="rounded-full flex items-center justify-center" style={{ width: 12, height: 12, background: '#1B1813' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#F6F4EF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 7, height: 7 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className="rounded-full" style={{ width: 8, height: 8, background: 'rgba(27,24,19,0.15)' }} />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs mt-3 font-bold uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.25)' }}>
              Step {step} of {totalSteps}
            </p>
            {draftSaved && (
              <p className="text-[11px] mt-1.5 inline-flex items-center gap-1" style={{ color: 'var(--ink-faint)' }}>
                <CheckCircle2 size={11} /> Progress saved — you can leave and finish later.
              </p>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12" style={{ perspective: 1200 }}>
          <div className="rounded-3xl p-8 md:p-12" style={{ background: 'rgba(27,24,19,0.03)', border: '1px solid rgba(27,24,19,0.06)', transformStyle: 'preserve-3d' }}>
            <AnimatePresence mode="wait">

              {/* ── STEP 1: Specialty ── */}
              {step === 1 && (
                <motion.div key="s1" initial={stepEnter} animate={stepShow} exit={stepExit} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(27,24,19,0.1)', color: '#1B1813' }}>
                      <Target size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-ink">What's your specialty?</h2>
                      <p className="text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>Choose your primary coaching focus.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {SPECIALTIES.map(spec => (
                      <TiltSpecialtyCard
                        key={spec}
                        spec={spec}
                        selected={profile.specialty === spec}
                        onClick={() => setProfile(p => ({ ...p, specialty: spec, skills: [] }))}
                      />
                    ))}
                  </div>

                  <div className="mb-8">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(27,24,19,0.4)' }}>
                      Secondary Specialty <span style={{ color: 'rgba(27,24,19,0.2)' }}>(optional)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {SPECIALTIES.filter(s => s !== profile.specialty).map(spec => (
                        <TiltSpecialtyCard
                          key={spec}
                          spec={spec}
                          secondary
                          selected={profile.secondarySpecialty === spec}
                          onClick={() => setProfile(p => ({ ...p, secondarySpecialty: p.secondarySpecialty === spec ? '' : spec }))}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button onClick={nextStep} disabled={!profile.specialty}
                      className="btn-primary py-3 px-8 flex items-center gap-2 disabled:opacity-50">
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: Bio ── */}
              {step === 2 && (
                <motion.div key="s2" initial={stepEnter} animate={stepShow} exit={stepExit} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(27,24,19,0.1)', color: '#1B1813' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-ink">Your background</h2>
                      <p className="text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>Tell players about your experience.</p>
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div className="mb-8 p-6 rounded-2xl" style={{ background: 'rgba(27,24,19,0.04)', border: '1px solid rgba(27,24,19,0.12)' }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#1B1813' }}>Profile Photo <span style={{ color: 'rgba(27,24,19,0.25)' }}>(optional)</span></p>
                    <p className="text-xs font-semibold mb-5" style={{ color: 'rgba(27,24,19,0.5)' }}>Add a professional photo — coaches with photos get 3x more bookings</p>
                    <div className="flex items-center gap-6">
                      {/* Circular avatar */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="relative shrink-0 group cursor-pointer"
                        style={{ width: 150, height: 150 }}
                      >
                        <div className="w-full h-full rounded-full overflow-hidden flex flex-col items-center justify-center"
                          style={{
                            background: photoPreview ? 'transparent' : 'rgba(27,24,19,0.08)',
                            border: `2px dashed ${photoPreview ? 'rgba(27,24,19,0.5)' : 'rgba(27,24,19,0.3)'}`,
                          }}>
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Camera size={32} style={{ color: 'rgba(27,24,19,0.5)' }} />
                              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.5)' }}>Upload</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.55)' }}>
                          <Camera size={28} style={{ color: 'white' }} />
                        </div>
                      </button>

                      <div className="flex-1">
                        <p className="text-sm font-semibold text-ink mb-1">
                          {photoPreview ? 'Looking good!' : 'Add a professional headshot'}
                        </p>
                        <p className="text-xs mb-4" style={{ color: 'rgba(27,24,19,0.35)' }}>
                          JPG or PNG · max 5MB · square crops work best
                        </p>

                        {/* Progress bar */}
                        {isUploading && (
                          <div className="mb-3">
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.35)' }}>Uploading...</span>
                              <span className="text-[10px] font-bold" style={{ color: '#1B1813' }}>{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(27,24,19,0.06)' }}>
                              <motion.div
                                className="h-full rounded-full"
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ ease: 'linear', duration: 0.2 }}
                                style={{ background: '#16130E' }}
                              />
                            </div>
                          </div>
                        )}

                        {!isUploading && photoUploadedUrl && (
                          <p className="text-xs mb-3 font-semibold" style={{ color: '#5E8C5A' }}>
                            <CheckCircle2 size={12} className="inline mr-1" />Photo uploaded
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all hover:bg-[rgba(27,24,19,0.05)]"
                          style={{ color: '#1B1813', border: '1px solid rgba(27,24,19,0.2)' }}>
                          {photoPreview ? 'Change Photo' : 'Choose Photo'}
                        </button>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>

                  <div className="mb-8">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(27,24,19,0.4)' }}>Bio</label>
                    <textarea rows={6}
                      placeholder={"• Your achievement here\n• Another accomplishment\n• Your coaching philosophy"}
                      value={profile.bio}
                      onFocus={() => {
                        if (!profile.bio.trim()) setProfile(p => ({ ...p, bio: '• ' }));
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const ta = e.currentTarget;
                          const pos = ta.selectionStart;
                          const newVal = profile.bio.slice(0, pos) + '\n• ' + profile.bio.slice(pos);
                          setProfile(p => ({ ...p, bio: newVal }));
                          setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + 3; }, 0);
                        }
                      }}
                      onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                      className="w-full rounded-xl p-4 text-sm resize-none text-ink focus:outline-none"
                      style={{ background: 'rgba(27,24,19,0.05)', border: '1px solid rgba(27,24,19,0.08)' }} />
                    <div className="flex justify-between mt-1">
                      <p className="text-xs" style={{ color: 'rgba(27,24,19,0.2)' }}>Each line auto-formats as a bullet point. Press Enter for a new one.</p>
                      <p className="text-xs" style={{ color: profile.bio.length > 800 ? '#C79A57' : 'rgba(27,24,19,0.2)' }}>{profile.bio.length}/1000</p>
                    </div>
                  </div>

                  {/* Intro Video — Required */}
                  <div className="mb-8 p-6 rounded-2xl" style={{ background: 'rgba(27,24,19,0.04)', border: '1px solid rgba(27,24,19,0.15)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.4)' }}>Intro Video</p>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(188,90,72,0.1)', color: '#BC5A48', border: '1px solid rgba(188,90,72,0.2)' }}>Required</span>
                    </div>
                    <p className="text-xs font-semibold mb-5" style={{ color: 'rgba(27,24,19,0.5)' }}>
                      Introduce yourself to players — coaches with intro videos get 5x more bookings
                    </p>

                    {/* Two option buttons */}
                    {!videoPreviewUrl && !videoUploadedUrl && !isVideoUploading && (
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => videoRecordRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl font-bold text-sm transition-all hover:bg-[rgba(27,24,19,0.05)]"
                          style={{ background: 'rgba(27,24,19,0.06)', border: '1px solid rgba(27,24,19,0.2)', color: '#8A7BA8' }}>
                          <Video size={28} />
                          Record Now
                          <span className="text-[10px] font-normal" style={{ color: 'rgba(27,24,19,0.3)' }}>Uses your camera</span>
                        </button>
                        <button type="button" onClick={() => videoUploadRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl font-bold text-sm transition-all hover:bg-[rgba(27,24,19,0.05)]"
                          style={{ background: 'rgba(27,24,19,0.06)', border: '1px solid rgba(27,24,19,0.2)', color: '#1B1813' }}>
                          <Upload size={28} />
                          Upload Video
                          <span className="text-[10px] font-normal" style={{ color: 'rgba(27,24,19,0.3)' }}>MP4, MOV, WebM</span>
                        </button>
                      </div>
                    )}

                    {/* Upload progress */}
                    {isVideoUploading && (
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.35)' }}>Uploading video...</span>
                          <span className="text-[10px] font-bold" style={{ color: '#8A7BA8' }}>{videoUploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(27,24,19,0.06)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            animate={{ width: `${videoUploadProgress}%` }}
                            transition={{ ease: 'linear', duration: 0.2 }}
                            style={{ background: '#16130E' }}
                          />
                        </div>
                        {videoFileName && <p className="text-[10px] mt-1.5" style={{ color: 'rgba(27,24,19,0.25)' }}>{videoFileName}</p>}
                      </div>
                    )}

                    {/* Video preview after upload */}
                    {(videoPreviewUrl || videoUploadedUrl) && !isVideoUploading && (
                      <div>
                        <div className="rounded-xl overflow-hidden mb-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
                          <video
                            src={videoPreviewUrl || videoUploadedUrl || undefined}
                            controls
                            className="w-full max-h-48 object-contain block"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={13} style={{ color: '#5E8C5A' }} />
                            <span className="text-xs font-semibold" style={{ color: '#5E8C5A' }}>
                              {videoUploadedUrl ? 'Video uploaded' : 'Processing...'}
                            </span>
                            {videoFileName && <span className="text-[10px]" style={{ color: 'rgba(27,24,19,0.25)' }}>{videoFileName}</span>}
                          </div>
                          <button type="button"
                            onClick={() => { setVideoPreviewUrl(null); setVideoUploadedUrl(null); setVideoFileName(''); }}
                            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all hover:bg-[rgba(188,90,72,0.1)]"
                            style={{ color: 'rgba(188,90,72,0.7)', border: '1px solid rgba(188,90,72,0.15)' }}>
                            Replace
                          </button>
                        </div>
                      </div>
                    )}

                    <input ref={videoRecordRef} type="file" accept="video/*" capture="user" onChange={handleVideoSelect} className="hidden" />
                    <input ref={videoUploadRef} type="file" accept="video/mp4,video/mov,video/quicktime,video/webm,video/avi" onChange={handleVideoSelect} className="hidden" />
                  </div>

                  {/* Professional Affiliations */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.4)' }}>
                        Professional Affiliations
                      </label>
                      <span className="text-[10px]" style={{ color: 'rgba(27,24,19,0.2)' }}>(optional)</span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'rgba(27,24,19,0.25)' }}>Teams, colleges, or leagues you've played or coached for.</p>

                    {/* Selected chips */}
                    {profile.affiliations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {profile.affiliations.map((aff, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold"
                            style={{ background: 'rgba(27,24,19,0.12)', border: '1px solid rgba(27,24,19,0.25)', color: '#6E665A' }}>
                            {aff.logoUrl && (
                              <img src={aff.logoUrl} alt="" className="w-4 h-4 object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            )}
                            <span className="text-xs">{aff.name}</span>
                            <button type="button" onClick={() => setProfile(p => ({ ...p, affiliations: p.affiliations.filter((_, i) => i !== idx) }))}
                              className="opacity-60 hover:opacity-100 ml-0.5 text-xs">✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Search input */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search teams, colleges, leagues..."
                        value={affiliationSearch}
                        onChange={e => { setAffiliationSearch(e.target.value); setShowAffiliationDropdown(true); }}
                        onFocus={() => setShowAffiliationDropdown(true)}
                        onBlur={() => setTimeout(() => setShowAffiliationDropdown(false), 150)}
                        className="w-full rounded-xl p-4 text-sm text-ink focus:outline-none"
                        style={{ background: 'rgba(27,24,19,0.05)', border: '1px solid rgba(27,24,19,0.08)' }}
                      />
                      {showAffiliationDropdown && affiliationSearch.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 max-h-52 overflow-y-auto"
                          style={{ background: '#FBFAF6', border: '1px solid var(--line-strong)', boxShadow: '0 14px 36px rgba(27,24,19,0.12)' }}>
                          {AFFILIATION_OPTIONS
                            .filter(a =>
                              a.name.toLowerCase().includes(affiliationSearch.toLowerCase()) &&
                              !profile.affiliations.some(sel => sel.name === a.name)
                            )
                            .slice(0, 8)
                            .map(opt => (
                              <button key={opt.name} type="button"
                                onMouseDown={() => {
                                  setProfile(p => ({ ...p, affiliations: [...p.affiliations, { name: opt.name, logoUrl: opt.logoUrl }] }));
                                  setAffiliationSearch('');
                                  setShowAffiliationDropdown(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-[rgba(27,24,19,0.04)]"
                                style={{ color: 'rgba(27,24,19,0.8)' }}>
                                {opt.logoUrl
                                  ? <img src={opt.logoUrl} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                  : <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold" style={{ background: 'rgba(27,24,19,0.2)', color: '#1B1813' }}>{opt.name[0]}</div>
                                }
                                <div>
                                  <span className="font-medium">{opt.name}</span>
                                  <span className="ml-2 text-[10px] uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.3)' }}>{opt.category}</span>
                                </div>
                              </button>
                            ))}
                          {AFFILIATION_OPTIONS.filter(a =>
                            a.name.toLowerCase().includes(affiliationSearch.toLowerCase()) &&
                            !profile.affiliations.some(sel => sel.name === a.name)
                          ).length === 0 && (
                            <div className="px-4 py-3 text-sm" style={{ color: 'rgba(27,24,19,0.35)' }}>No matches found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button onClick={prevStep} className="text-sm font-bold" style={{ color: 'rgba(27,24,19,0.4)' }}>Back</button>
                    <button onClick={nextStep}
                      disabled={profile.bio.trim().length < 20 || !videoUploadedUrl || isVideoUploading}
                      className="btn-primary py-3 px-8 flex items-center gap-2 disabled:opacity-50">
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3: Skills ── */}
              {step === 3 && (
                <motion.div key="s3" initial={stepEnter} animate={stepShow} exit={stepExit} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(27,24,19,0.1)', color: '#1B1813' }}>
                      <Zap size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-ink">Your skill tags</h2>
                      <p className="text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>Pick up to 6 that best describe what you teach.</p>
                    </div>
                  </div>

                  <motion.div className="flex flex-wrap gap-3 mb-4" layout>
                    {(skillSuggestions[profile.specialty] || []).map(skill => {
                      const isSelected = profile.skills.includes(skill);
                      return (
                        <motion.button
                          key={skill}
                          layout
                          layoutId={`skill-${skill}`}
                          onClick={() => toggleSkill(skill)}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{
                            opacity: 1,
                            scale: isSelected ? [0.8, 1.08, 1] : 1,
                            transition: { ...SPRING_BOUNCY },
                          }}
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.94 }}
                          className="px-4 py-2 rounded-xl text-sm font-bold relative"
                          style={{
                            background: isSelected ? 'rgba(27,24,19,0.2)' : 'rgba(27,24,19,0.04)',
                            border: `1px solid ${isSelected ? '#1B1813' : 'rgba(27,24,19,0.08)'}`,
                            color: isSelected ? '#1B1813' : 'rgba(27,24,19,0.5)',
                            boxShadow: isSelected ? '0 0 16px rgba(27,24,19,0.25)' : 'none',
                          }}
                        >
                          {isSelected && <CheckCircle2 size={12} className="inline mr-1" />}
                          {skill}
                        </motion.button>
                      );
                    })}
                    {/* Custom skills with purple styling */}
                    {profile.skills.filter(s => !(skillSuggestions[profile.specialty] || []).includes(s)).map(skill => (
                      <motion.button
                        key={skill}
                        layout
                        layoutId={`skill-${skill}`}
                        onClick={() => toggleSkill(skill)}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: [0.8, 1.08, 1] }}
                        transition={{ ...SPRING_BOUNCY }}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        className="px-4 py-2 rounded-xl text-sm font-bold"
                        style={{
                          background: 'rgba(27,24,19,0.2)',
                          border: '1px solid #8A7BA8',
                          color: '#8A7BA8',
                          boxShadow: '0 0 16px rgba(27,24,19,0.25)',
                        }}
                      >
                        <CheckCircle2 size={12} className="inline mr-1" />{skill}
                      </motion.button>
                    ))}
                  </motion.div>

                  <p className="text-xs mb-4" style={{ color: 'rgba(27,24,19,0.25)' }}>
                    {profile.skills.length}/6 selected
                    {profile.skills.length === 6 && ' — max reached'}
                  </p>

                  {/* Custom skill input */}
                  {showCustomSkillInput ? (
                    <div className="flex gap-2 mb-6">
                      <input
                        type="text"
                        value={customSkillInput}
                        onChange={e => setCustomSkillInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const t = customSkillInput.trim();
                            if (t && !profile.skills.includes(t) && profile.skills.length < 6) {
                              setProfile(p => ({ ...p, skills: [...p.skills, t] }));
                            }
                            setCustomSkillInput('');
                            setShowCustomSkillInput(false);
                          }
                          if (e.key === 'Escape') { setCustomSkillInput(''); setShowCustomSkillInput(false); }
                        }}
                        placeholder="e.g. Pitching Mechanics"
                        autoFocus
                        className="flex-1 rounded-xl p-3 text-sm text-ink focus:outline-none"
                        style={{ background: 'rgba(27,24,19,0.08)', border: '1px solid rgba(27,24,19,0.3)' }}
                      />
                      <button type="button"
                        onClick={() => {
                          const t = customSkillInput.trim();
                          if (t && !profile.skills.includes(t) && profile.skills.length < 6) {
                            setProfile(p => ({ ...p, skills: [...p.skills, t] }));
                          }
                          setCustomSkillInput('');
                          setShowCustomSkillInput(false);
                        }}
                        className="px-4 rounded-xl text-sm font-bold"
                        style={{ background: 'rgba(27,24,19,0.2)', color: '#8A7BA8', border: '1px solid rgba(27,24,19,0.3)' }}>
                        Add
                      </button>
                    </div>
                  ) : (
                    <button type="button"
                      onClick={() => setShowCustomSkillInput(true)}
                      disabled={profile.skills.length >= 6}
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl mb-6 transition-all disabled:opacity-30"
                      style={{ color: '#8A7BA8', border: '1px solid rgba(27,24,19,0.25)' }}>
                      <Plus size={14} /> Add Custom Skill
                    </button>
                  )}

                  <div className="flex justify-between">
                    <button onClick={prevStep} className="text-sm font-bold" style={{ color: 'rgba(27,24,19,0.4)' }}>Back</button>
                    <button onClick={nextStep}
                      className="btn-primary py-3 px-8 flex items-center gap-2">
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 4: Pricing ── */}
              {step === 4 && (
                <motion.div key="s4" initial={stepEnter} animate={stepShow} exit={stepExit} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(27,24,19,0.1)', color: '#1B1813' }}>
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-ink">Pricing & Experience</h2>
                      <p className="text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>Set your rate and experience level.</p>
                    </div>
                  </div>

                  {/* Session Types & Pricing */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.4)' }}>
                        Session Types &amp; Pricing
                      </label>
                      <span className="text-[10px]" style={{ color: 'rgba(27,24,19,0.25)' }}>Add all types you offer</span>
                    </div>
                    <div className="space-y-3 mb-3">
                      {profile.sessionTypes.map((st, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input
                            type="text"
                            placeholder={idx === 0 ? '1-on-1 Private' : 'e.g. Group Session'}
                            value={st.label}
                            onChange={e => setProfile(p => {
                              const updated = [...p.sessionTypes];
                              updated[idx] = { ...updated[idx], label: e.target.value };
                              return { ...p, sessionTypes: updated };
                            })}
                            className="flex-1 rounded-xl p-4 text-sm text-ink focus:outline-none"
                            style={{ background: 'rgba(27,24,19,0.05)', border: '1px solid rgba(27,24,19,0.08)' }}
                          />
                          <div className="flex items-center rounded-xl overflow-hidden shrink-0"
                            style={{ background: 'rgba(27,24,19,0.05)', border: '1px solid rgba(27,24,19,0.08)' }}>
                            <span className="pl-3 text-sm font-bold" style={{ color: 'rgba(27,24,19,0.35)' }}>$</span>
                            <input
                              type="number"
                              placeholder="100"
                              value={st.price}
                              onChange={e => setProfile(p => {
                                const updated = [...p.sessionTypes];
                                updated[idx] = { ...updated[idx], price: e.target.value };
                                return { ...p, sessionTypes: updated };
                              })}
                              className="w-24 bg-transparent py-4 pr-3 pl-1 text-sm text-ink focus:outline-none"
                              style={{ colorScheme: 'light' }}
                            />
                          </div>
                          {profile.sessionTypes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setProfile(p => ({ ...p, sessionTypes: p.sessionTypes.filter((_, i) => i !== idx) }))}
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all hover:bg-[rgba(188,90,72,0.1)]"
                              style={{ color: 'rgba(188,90,72,0.6)', border: '1px solid rgba(188,90,72,0.15)' }}>
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfile(p => ({ ...p, sessionTypes: [...p.sessionTypes, { label: '', price: '' }] }))}
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all hover:bg-[rgba(27,24,19,0.05)]"
                      style={{ color: '#1B1813', border: '1px solid rgba(27,24,19,0.2)' }}>
                      <Plus size={14} /> Add Session Type
                    </button>
                  </div>

                  {/* Years of Experience */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(27,24,19,0.4)' }}>Years of Experience</label>
                    <input type="number" placeholder="e.g. 5"
                      value={profile.yearsExperience}
                      onChange={e => setProfile(p => ({ ...p, yearsExperience: e.target.value }))}
                      className="w-full rounded-xl p-4 text-sm text-ink focus:outline-none"
                      style={{ background: 'rgba(27,24,19,0.05)', border: '1px solid rgba(27,24,19,0.08)', colorScheme: 'light' }} />
                  </div>

                  {/* Venmo Handle — REQUIRED */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.4)' }}>
                        Venmo Handle <span style={{ color: '#BC5A48' }}>*</span>
                      </label>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(188,90,72,0.1)', color: '#BC5A48', border: '1px solid rgba(188,90,72,0.2)' }}>Required</span>
                    </div>
                    <p className="text-[10px] mb-3" style={{ color: 'rgba(27,24,19,0.25)' }}>Players will pay you through Venmo after confirmation.</p>
                    <div className="flex items-center gap-3 rounded-xl overflow-hidden"
                      style={{ background: 'rgba(27,24,19,0.05)', border: `1px solid ${!profile.venmoHandle.trim() ? 'rgba(188,90,72,0.25)' : 'rgba(27,24,19,0.08)'}` }}>
                      <span className="pl-4 font-bold text-sm shrink-0" style={{ color: 'rgba(27,24,19,0.35)' }}>@</span>
                      <input
                        type="text"
                        value={profile.venmoHandle}
                        onChange={e => setProfile(p => ({ ...p, venmoHandle: e.target.value.replace('@', '').replace(/\s/g, '') }))}
                        placeholder="your-venmo-username"
                        className="flex-1 bg-transparent py-4 pr-4 text-sm text-ink focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button onClick={prevStep} className="text-sm font-bold" style={{ color: 'rgba(27,24,19,0.4)' }}>Back</button>
                    <button onClick={nextStep}
                      disabled={
                        profile.sessionTypes.some(s => !s.label.trim() || !s.price) ||
                        !profile.yearsExperience ||
                        !profile.venmoHandle.trim()
                      }
                      className="btn-primary py-3 px-8 flex items-center gap-2 disabled:opacity-50">
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 5: Location + Submit ── */}
              {step === 5 && (
                <motion.div key="s5" initial={stepEnter} animate={stepShow} exit={stepExit} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(27,24,19,0.1)', color: '#1B1813' }}>
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-ink">Where do you coach?</h2>
                      <p className="text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>Players will see this and get directions.</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(27,24,19,0.4)' }}>Training Facility / Address</label>
                      <input type="text" placeholder="e.g. 123 Main St, XYZ Training Facility"
                        value={profile.streetAddress}
                        onChange={e => setProfile(p => ({ ...p, streetAddress: e.target.value }))}
                        className="w-full rounded-xl p-4 text-sm text-ink focus:outline-none"
                        style={{ background: 'rgba(27,24,19,0.05)', border: '1px solid rgba(27,24,19,0.08)' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(27,24,19,0.4)' }}>City</label>
                        <input type="text" placeholder="San Diego"
                          value={profile.city}
                          onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                          className="w-full rounded-xl p-4 text-sm text-ink focus:outline-none"
                          style={{ background: 'rgba(27,24,19,0.05)', border: '1px solid rgba(27,24,19,0.08)' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(27,24,19,0.4)' }}>State</label>
                        <input type="text" placeholder="CA" maxLength={2}
                          value={profile.state}
                          onChange={e => setProfile(p => ({ ...p, state: e.target.value.toUpperCase() }))}
                          className="w-full rounded-xl p-4 text-sm text-ink focus:outline-none"
                          style={{ background: 'rgba(27,24,19,0.05)', border: '1px solid rgba(27,24,19,0.08)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Final summary */}
                  <div className="rounded-2xl p-6 mb-8" style={{ background: 'rgba(27,24,19,0.06)', border: '1px solid rgba(27,24,19,0.12)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(27,24,19,0.3)' }}>Profile Summary</h4>
                    <div className="space-y-2 text-sm">
                      {[
                        { label: 'Specialty', value: profile.specialty + (profile.secondarySpecialty ? ` + ${profile.secondarySpecialty}` : '') },
                        { label: 'Skills', value: profile.skills.length > 0 ? profile.skills.join(', ') : 'None selected' },
                        { label: 'Sessions', value: profile.sessionTypes.map(s => `${s.label} ($${s.price})`).join(', ') || 'Not set' },
                        { label: 'Experience', value: `${profile.yearsExperience} years` },
                        { label: 'Location', value: profile.city && profile.state ? `${profile.city}, ${profile.state}` : 'Not set' },
                        ...(profile.venmoHandle ? [{ label: 'Venmo', value: `@${profile.venmoHandle}` }] : []),
                      ].map(item => (
                        <div key={item.label} className="flex justify-between gap-4">
                          <span style={{ color: 'rgba(27,24,19,0.4)' }}>{item.label}</span>
                          <span className="font-bold text-ink capitalize text-right">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button onClick={prevStep} className="text-sm font-bold" style={{ color: 'rgba(27,24,19,0.4)' }}>Back</button>
                    <button onClick={handleSubmit}
                      disabled={isSubmitting || isUploading || isVideoUploading || !profile.city || !profile.state}
                      className="btn-primary py-3 px-8 flex items-center gap-2 disabled:opacity-50">
                      {isSubmitting
                        ? <><Loader2 className="animate-spin" size={16} /> Saving...</>
                        : isUploading
                        ? <><Loader2 className="animate-spin" size={16} /> Uploading photo...</>
                        : <><CheckCircle2 size={16} /> Launch My Profile</>
                      }
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}