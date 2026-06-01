import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Target, DollarSign, MapPin, User, Award, ArrowLeft, Save, CheckCircle2, Camera, X, CreditCard, Video, Upload, Plus, Search } from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import PageTransition from '../components/PageTransition';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

const SPECIALTIES = ['hitting', 'pitching', 'fielding', 'strength'];

const skillSuggestions: Record<string, string[]> = {
  hitting: ['Swing Mechanics', 'Exit Velocity', 'Plate Discipline', 'Power Hitting', 'Contact Hitting', 'Mental Approach', 'Video Analysis', 'Bat Speed'],
  pitching: ['Pitch Design', 'Command', 'Arm Health', 'Velocity Training', 'Mechanics', 'Spin Rate', 'Changeup', 'Breaking Ball'],
  fielding: ['Footwork', 'Glove-work', 'Double Plays', 'Range', 'Arm Strength', 'Infield Drills', 'Outfield Routes', 'First Step Quickness'],
  strength: ['Strength Training', 'Explosive Power', 'Conditioning', 'Injury Prevention', 'Speed & Agility', 'Rotational Power', 'Recovery', 'Nutrition'],
};

const CERT_SUGGESTIONS = ['NSCA-CSCS', 'USA Baseball Coach', 'Driveline Certified', 'Rapsodo Certified'];

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

export default function CoachEditProfilePage() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [venmoError, setVenmoError] = useState('');
  const [certInput, setCertInput] = useState('');
  const [affiliationSearch, setAffiliationSearch] = useState('');
  const [showAffiliationDropdown, setShowAffiliationDropdown] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [showCustomSkillInput, setShowCustomSkillInput] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoUploadedUrl, setVideoUploadedUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const videoRecordRef = useRef<HTMLInputElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    specialty: '', secondarySpecialty: '', bio: '', yearsExperience: '',
    sessionTypes: [{ label: '1-on-1 Private', price: '' }] as { label: string; price: string }[],
    city: '', state: '', streetAddress: '',
    skills: [] as string[], certifications: [] as string[],
    photoUrl: '', venmoHandle: '',
    affiliations: [] as { name: string; logoUrl: string | null }[],
  });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'coach_profiles', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          const loadedSessionTypes = Array.isArray(d.session_types_with_price) && d.session_types_with_price.length > 0
            ? d.session_types_with_price.map((s: any) => ({ label: String(s.label || ''), price: String(s.price || '') }))
            : [
                ...(d.price_per_session ? [{ label: '1-on-1 Private', price: String(d.price_per_session) }] : []),
                ...(d.price_group ? [{ label: 'Group Session', price: String(d.price_group) }] : []),
                ...(d.price_virtual ? [{ label: 'Virtual / Film Review', price: String(d.price_virtual) }] : []),
              ].filter(s => s.price) || [{ label: '1-on-1 Private', price: '' }];
          setProfile({
            specialty: d.specialty || '',
            secondarySpecialty: d.secondary_specialty || '',
            bio: d.bio || '',
            yearsExperience: String(d.years_experience || ''),
            sessionTypes: loadedSessionTypes.length > 0 ? loadedSessionTypes : [{ label: '1-on-1 Private', price: '' }],
            city: d.city || '',
            state: d.state || '',
            streetAddress: d.street_address || '',
            skills: d.skills || [],
            certifications: d.certifications || [],
            photoUrl: d.photo_url || '',
            venmoHandle: d.venmo_handle || '',
            affiliations: d.affiliations || [],
          });
          if (d.photo_url) setPhotoPreview(d.photo_url);
          if (d.video_url) setVideoUploadedUrl(d.video_url);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'coach_profiles');
      } finally { setLoading(false); }
    };
    fetch();
  }, [user]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5MB'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !user) return profile.photoUrl || null;
    setIsUploading(true);
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `coach_photos/${user.uid}/${Date.now()}_${photoFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, photoFile);
      uploadTask.on('state_changed',
        (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        (error) => { console.error(error); setIsUploading(false); reject(error); },
        async () => { const url = await getDownloadURL(uploadTask.snapshot.ref); setIsUploading(false); resolve(url); }
      );
    });
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { alert('Video must be under 500MB'); return; }
    setVideoPreviewUrl(URL.createObjectURL(file));
    setVideoFileName(file.name);
    if (!user) return;
    setIsVideoUploading(true);
    setVideoUploadProgress(0);
    setVideoUploadedUrl(null);
    const ext = file.name.split('.').pop() || 'mp4';
    const vRef = ref(storage, `coach_videos/${user.uid}/intro.${ext}`);
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
    e.target.value = '';
  };

  const toggleSkill = (skill: string) => setProfile(p => ({
    ...p, skills: p.skills.includes(skill)
      ? p.skills.filter(s => s !== skill)
      : p.skills.length < 6 ? [...p.skills, skill] : p.skills
  }));

  const addCert = (cert: string) => {
    const t = cert.trim();
    if (t && !profile.certifications.includes(t)) setProfile(p => ({ ...p, certifications: [...p.certifications, t] }));
    setCertInput('');
  };

  const removeCert = (cert: string) => setProfile(p => ({ ...p, certifications: p.certifications.filter(c => c !== cert) }));

  const handleSubmit = async () => {
    if (!user) return;
    if (!profile.venmoHandle.trim()) {
      setVenmoError('Venmo handle is required — players need it to pay you.');
      const el = document.getElementById('venmo-input');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setVenmoError('');
    setIsSubmitting(true);
    try {
      const photoUrl = await uploadPhoto();
      const prices = profile.sessionTypes.map(s => Number(s.price)).filter(p => p > 0);
      await setDoc(doc(db, 'coach_profiles', user.uid), {
        user_id: user.uid,
        specialty: profile.specialty,
        secondary_specialty: profile.secondarySpecialty || null,
        bio: profile.bio,
        years_experience: Number(profile.yearsExperience),
        session_types_with_price: profile.sessionTypes.map(s => ({ label: s.label.trim(), price: Number(s.price) })),
        price_per_session: prices.length > 0 ? Math.min(...prices) : 0,
        city: profile.city,
        state: profile.state,
        street_address: profile.streetAddress,
        skills: profile.skills,
        certifications: profile.certifications,
        ...(photoUrl && { photo_url: photoUrl }),
        venmo_handle: profile.venmoHandle.replace('@', '').trim(),
        affiliations: profile.affiliations,
        video_url: videoUploadedUrl || null,
        is_active: true,
        updated_at: serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'coach_profiles');
    } finally { setIsSubmitting(false); }
  };

  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' };
  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' };
  const iconStyle = { background: 'rgba(79,142,247,0.1)', color: '#4F8EF7' };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <Loader2 className="animate-spin" size={40} style={{ color: '#4F8EF7' }} />
    </div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen" style={{ background: '#0A0F1E' }}>

        {/* Header */}
        <div className="py-12 pt-28" style={{ background: 'rgba(79,142,247,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-3xl mx-auto px-4">
            <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium mb-6 w-fit" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#4F8EF7' }}>Coach Settings</p>
            <h1 className="text-3xl font-bold text-white">Edit Your Profile</h1>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">

          {/* Photo Upload */}
          <div className="rounded-3xl p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={iconStyle}>
                <Camera size={20} />
              </div>
              <div>
                <h2 className="font-bold text-white">Profile Photo</h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Upload your headshot (max 5MB)</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="relative shrink-0">
                <div className="w-32 h-32 rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
                    </div>
                  )}
                </div>
                {photoPreview && (
                  <button
                    onClick={() => { setPhotoPreview(null); setPhotoFile(null); setProfile(p => ({ ...p, photoUrl: '' })); }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: '#ef4444', color: 'white' }}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex-1">
                {isUploading ? (
                  <div>
                    <div className="flex justify-between text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <span>Uploading...</span><span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, background: '#4F8EF7' }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="btn-secondary py-3 px-6 text-sm mb-3 w-full">
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>JPG, PNG or WebP. Saved when you click Save Changes.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Specialty */}
          <div className="rounded-3xl p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={iconStyle}><Target size={20} /></div>
              <h2 className="font-bold text-white">Specialty</h2>
            </div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Primary</label>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {SPECIALTIES.map(spec => (
                <button key={spec} onClick={() => setProfile(p => ({ ...p, specialty: spec, skills: [] }))}
                  className="p-4 rounded-xl border-2 capitalize font-bold text-sm transition-all"
                  style={{
                    borderColor: profile.specialty === spec ? '#4F8EF7' : 'rgba(255,255,255,0.08)',
                    background: profile.specialty === spec ? 'rgba(79,142,247,0.15)' : 'transparent',
                    color: profile.specialty === spec ? '#4F8EF7' : 'rgba(255,255,255,0.5)',
                  }}>
                  {spec}
                </button>
              ))}
            </div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Secondary (optional)</label>
            <div className="grid grid-cols-2 gap-3">
              {SPECIALTIES.filter(s => s !== profile.specialty).map(spec => (
                <button key={spec}
                  onClick={() => setProfile(p => ({ ...p, secondarySpecialty: p.secondarySpecialty === spec ? '' : spec }))}
                  className="p-4 rounded-xl border-2 capitalize font-bold text-sm transition-all"
                  style={{
                    borderColor: profile.secondarySpecialty === spec ? '#4F8EF7' : 'rgba(255,255,255,0.08)',
                    background: profile.secondarySpecialty === spec ? 'rgba(79,142,247,0.15)' : 'transparent',
                    color: profile.secondarySpecialty === spec ? '#4F8EF7' : 'rgba(255,255,255,0.5)',
                  }}>
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Bio & Skills */}
          <div className="rounded-3xl p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={iconStyle}><User size={20} /></div>
              <div>
                <h2 className="font-bold text-white">About You</h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Write your bio as bullet points</p>
              </div>
            </div>

            <div className="mb-8">
              <textarea
                value={profile.bio}
                onFocus={e => {
                  if (!e.target.value.trim()) {
                    setProfile(p => ({ ...p, bio: '• ' }));
                    setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = 2; }, 0);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const ta = e.target as HTMLTextAreaElement;
                    const pos = ta.selectionStart;
                    const val = ta.value;
                    const newVal = val.slice(0, pos) + '\n• ' + val.slice(pos);
                    setProfile(p => ({ ...p, bio: newVal }));
                    setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + 3; }, 0);
                  }
                }}
                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                rows={6}
                placeholder={"• Your achievement here\n• Another accomplishment\n• Your coaching philosophy"}
                className="w-full rounded-xl p-4 text-sm resize-none"
                style={{ ...inputStyle, lineHeight: '1.8' }}
              />
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Each line auto-formats as a bullet point. Press Enter for a new one.
              </p>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
              <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Skills (up to 6)</label>
              <div className="flex flex-wrap gap-2">
                {(skillSuggestions[profile.specialty] || []).map(skill => (
                  <button key={skill} onClick={() => toggleSkill(skill)}
                    className="px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                    style={{
                      borderColor: profile.skills.includes(skill) ? '#4F8EF7' : 'rgba(255,255,255,0.08)',
                      background: profile.skills.includes(skill) ? 'rgba(79,142,247,0.15)' : 'transparent',
                      color: profile.skills.includes(skill) ? '#4F8EF7' : 'rgba(255,255,255,0.4)',
                    }}>
                    {skill}
                  </button>
                ))}
              </div>
              {profile.skills.filter(s => !(skillSuggestions[profile.specialty] || []).includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.skills.filter(s => !(skillSuggestions[profile.specialty] || []).includes(s)).map(skill => (
                    <button key={skill} onClick={() => toggleSkill(skill)}
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid #7C3AED', color: '#A78BFA' }}>
                      <CheckCircle2 size={12} className="inline mr-1" />{skill}
                    </button>
                  ))}
                </div>
              )}
              {profile.specialty && (
                <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{profile.skills.length}/6 selected</p>
              )}
              {showCustomSkillInput ? (
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={e => setCustomSkillInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const t = customSkillInput.trim();
                        if (t && profile.skills.length < 6) toggleSkill(t);
                        setCustomSkillInput('');
                        setShowCustomSkillInput(false);
                      }
                    }}
                    placeholder="e.g. Pitch Clock Management"
                    className="flex-1 rounded-xl p-3 text-sm"
                    style={inputStyle}
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const t = customSkillInput.trim();
                      if (t && profile.skills.length < 6) toggleSkill(t);
                      setCustomSkillInput('');
                      setShowCustomSkillInput(false);
                    }}
                    className="px-4 rounded-xl text-sm font-bold"
                    style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustomSkillInput(true)}
                  disabled={profile.skills.length >= 6}
                  className="flex items-center gap-1.5 text-xs font-bold mt-3 px-3 py-2 rounded-xl transition-all disabled:opacity-30"
                  style={{ color: '#A78BFA', border: '1px solid rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.08)' }}>
                  <Plus size={12} /> Add Custom Skill
                </button>
              )}
            </div>
          </div>

          {/* Affiliations */}
          <div className="rounded-3xl p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                <Award size={20} />
              </div>
              <div>
                <h2 className="font-bold text-white">Professional Affiliations</h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Teams, colleges, or leagues you've played or coached for</p>
              </div>
            </div>

            {profile.affiliations.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.affiliations.map(aff => (
                  <div key={aff.name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {aff.logoUrl && (
                      <img src={aff.logoUrl} alt={aff.name} className="w-5 h-5 object-contain" />
                    )}
                    <span className="text-sm font-medium text-white">{aff.name}</span>
                    <button
                      onClick={() => setProfile(p => ({ ...p, affiliations: p.affiliations.filter(a => a.name !== aff.name) }))}
                      className="opacity-50 hover:opacity-100 ml-1 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Search size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search teams, colleges, leagues..."
                  value={affiliationSearch}
                  onChange={e => { setAffiliationSearch(e.target.value); setShowAffiliationDropdown(true); }}
                  onFocus={() => setShowAffiliationDropdown(true)}
                  onBlur={() => setTimeout(() => setShowAffiliationDropdown(false), 150)}
                  className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                />
              </div>
              {showAffiliationDropdown && affiliationSearch.length > 0 && (
                <div className="absolute z-20 w-full mt-2 rounded-2xl overflow-hidden shadow-xl"
                  style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {AFFILIATION_OPTIONS.filter(o =>
                    !profile.affiliations.find(a => a.name === o.name) &&
                    o.name.toLowerCase().includes(affiliationSearch.toLowerCase())
                  ).slice(0, 8).map(opt => (
                    <button
                      key={opt.name}
                      onMouseDown={() => {
                        setProfile(p => ({ ...p, affiliations: [...p.affiliations, { name: opt.name, logoUrl: opt.logoUrl }] }));
                        setAffiliationSearch('');
                        setShowAffiliationDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {opt.logoUrl ? (
                        <img src={opt.logoUrl} alt={opt.name} className="w-6 h-6 object-contain shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                          {opt.name[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{opt.name}</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{opt.category}</div>
                      </div>
                    </button>
                  ))}
                  {AFFILIATION_OPTIONS.filter(o =>
                    !profile.affiliations.find(a => a.name === o.name) &&
                    o.name.toLowerCase().includes(affiliationSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No results found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Certifications */}
          <div className="rounded-3xl p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={iconStyle}><Award size={20} /></div>
              <h2 className="font-bold text-white">Certifications</h2>
            </div>
            {profile.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.certifications.map(cert => (
                  <div key={cert} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold"
                    style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.25)', color: '#4F8EF7' }}>
                    {cert}
                    <button onClick={() => removeCert(cert)} className="opacity-60 hover:opacity-100 ml-1">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mb-4">
              <input type="text" value={certInput} onChange={e => setCertInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCert(certInput)}
                placeholder="Type certification and press Enter"
                className="flex-1 rounded-xl p-4 text-sm" style={inputStyle} />
              <button onClick={() => addCert(certInput)} disabled={!certInput.trim()}
                className="px-4 rounded-xl font-bold text-sm disabled:opacity-30"
                style={{ background: 'rgba(79,142,247,0.2)', color: '#4F8EF7', border: '1px solid rgba(79,142,247,0.3)' }}>
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {CERT_SUGGESTIONS.filter(c => !profile.certifications.includes(c)).map(cert => (
                <button key={cert} onClick={() => addCert(cert)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                  + {cert}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-3xl p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={iconStyle}><DollarSign size={20} /></div>
              <div>
                <h2 className="font-bold text-white">Pricing & Experience</h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Set your rate for each session type you offer</p>
              </div>
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
                    className="flex-1 rounded-xl p-4 text-sm text-white focus:outline-none"
                    style={inputStyle}
                  />
                  <div className="flex items-center rounded-xl overflow-hidden shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="pl-3 text-sm font-bold shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>$</span>
                    <input
                      type="number"
                      placeholder="100"
                      value={st.price}
                      onChange={e => setProfile(p => {
                        const updated = [...p.sessionTypes];
                        updated[idx] = { ...updated[idx], price: e.target.value };
                        return { ...p, sessionTypes: updated };
                      })}
                      className="w-24 bg-transparent py-4 pr-3 pl-1 text-sm text-white focus:outline-none"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  {profile.sessionTypes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setProfile(p => ({ ...p, sessionTypes: p.sessionTypes.filter((_, i) => i !== idx) }))}
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all hover:bg-red-500/10"
                      style={{ color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setProfile(p => ({ ...p, sessionTypes: [...p.sessionTypes, { label: '', price: '' }] }))}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl mb-6 transition-all hover:bg-blue-500/10"
              style={{ color: '#4F8EF7', border: '1px solid rgba(79,142,247,0.2)' }}>
              <Plus size={14} /> Add Session Type
            </button>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Years Experience</label>
              <input type="number" value={profile.yearsExperience}
                onChange={e => setProfile(p => ({ ...p, yearsExperience: e.target.value }))}
                placeholder="5" className="w-full rounded-xl p-4 text-sm" style={inputStyle} />
            </div>
          </div>

          {/* Location */}
          <div className="rounded-3xl p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={iconStyle}><MapPin size={20} /></div>
              <h2 className="font-bold text-white">Location</h2>
            </div>
            <div className="space-y-4">
              <input type="text" value={profile.streetAddress}
                onChange={e => setProfile(p => ({ ...p, streetAddress: e.target.value }))}
                placeholder="Training facility / address" className="w-full rounded-xl p-4 text-sm" style={inputStyle} />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={profile.city}
                  onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                  placeholder="City" className="w-full rounded-xl p-4 text-sm" style={inputStyle} />
                <input type="text" value={profile.state} maxLength={2}
                  onChange={e => setProfile(p => ({ ...p, state: e.target.value.toUpperCase() }))}
                  placeholder="CA" className="w-full rounded-xl p-4 text-sm" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Venmo */}
          <div className="rounded-3xl p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,141,245,0.12)', color: '#008DF5' }}>
                <CreditCard size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-white">Venmo Handle <span style={{ color: '#ef4444' }}>*</span></h2>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>Required</span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Players pay you directly via Venmo after sessions</p>
              </div>
            </div>
            <div id="venmo-input" className="flex items-center gap-3 rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${venmoError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
              <span className="pl-4 font-bold text-sm shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>@</span>
              <input
                type="text"
                value={profile.venmoHandle}
                onChange={e => {
                  setVenmoError('');
                  setProfile(p => ({ ...p, venmoHandle: e.target.value.replace('@', '').replace(/\s/g, '') }));
                }}
                placeholder="your-venmo-username"
                className="flex-1 bg-transparent py-4 pr-4 text-sm text-white focus:outline-none"
              />
            </div>
            {venmoError && (
              <p className="text-xs mt-2 font-medium" style={{ color: '#ef4444' }}>{venmoError}</p>
            )}
            {!venmoError && profile.venmoHandle && (
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Students will pay: venmo.com/u/{profile.venmoHandle}
              </p>
            )}
          </div>

          {/* Video Intro */}
          <div className="rounded-3xl p-8" style={cardStyle}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}>
                <Video size={20} />
              </div>
              <div>
                <h2 className="font-bold text-white">Intro Video</h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Introduce yourself to players — coaches with intro videos get 5x more bookings</p>
              </div>
            </div>

            {/* Hidden file inputs */}
            <input ref={videoRecordRef} type="file" accept="video/*" capture="user" className="hidden"
              onChange={handleVideoSelect} />
            <input ref={videoUploadRef} type="file" accept="video/mp4,video/mov,video/avi,video/webm,video/quicktime" className="hidden"
              onChange={handleVideoSelect} />

            {!videoUploadedUrl && !isVideoUploading && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button type="button" onClick={() => videoRecordRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl p-5 transition-all"
                  style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#A78BFA' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
                    <Video size={20} />
                  </div>
                  <span className="text-sm font-bold">Record Now</span>
                  <span className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>Use your webcam or phone camera</span>
                </button>
                <button type="button" onClick={() => videoUploadRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl p-5 transition-all"
                  style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', color: '#93C5FD' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,142,247,0.15)' }}>
                    <Upload size={20} />
                  </div>
                  <span className="text-sm font-bold">Upload Video</span>
                  <span className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>MP4, MOV, AVI, WebM</span>
                </button>
              </div>
            )}

            {isVideoUploading && (
              <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Uploading {videoFileName}...
                  </span>
                  <span className="text-xs font-bold" style={{ color: '#A78BFA' }}>{videoUploadProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${videoUploadProgress}%`, background: 'linear-gradient(90deg, #7C3AED, #4F8EF7)' }} />
                </div>
              </div>
            )}

            {videoUploadedUrl && !isVideoUploading && (
              <div className="mt-4 space-y-3">
                <video src={videoPreviewUrl || videoUploadedUrl} controls className="w-full rounded-2xl"
                  style={{ maxHeight: 200, background: '#000' }} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
                      <CheckCircle2 size={12} style={{ color: '#22c55e' }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: '#22c55e' }}>
                      {videoFileName || 'Video uploaded'}
                    </span>
                  </div>
                  <button type="button" onClick={() => { videoUploadRef.current?.click(); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Replace
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex justify-between items-center pb-12">
            <Link to="/dashboard" className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</Link>
            <button onClick={handleSubmit} disabled={isSubmitting || isUploading || isVideoUploading}
              className="btn-primary py-4 px-10 flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? (
                <><Loader2 className="animate-spin" size={16} />
                  {isUploading ? `Uploading ${uploadProgress}%...` : isVideoUploading ? `Uploading video ${videoUploadProgress}%...` : 'Saving...'}
                </>
              ) : saved ? (
                <><CheckCircle2 size={16} /> Saved!</>
              ) : (
                <><Save size={16} /> Save Changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}