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
import GrainOverlay from './components/GrainOverlay';
import MaintenanceBanner from './components/MaintenanceBanner';
import { LanguageProvider } from './i18n';
import { AnimatePresence } from 'framer-motion';

// Eagerly loaded (small/critical)
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

// Lazy-loaded heavy pages
const CoachesPage        = lazy(() => import('./pages/CoachesPage'));
const CoachProfilePage   = lazy(() => import('./pages/CoachProfilePage'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const AboutPage          = lazy(() => import('./pages/AboutPage'));
const SupportPage        = lazy(() => import('./pages/SupportPage'));
const HelpCenterPage     = lazy(() => import('./pages/HelpCenterPage'));
const ContactPage        = lazy(() => import('./pages/ContactPage'));
const CoachOnboardingPage   = lazy(() => import('./pages/CoachOnboardingPage'));
const CoachEditProfilePage  = lazy(() => import('./pages/CoachEditProfilePage'));
const MessagesPage       = lazy(() => import('./pages/MessagesPage'));
const PlayerProfilePage  = lazy(() => import('./pages/PlayerProfilePage'));
const AdminPage          = lazy(() => import('./pages/AdminPage'));

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F6F4EF' }}>
      <div className="w-10 h-10 border-2 border-[rgba(27,24,19,0.12)] border-t-[rgba(27,24,19,0.55)] rounded-full animate-spin" />
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
            <Route path="/messages" element={
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            } />
            <Route path="/messages/:conversationId" element={
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><PlayerProfilePage /></ProtectedRoute>
            } />
            <Route path="/players/:id" element={
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
      <GrainOverlay />

      <ScrollToTop />
      <LanguageProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[10000] focus:px-4 focus:py-2 focus:rounded-full"
        style={{ background: '#16130E', color: '#F6F4EF' }}
      >
        Skip to content
      </a>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main id="main" className="flex-grow flex flex-col">
          <ErrorBoundary>
            <AnimatedRoutes />
          </ErrorBoundary>
        </main>
        <SupportAIChat />
        <Footer />
      </div>
      <MaintenanceBanner />
      </LanguageProvider>
    </Router>
  );
}
