import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, DollarSign, ArrowRight } from 'lucide-react';
import { CoachProfile } from '../types';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { SPRING } from '../tokens';
import { GlowingEffect } from '../../components/ui/glowing-effect-card';

interface CoachCardProps {
  coach: CoachProfile;
  key?: string | number;
}

export default function CoachCard({ coach }: CoachCardProps) {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springRotX = useSpring(useTransform(rotX, [-1, 1], [10, -10]), SPRING);
  const springRotY = useSpring(useTransform(rotY, [-1, 1], [-10, 10]), SPRING);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const nx = (e.clientX - rect.left - cx) / cx;
    const ny = (e.clientY - rect.top  - cy) / cy;
    rotX.set(ny);
    rotY.set(nx);
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    rotX.set(0);
    rotY.set(0);
    setIsHovering(false);
  };

  return (
    /* outer: relative + rounded for GlowingEffect, NO overflow-hidden */
    <div
      className="relative rounded-2xl"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1000px' }}
    >
      <GlowingEffect disabled={false} spread={40} borderWidth={2} proximity={64} />

      <motion.div
        className="rounded-2xl overflow-hidden cursor-pointer group relative"
        style={{
          rotateX: prefersReduced ? 0 : springRotX,
          rotateY: prefersReduced ? 0 : springRotY,
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
          willChange: 'transform',
        }}
        whileHover={prefersReduced ? {} : {
          scale: 1.02,
          boxShadow: '0 30px 80px rgba(79,142,247,0.25), 0 0 0 1px rgba(79,142,247,0.15)',
          borderColor: 'rgba(79,142,247,0.25)',
          y: -8,
        }}
        whileTap={{ scale: 0.98 }}
        transition={SPRING}
        onClick={() => navigate(`/coaches/${coach.id}`)}
      >
        {/* Specular highlight tracking mouse */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.12) 0%, transparent 55%)`,
            opacity: isHovering ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />

        {/* Image */}
        <div className="aspect-[4/3] relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {coach.avatar_url ? (
            <img
              src={coach.avatar_url}
              alt={coach.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              style={{ objectPosition: coach.avatar_position || 'center' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl opacity-10 text-white font-bold">
              {coach.name?.charAt(0)}
            </div>
          )}

          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,11,20,0.9) 0%, rgba(8,11,20,0.1) 45%, transparent 65%)' }} />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2 z-10" style={{ transform: 'translateZ(20px)' }}>
            <span className="capitalize text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-all duration-300 group-hover:shadow-[0_0_18px_rgba(79,142,247,0.6)] group-hover:ring-2 group-hover:ring-blue-400/40"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#080B14' }}>
              {coach.specialty}
            </span>
            {coach.secondary_specialty && (
              <span className="capitalize text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-all duration-300 group-hover:shadow-[0_0_18px_rgba(79,142,247,0.5)] group-hover:ring-2 group-hover:ring-blue-400/30"
                style={{ background: 'rgba(255,255,255,0.85)', color: '#080B14' }}>
                {coach.secondary_specialty}
              </span>
            )}
          </div>

          {/* Rating */}
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1.5 rounded-xl"
            style={{ background: 'rgba(8,11,20,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', transform: 'translateZ(30px)' }}>
            <Star size={11} fill="#F59E0B" style={{ color: '#F59E0B' }} />
            <span className="text-xs font-bold text-white">{coach.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6" style={{ transformStyle: 'preserve-3d' }}>
          <h3 className="font-bold text-lg text-white mb-1.5 group-hover:text-blue-300 transition-colors duration-200" style={{ transform: 'translateZ(15px)' }}>{coach.name}</h3>
          {coach.city && coach.state && (
            <div className="flex items-center gap-1 mb-3">
              <MapPin size={11} style={{ color: 'rgba(79,142,247,0.6)' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {coach.city}, {coach.state}
              </span>
            </div>
          )}
          <p className="text-sm leading-relaxed mb-5 whitespace-pre-line"
            style={{ color: 'rgba(255,255,255,0.4)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {coach.bio}
          </p>
          <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ transform: 'translateZ(25px)' }}>
              <span className="text-[10px] uppercase tracking-widest font-bold block mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Starting at</span>
              <div className="flex items-center gap-1">
                <DollarSign size={15} style={{ color: '#4F8EF7' }} />
                <span className="text-xl font-bold text-white">{coach.price_per_session}</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>/ session</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-lg"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
              View Profile
              <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
