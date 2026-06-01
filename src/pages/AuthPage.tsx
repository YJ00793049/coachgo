import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { SPRING } from '../tokens';
import { GlowingEffect } from '@/components/ui/glowing-effect-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'player' | 'coach'>('player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorShakeKey, setErrorShakeKey] = useState(0);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  // Re-trigger error shake whenever a new error appears
  React.useEffect(() => { if (error) setErrorShakeKey(k => k + 1); }, [error]);

  // Stagger container for form fields
  const fieldContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: prefersReduced ? 0 : 0.07, delayChildren: 0.18 } },
  };
  const fieldItem = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 16 },
    visible: { opacity: 1, y: 0, transition: { ...SPRING } },
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Enter your email address above first.'); return; }
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email.');
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      let finalRole = role;
      if (userDoc.exists()) { finalRole = userDoc.data().role || 'player'; }
      await setDoc(userDocRef, {
        name: user.displayName || user.email?.split('@')[0] || 'Player', email: user.email, role: finalRole,
        avatar_url: user.photoURL,
        created_at: userDoc.exists() ? userDoc.data().created_at : serverTimestamp(),
        last_login: serverTimestamp()
      }, { merge: true });
      if (finalRole === 'coach') {
        const coachDoc = await getDoc(doc(db, 'coach_profiles', user.uid));
        const dest = !coachDoc.exists() ? '/coach-onboarding' : '/dashboard';
        if (location.pathname !== dest) navigate(dest);
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      const errorCode = error?.code || '';
      const errorMessage = error?.message || String(error);
      if (errorCode === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled in the Firebase Console. Please enable it in the Authentication tab.');
      } else if (errorCode.includes('invalid-credential') || errorMessage.toLowerCase().includes('invalid-credential')) {
        setError('Invalid credentials. Please check your Firebase Console settings.');
      } else if (errorCode === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else {
        setError(errorMessage || 'An error occurred during Google Sign In');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'coach') {
            const coachDoc = await getDoc(doc(db, 'coach_profiles', result.user.uid));
            navigate(!coachDoc.exists() ? '/coach-onboarding' : '/dashboard');
          } else { navigate('/dashboard'); }
        } else { navigate('/dashboard'); }
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', result.user.uid), {
          name, email, role, created_at: serverTimestamp(), last_login: serverTimestamp()
        });
        navigate(role === 'coach' ? '/coach-onboarding' : '/dashboard');
      }
    } catch (error: any) {
      const errorCode = error?.code || '';
      const errorMessage = error?.message || String(error);
      if (errorCode === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled in the Firebase Console.');
      } else if (errorCode.includes('invalid-credential') || errorCode.includes('wrong-password') || errorCode.includes('user-not-found')) {
        setError('Invalid email or password.');
      } else if (errorCode === 'auth/email-already-in-use') {
        setError('This email is already in use. Please log in instead.');
      } else if (errorCode === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError(errorMessage || 'An error occurred during authentication');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pt-24" style={{ background: '#080B14' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch min-h-[640px]">

            {/* ─── LEFT: Animated baseball field gradient panel ─── */}
            <motion.div
              initial={{ opacity: 0, x: prefersReduced ? 0 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING }}
              className="hidden lg:flex relative rounded-3xl overflow-hidden flex-col justify-between p-10"
              style={{
                background: 'linear-gradient(155deg, #0A0F1E 0%, #0C1530 55%, #050810 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* aurora layers */}
              <motion.div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 90% 60% at 30% 10%, rgba(79,142,247,0.30) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(124,58,237,0.22) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 60% 50%, rgba(6,182,212,0.16) 0%, transparent 60%)',
                }}
                animate={prefersReduced ? {} : { opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Baseball field SVG illustration */}
              <motion.svg
                aria-hidden
                viewBox="0 0 400 400"
                className="absolute inset-0 w-full h-full opacity-40"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 0.4, scale: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              >
                {/* outfield arc */}
                <motion.path
                  d="M 200 380 Q 60 380 60 200 Q 60 70 200 70 Q 340 70 340 200 Q 340 380 200 380 Z"
                  fill="none"
                  stroke="rgba(79,142,247,0.35)"
                  strokeWidth={1.2}
                  strokeDasharray="4 8"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.4 }}
                />
                {/* infield diamond */}
                <motion.path
                  d="M 200 290 L 280 220 L 200 150 L 120 220 Z"
                  fill="none"
                  stroke="rgba(79,142,247,0.6)"
                  strokeWidth={1.5}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.7 }}
                />
                {/* bases */}
                {[
                  [200, 290], [280, 220], [200, 150], [120, 220],
                ].map(([cx, cy], i) => (
                  <motion.rect
                    key={i}
                    x={cx - 6}
                    y={cy - 6}
                    width={12}
                    height={12}
                    transform={`rotate(45 ${cx} ${cy})`}
                    fill="rgba(79,142,247,0.85)"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...SPRING, delay: 1.4 + i * 0.12 }}
                  />
                ))}
                {/* pitcher's mound */}
                <motion.circle
                  cx={200}
                  cy={220}
                  r={10}
                  fill="rgba(245,158,11,0.7)"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 0.9, scale: 1 }}
                  transition={{ ...SPRING, delay: 2.0 }}
                />
                {/* foul lines */}
                <motion.line x1={200} y1={290} x2={50}  y2={380} stroke="rgba(255,255,255,0.18)" strokeWidth={0.6}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 1.2 }} />
                <motion.line x1={200} y1={290} x2={350} y2={380} stroke="rgba(255,255,255,0.18)" strokeWidth={0.6}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 1.2 }} />
              </motion.svg>

              {/* Floating particle dots */}
              {!prefersReduced && Array.from({ length: 14 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${(i * 73) % 100}%`,
                    top: `${(i * 47) % 100}%`,
                    width: 3 + (i % 3),
                    height: 3 + (i % 3),
                    background: 'rgba(79,142,247,0.6)',
                    filter: 'blur(0.5px)',
                  }}
                  animate={{ y: [0, -22, 0], opacity: [0.2, 0.8, 0.2] }}
                  transition={{ duration: 6 + (i % 5), delay: -i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}

              <div className="relative z-10">
                <span className="tag-badge inline-block mb-6">CoachGo · San Diego</span>
                <h2 className="font-display text-5xl xl:text-6xl text-white leading-[0.95] tracking-wide mb-6">
                  TRAIN WITH<br />
                  <span className="gradient-headline">SPECIALISTS.</span>
                </h2>
                <p className="text-base max-w-md" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Elite hitting, pitching, fielding & strength coaches — vetted, ranked, and ready for your next session.
                </p>
              </div>

              <div className="relative z-10 grid grid-cols-3 gap-4 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { value: '8+', label: 'Coaches' },
                  { value: '4',  label: 'Disciplines' },
                  { value: '4.9★', label: 'Avg Rating' },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING, delay: 0.8 + i * 0.1 }}
                  >
                    <p className="font-display text-2xl text-white">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* ─── RIGHT: Form ─── */}
            <motion.div
              initial={{ opacity: 0, x: prefersReduced ? 0 : 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING, delay: 0.1 }}
              className="flex items-center justify-center relative"
            >
              {/* background orbs (kept) */}
              <div className="fixed inset-0 pointer-events-none overflow-hidden lg:hidden">
                <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,142,247,0.12) 0%, transparent 70%)', top: '-200px', left: '-100px', filter: 'blur(80px)' }} />
                <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)', bottom: '-100px', right: '-100px', filter: 'blur(80px)' }} />
              </div>

              <div className="max-w-md w-full relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING }}
                  className="text-center lg:text-left mb-10"
                >
                  <span className="tag-badge mb-6 inline-block">
                    {isLogin ? 'Welcome Back' : 'Get Started'}
                  </span>
                  <h1 className="font-display text-5xl md:text-6xl text-white leading-none mb-4">
                    {isLogin ? 'SIGN IN' : 'JOIN US'}
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {isLogin ? 'Continue your development journey.' : 'Start your journey to the next level today.'}
                  </p>
                </motion.div>

                {/* Card with GlowingEffect */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.1 }}
                  className="relative rounded-3xl"
                >
                  <GlowingEffect disabled={false} spread={60} borderWidth={2} proximity={100} />
                  <div
                    className="rounded-3xl p-8"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          key={`err-${errorShakeKey}`}
                          initial={{ opacity: 0, y: -8, x: 0 }}
                          animate={prefersReduced
                            ? { opacity: 1, y: 0 }
                            : { opacity: 1, y: 0, x: [0, -10, 10, -8, 8, -4, 4, 0] }
                          }
                          exit={{ opacity: 0, y: -8 }}
                          transition={prefersReduced ? { duration: 0.2 } : { duration: 0.55, ease: [0.36, 0.07, 0.19, 0.97] }}
                          className="mb-6 p-4 rounded-xl text-sm"
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', boxShadow: '0 0 24px rgba(239,68,68,0.18)' }}
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {resetSent && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-xl text-sm"
                        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}
                      >
                        Password reset email sent. Check your inbox.
                      </motion.div>
                    )}

                    {!isLogin && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...SPRING, delay: 0.12 }}
                        className="flex p-1 rounded-2xl mb-8"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {(['player', 'coach'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setRole(r)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all capitalize"
                            style={{
                              background: role === r ? 'linear-gradient(135deg, #4F8EF7, #2563EB)' : 'transparent',
                              color: role === r ? 'white' : 'rgba(255,255,255,0.45)',
                              boxShadow: role === r ? '0 4px 12px rgba(79,142,247,0.35)' : 'none',
                            }}
                          >
                            I'm a {r}
                          </button>
                        ))}
                      </motion.div>
                    )}

                    <motion.form
                      onSubmit={handleSubmit}
                      className="space-y-5"
                      variants={fieldContainer}
                      initial="hidden"
                      animate="visible"
                      key={isLogin ? 'login' : 'signup'}
                    >
                      {!isLogin && (
                        <motion.div variants={fieldItem}>
                          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Full Name</label>
                          <input
                            type="text" required value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl p-4 text-white focus:outline-none transition-all focus:ring-2 focus:ring-blue-500/50"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                            placeholder="Your full name"
                          />
                        </motion.div>
                      )}
                      <motion.div variants={fieldItem}>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Email Address</label>
                        <input
                          type="email" required value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl p-4 text-white focus:outline-none transition-all focus:ring-2 focus:ring-blue-500/50"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                          placeholder="name@example.com"
                        />
                      </motion.div>
                      <motion.div variants={fieldItem}>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Password</label>
                        <input
                          type="password" required value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-xl p-4 text-white focus:outline-none transition-all focus:ring-2 focus:ring-blue-500/50"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                          placeholder="••••••••"
                        />
                      </motion.div>

                      <motion.div variants={fieldItem}>
                        <ShimmerButton
                          type="submit"
                          disabled={loading}
                          shimmerColor="#4F8EF7"
                          shimmerDuration="2.5s"
                          borderRadius="12px"
                          background="linear-gradient(135deg, #4F8EF7 0%, #2563EB 100%)"
                          className="w-full py-4 font-bold text-base mt-2 disabled:opacity-50"
                        >
                          {loading ? (
                            <span className="inline-flex items-center gap-2">
                              <motion.span
                                className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                              />
                              Processing...
                            </span>
                          ) : (isLogin ? 'Sign In' : 'Create Account')}
                        </ShimmerButton>
                      </motion.div>

                      {isLogin && (
                        <motion.button
                          variants={fieldItem}
                          type="button"
                          onClick={handleForgotPassword}
                          className="w-full text-center text-xs mt-1 font-bold uppercase tracking-widest transition-colors hover:text-white"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                          Forgot password?
                        </motion.button>
                      )}
                    </motion.form>

                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-widest">
                        <span className="px-4 text-xs font-bold" style={{ background: '#111', color: 'rgba(255,255,255,0.3)' }}>Or continue with</span>
                      </div>
                    </div>

                    <button
                      onClick={handleGoogleSignIn}
                      className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:opacity-90"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'white' }}
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                      Continue with Google
                    </button>

                    <p className="text-center mt-8 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                      <button
                        onClick={() => { setIsLogin(!isLogin); setError(null); }}
                        className="text-white font-bold hover:underline"
                      >
                        {isLogin ? 'Sign Up' : 'Log In'}
                      </button>
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}
