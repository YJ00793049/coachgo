import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { logEvent } from 'firebase/analytics';
import { auth, analytics } from './firebase';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import SupportAIChat from './components/SupportAIChat';
import ScrollProgressBar from './components/ScrollProgressBar';
import CursorGlow from './components/CursorGlow';
import GrainOverlay from './components/GrainOverlay';
import { AnimatePresence } from 'framer-motion';

// Eagerly loaded (small/critical)
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

// Lazy-loaded heavy pages
const CoachesPage        = lazy(() => import('./pages/CoachesPage'));
const CoachProfilePage   = lazy(() => import('./pages/CoachProfilePage'));
const BookingPage        = lazy(() => import('./pages/BookingPage'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const AboutPage          = lazy(() => import('./pages/AboutPage'));
const SupportPage        = lazy(() => import('./pages/SupportPage'));
const HelpCenterPage     = lazy(() => import('./pages/HelpCenterPage'));
const ContactPage        = lazy(() => import('./pages/ContactPage'));
const CoachOnboardingPage   = lazy(() => import('./pages/CoachOnboardingPage'));
const CoachEditProfilePage  = lazy(() => import('./pages/CoachEditProfilePage'));
const CoachAvailabilityPage = lazy(() => import('./pages/CoachAvailabilityPage'));
const MessagesPage       = lazy(() => import('./pages/MessagesPage'));
const PlayerProfilePage  = lazy(() => import('./pages/PlayerProfilePage'));
const AdminPage          = lazy(() => import('./pages/AdminPage'));

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080B14' }}>
      <div className="w-10 h-10 border-4 border-white/10 border-t-white/60 rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();

  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'page_view', { page_path: location.pathname });
    }
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <React.Fragment key={location.pathname}>
        <Suspense fallback={<PageSpinner />}>
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/coaches" element={<CoachesPage />} />
            <Route path="/coaches/:id" element={<CoachProfilePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/help" element={<HelpCenterPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/coach-onboarding" element={
              <ProtectedRoute><CoachOnboardingPage /></ProtectedRoute>
            } />
            <Route path="/coach-edit-profile" element={
              <ProtectedRoute><CoachEditProfilePage /></ProtectedRoute>
            } />
            <Route path="/coach-availability" element={
              <ProtectedRoute><CoachAvailabilityPage /></ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            } />
            <Route path="/messages/:conversationId" element={
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            } />
            <Route path="/book/:coachId" element={
              <ProtectedRoute><BookingPage /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><PlayerProfilePage /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute><AdminPage /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </React.Fragment>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      {/* Global visual layer */}
      <ScrollProgressBar />
      <CursorGlow />
      <GrainOverlay />

      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <ErrorBoundary>
            <AnimatedRoutes />
          </ErrorBoundary>
        </main>
        <SupportAIChat />
        <Footer />
      </div>
    </Router>
  );
}
