import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { SPRING } from '../tokens';
import { MeshCard, BaseballField, FloatingSpheres, Eyebrow } from '../components/visuals';

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
      <div className="min-h-screen pt-24" style={{ background: 'var(--paper)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch min-h-[640px]">

            {/* ─── LEFT: baseball field mesh panel ─── */}
            <motion.div
              initial={{ opacity: 0, x: prefersReduced ? 0 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING }}
              className="hidden lg:block"
            >
              <MeshCard className="relative h-full p-10 flex flex-col justify-between">
                <FloatingSpheres spheres={[
                  { size: 110, color: 'rgba(173,197,215,0.6)', top: '8%', right: '8%', drift: 18 },
                  { size: 90, color: 'rgba(219,167,132,0.55)', bottom: '20%', left: '6%', delay: 1, drift: 16 },
                ]} />
                <div className="absolute inset-0 flex items-center justify-center opacity-90 pointer-events-none">
                  <BaseballField variant="hero" className="w-[78%] max-w-[420px]" />
                </div>

                <div className="relative z-10">
                  <Eyebrow>CoachGo · San Diego</Eyebrow>
                  <h2 className="display-lg mt-5 mb-4">Train with<br />specialists</h2>
                  <p className="text-base max-w-md" style={{ color: 'var(--ink-soft)' }}>
                    Elite hitting, pitching, fielding & strength coaches — vetted, ranked, and ready for your next session.
                  </p>
                </div>

                <div className="relative z-10 grid grid-cols-3 gap-4 pt-8" style={{ borderTop: '1px solid var(--line)' }}>
                  {[
                    { value: '8+', label: 'Coaches' },
                    { value: '4',  label: 'Disciplines' },
                    { value: '4.9★', label: 'Avg rating' },
                  ].map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: 0.6 + i * 0.1 }}
                    >
                      <p className="font-display text-3xl" style={{ color: 'var(--ink)' }}>{s.value}</p>
                      <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>{s.label}</p>
                    </motion.div>
                  ))}
                </div>
              </MeshCard>
            </motion.div>

            {/* ─── RIGHT: Form ─── */}
            <motion.div
              initial={{ opacity: 0, x: prefersReduced ? 0 : 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING, delay: 0.1 }}
              className="flex items-center justify-center relative"
            >
              <div className="max-w-md w-full relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING }}
                  className="text-center lg:text-left mb-10"
                >
                  <Eyebrow>{isLogin ? 'Welcome back' : 'Get started'}</Eyebrow>
                  <h1 className="display-lg mt-5 mb-3">
                    {isLogin ? 'Sign in' : 'Join us'}
                  </h1>
                  <p style={{ color: 'var(--ink-soft)' }}>
                    {isLogin ? 'Continue your development journey.' : 'Start your journey to the next level today.'}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.1 }}
                >
                  <div className="cg-card p-8">
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
                          style={{ background: 'rgba(188,90,72,0.1)', border: '1px solid rgba(188,90,72,0.35)', color: '#BC5A48', boxShadow: '0 0 24px rgba(188,90,72,0.18)' }}
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
                        style={{ background: 'rgba(94,140,90,0.08)', border: '1px solid rgba(94,140,90,0.2)', color: '#5E8C5A' }}
                      >
                        Password reset email sent. Check your inbox.
                      </motion.div>
                    )}

                    {!isLogin && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...SPRING, delay: 0.12 }}
                        className="flex p-1 rounded-full mb-8"
                        style={{ background: 'var(--paper-warm)', border: '1px solid var(--line)' }}
                      >
                        {(['player', 'coach'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className="flex-1 py-2.5 rounded-full text-sm transition-all capitalize"
                            style={{
                              background: role === r ? 'var(--black)' : 'transparent',
                              color: role === r ? 'var(--paper)' : 'var(--ink-soft)',
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
                          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(27,24,19,0.4)' }}>Full Name</label>
                          <input
                            type="text" required value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="cg-input"
                            style={{ colorScheme: 'light' }}
                            placeholder="Your full name"
                          />
                        </motion.div>
                      )}
                      <motion.div variants={fieldItem}>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(27,24,19,0.4)' }}>Email Address</label>
                        <input
                          type="email" required value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="cg-input"
                          style={{ colorScheme: 'light' }}
                          placeholder="name@example.com"
                        />
                      </motion.div>
                      <motion.div variants={fieldItem}>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(27,24,19,0.4)' }}>Password</label>
                        <input
                          type="password" required value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="cg-input"
                          style={{ colorScheme: 'light' }}
                          placeholder="••••••••"
                        />
                      </motion.div>

                      <motion.div variants={fieldItem}>
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn-primary w-full py-4 text-base mt-2 justify-center disabled:opacity-50"
                        >
                          {loading ? (
                            <span className="inline-flex items-center gap-2">
                              <motion.span
                                className="inline-block w-4 h-4 rounded-full border-2 border-[rgba(246,244,239,0.3)] border-t-[#F6F4EF]"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                              />
                              Processing…
                            </span>
                          ) : (isLogin ? 'Sign in' : 'Create account')}
                        </button>
                      </motion.div>

                      {isLogin && (
                        <motion.button
                          variants={fieldItem}
                          type="button"
                          onClick={handleForgotPassword}
                          className="w-full text-center text-xs mt-1 font-bold uppercase tracking-widest transition-colors hover:text-ink"
                          style={{ color: 'rgba(27,24,19,0.3)' }}
                        >
                          Forgot password?
                        </motion.button>
                      )}
                    </motion.form>

                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full" style={{ borderTop: '1px solid rgba(27,24,19,0.08)' }} />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-widest">
                        <span className="px-4 text-xs" style={{ background: 'var(--card-cream)', color: 'var(--ink-faint)' }}>Or continue with</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full py-3.5 rounded-full flex items-center justify-center gap-3 transition-colors hover:bg-[rgba(27,24,19,0.04)]"
                      style={{ background: 'transparent', border: '1px solid var(--line-strong)', color: 'var(--ink)' }}
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                      Continue with Google
                    </button>

                    <p className="text-center mt-8 text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>
                      {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                      <button
                        onClick={() => { setIsLogin(!isLogin); setError(null); }}
                        className="text-ink font-bold hover:underline"
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
