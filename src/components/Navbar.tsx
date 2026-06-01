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
  const navBg = useTransform(scrollY, [0, 80], ['rgba(8,11,20,0)', 'rgba(8,11,20,0.92)']);
  const navBlur = useTransform(scrollY, [0, 80], ['blur(0px)', 'blur(20px) saturate(180%)']);
  const navBorder = useTransform(scrollY, [0, 80], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.07)']);
  const navShadow = useTransform(scrollY, [0, 80], ['none', '0 1px 30px rgba(0,0,0,0.35)']);

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
    hidden:  { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1, x: 0,
      transition: { ...SPRING, delay: i * 0.06 },
    }),
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: prefersReduced ? 'rgba(8,11,20,0.92)' : navBg,
        backdropFilter: prefersReduced ? 'blur(20px)' : navBlur,
        WebkitBackdropFilter: prefersReduced ? 'blur(20px)' : navBlur,
        borderBottom: `1px solid`,
        borderColor: prefersReduced ? 'rgba(255,255,255,0.07)' : navBorder,
        boxShadow: prefersReduced ? '0 1px 30px rgba(0,0,0,0.3)' : navShadow,
      } as React.CSSProperties}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <motion.div
              whileHover={prefersReduced ? {} : { scale: 1.08, rotate: 3 }}
              transition={SPRING}
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white"
              style={{
                background: 'linear-gradient(135deg, #4F8EF7, #2563EB)',
                boxShadow: '0 0 20px rgba(79,142,247,0.35)',
                willChange: 'transform',
              }}
            >
              CG
            </motion.div>
            <motion.span
              className="font-bold text-lg tracking-tight text-white"
              whileHover={prefersReduced ? {} : { letterSpacing: '0.04em' }}
              transition={{ duration: 0.3 }}
            >
              CoachGo
            </motion.span>
          </Link>

          {/* Desktop nav links with layoutId sliding indicator + hover scaleX underline */}
          <div className="hidden md:flex items-center gap-1 relative">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="group relative px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200"
                style={{ color: isActive(link.path) ? 'white' : 'rgba(255,255,255,0.5)' }}
              >
                {isActive(link.path) && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                    transition={{ ...SPRING }}
                  />
                )}
                <span className="relative z-10">{link.name}</span>
                {/* hover underline — scaleX from left */}
                <span
                  aria-hidden
                  className="absolute left-3 right-3 -bottom-0.5 h-px origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100"
                  style={{ background: 'linear-gradient(90deg, #4F8EF7, #7C3AED)', opacity: isActive(link.path) ? 0 : 1 }}
                />
                {isActive(link.path) && (
                  <motion.div
                    layoutId="nav-active-dot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: '#4F8EF7', boxShadow: '0 0 8px #4F8EF7' }}
                    transition={SPRING}
                  />
                )}
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
                  <motion.div key={item.to} whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                    <Link
                      to={item.to}
                      className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                      style={{
                        color: isActive(item.to) ? 'white' : 'rgba(255,255,255,0.7)',
                        background: isActive(item.to) ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isActive(item.to) ? 'rgba(79,142,247,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {item.icon}{item.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.button
                  onClick={handleLogout}
                  title="Log out"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  transition={SPRING}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-red-500/10 hover:border-red-500/20"
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <LogOut size={15} />
                </motion.button>
              </>
            ) : (
              <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }} transition={SPRING}>
                <Link to="/auth" className="btn-primary py-2 px-5 text-sm">Get Started</Link>
              </motion.div>
            )}
          </div>

          {/* Mobile toggle */}
          <motion.button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            transition={SPRING}
            className="md:hidden p-2 rounded-xl transition-all"
            style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)' }}
          >
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X size={20} />
                </motion.div>
              ) : (
                <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
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
            style={{ background: 'rgba(8,11,20,0.98)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
          >
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((link, i) => (
                <motion.div key={link.name} custom={i} variants={mobileItemVariants} initial="hidden" animate="visible">
                  <Link
                    to={link.path}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      color: isActive(link.path) ? 'white' : 'rgba(255,255,255,0.5)',
                      background: isActive(link.path) ? 'rgba(79,142,247,0.1)' : 'transparent',
                    }}
                  >
                    {link.name}
                    {isActive(link.path) && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4F8EF7' }} />}
                  </Link>
                </motion.div>
              ))}

              <div className="pt-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {user ? (
                  <>
                    {[
                      { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard', i: navLinks.length },
                      { to: '/messages',  icon: <MessageSquare size={16} />,   label: 'Messages',  i: navLinks.length + 1 },
                      { to: '/profile',   icon: <UserCircle size={16} />,      label: 'Profile',   i: navLinks.length + 2 },
                    ].map(item => (
                      <motion.div key={item.to} custom={item.i} variants={mobileItemVariants} initial="hidden" animate="visible">
                        <Link to={item.to}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                          style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <span style={{ color: '#4F8EF7' }}>{item.icon}</span>
                          {item.label}
                        </Link>
                      </motion.div>
                    ))}
                    <motion.div custom={navLinks.length + 3} variants={mobileItemVariants} initial="hidden" animate="visible">
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                        style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <LogOut size={16} /> Log Out
                      </button>
                    </motion.div>
                  </>
                ) : (
                  <motion.div custom={navLinks.length} variants={mobileItemVariants} initial="hidden" animate="visible">
                    <Link to="/auth" className="btn-primary w-full text-center py-3 text-sm block">Get Started</Link>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
