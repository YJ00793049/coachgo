import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogOut, LayoutDashboard, Menu, X, MessageSquare, UserCircle } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { SPRING } from '../tokens';

export default function Navbar() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const prefersReduced = useReducedMotion();

  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 80], ['rgba(246,244,239,0)', 'rgba(246,244,239,0.82)']);
  const navBlur = useTransform(scrollY, [0, 80], ['blur(0px)', 'blur(16px) saturate(140%)']);
  const navBorder = useTransform(scrollY, [0, 80], ['rgba(27,24,19,0)', 'rgba(27,24,19,0.10)']);

  useEffect(() => { setIsMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => { await auth.signOut(); navigate('/'); };

  const navLinks = [
    { name: 'Home',    path: '/' },
    { name: 'Coaches', path: '/coaches' },
    { name: 'About',   path: '/about' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const mobileItemVariants = {
    hidden:  { opacity: 0, x: -16 },
    visible: (i: number) => ({
      opacity: 1, x: 0,
      transition: { ...SPRING, delay: i * 0.05 },
    }),
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: prefersReduced ? 'rgba(246,244,239,0.82)' : navBg,
        backdropFilter: prefersReduced ? 'blur(16px)' : navBlur,
        WebkitBackdropFilter: prefersReduced ? 'blur(16px)' : navBlur,
        borderBottom: `1px solid`,
        borderColor: prefersReduced ? 'rgba(27,24,19,0.10)' : navBorder,
      } as React.CSSProperties}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-[68px] items-center">

          {/* Wordmark */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span
              className="font-display tracking-tight"
              style={{ color: 'var(--ink)', fontSize: '1.55rem', lineHeight: 1 }}
            >
              CoachGo
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="group relative text-sm transition-colors duration-200"
                style={{ color: isActive(link.path) ? 'var(--ink)' : 'var(--ink-soft)' }}
              >
                <span className="relative">
                  {link.name}
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 -bottom-1 h-px origin-left transition-transform duration-300 group-hover:scale-x-100"
                    style={{ background: 'var(--ink)', transform: isActive(link.path) ? 'scaleX(1)' : 'scaleX(0)' }}
                  />
                </span>
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {[
                  { to: '/dashboard', icon: <LayoutDashboard size={15} />, label: 'Dashboard' },
                  { to: '/messages',  icon: <MessageSquare size={15} />,   label: 'Messages'  },
                  { to: '/profile',   icon: <UserCircle size={15} />,      label: 'Profile'   },
                ].map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-2 text-sm px-3.5 py-2 rounded-full transition-colors"
                    style={{
                      color: isActive(item.to) ? 'var(--ink)' : 'var(--ink-soft)',
                      background: isActive(item.to) ? 'rgba(27,24,19,0.05)' : 'transparent',
                    }}
                  >
                    {item.icon}{item.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="flex items-center gap-2 p-2 rounded-full transition-colors hover:bg-[rgba(188,90,72,0.10)]"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-sm px-3.5 py-2 rounded-full transition-colors hover:bg-[rgba(27,24,19,0.05)]"
                  style={{ color: 'var(--ink)' }}
                >
                  Sign in
                </Link>
                <Link to="/auth" className="btn-primary py-2 px-5 text-sm">Get started</Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-full transition-colors"
            style={{ color: 'var(--ink)' }}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X size={22} />
                </motion.div>
              ) : (
                <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu size={22} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="md:hidden overflow-hidden"
            style={{ background: 'rgba(246,244,239,0.98)', borderBottom: '1px solid rgba(27,24,19,0.10)', backdropFilter: 'blur(16px)' }}
          >
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((link, i) => (
                <motion.div key={link.name} custom={i} variants={mobileItemVariants} initial="hidden" animate="visible">
                  <Link
                    to={link.path}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-base transition-colors"
                    style={{
                      color: isActive(link.path) ? 'var(--ink)' : 'var(--ink-soft)',
                      background: isActive(link.path) ? 'rgba(27,24,19,0.05)' : 'transparent',
                    }}
                  >
                    {link.name}
                    {isActive(link.path) && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ink)' }} />}
                  </Link>
                </motion.div>
              ))}

              <div className="pt-4 space-y-2" style={{ borderTop: '1px solid rgba(27,24,19,0.10)' }}>
                {user ? (
                  <>
                    {[
                      { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard', i: navLinks.length },
                      { to: '/messages',  icon: <MessageSquare size={16} />,   label: 'Messages',  i: navLinks.length + 1 },
                      { to: '/profile',   icon: <UserCircle size={16} />,      label: 'Profile',   i: navLinks.length + 2 },
                    ].map(item => (
                      <motion.div key={item.to} custom={item.i} variants={mobileItemVariants} initial="hidden" animate="visible">
                        <Link to={item.to}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-colors"
                          style={{ color: 'var(--ink)' }}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      </motion.div>
                    ))}
                    <motion.div custom={navLinks.length + 3} variants={mobileItemVariants} initial="hidden" animate="visible">
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-colors"
                        style={{ color: 'var(--c-declined)' }}
                      >
                        <LogOut size={16} /> Log Out
                      </button>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div custom={navLinks.length} variants={mobileItemVariants} initial="hidden" animate="visible">
                      <Link to="/auth" className="btn-secondary w-full text-center py-3 block">Sign in</Link>
                    </motion.div>
                    <motion.div custom={navLinks.length + 1} variants={mobileItemVariants} initial="hidden" animate="visible">
                      <Link to="/auth" className="btn-primary w-full text-center py-3 block">Get started</Link>
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
