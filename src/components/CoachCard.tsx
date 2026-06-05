import { useNavigate } from 'react-router-dom';
import { Star, MapPin, ArrowRight } from 'lucide-react';
import { CoachProfile } from '../types';
import { motion, useReducedMotion } from 'framer-motion';
import { SPRING, specialtyColor } from '../tokens';

interface CoachCardProps {
  coach: CoachProfile;
  key?: string | number;
}

export default function CoachCard({ coach }: CoachCardProps) {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const accent = specialtyColor[coach.specialty] || 'var(--sage)';

  return (
    <motion.div
      className="cg-card group cursor-pointer overflow-hidden flex flex-col h-full"
      whileHover={prefersReduced ? {} : { y: -6 }}
      whileTap={{ scale: 0.99 }}
      transition={SPRING}
      onClick={() => navigate(`/coaches/${coach.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/coaches/${coach.id}`); }}
    >
      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden m-2 rounded-[18px]" style={{ background: 'var(--paper-warm)' }}>
        {coach.avatar_url ? (
          <img
            src={coach.avatar_url}
            alt={coach.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            style={{ objectPosition: coach.avatar_position || 'center' }}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-7xl" style={{ color: 'var(--ink-faint)' }}>
            {coach.name?.charAt(0)}
          </div>
        )}

        {/* Specialty pills */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span
            className="capitalize text-[11px] px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(251,250,246,0.92)', color: 'var(--ink)', border: `1px solid ${accent}` }}
          >
            {coach.specialty}
          </span>
          {coach.secondary_specialty && (
            <span className="capitalize text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(251,250,246,0.85)', color: 'var(--ink-soft)' }}>
              {coach.secondary_specialty}
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(251,250,246,0.92)' }}>
          <Star size={11} fill="var(--c-reschedule)" style={{ color: 'var(--c-reschedule)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{coach.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5 pt-2 flex flex-col flex-1">
        <h3 className="font-display text-2xl leading-tight mb-1" style={{ color: 'var(--ink)' }}>{coach.name}</h3>
        {coach.city && coach.state && (
          <div className="flex items-center gap-1 mb-3">
            <MapPin size={12} style={{ color: 'var(--ink-faint)' }} />
            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>{coach.city}, {coach.state}</span>
          </div>
        )}
        <p
          className="text-sm leading-relaxed mb-5 whitespace-pre-line flex-1"
          style={{ color: 'var(--ink-soft)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {coach.bio}
        </p>
        <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--line)' }}>
          <div>
            <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--ink-faint)' }}>Starting at</span>
            <span className="font-display text-2xl" style={{ color: 'var(--ink)' }}>${coach.price_per_session}</span>
            <span className="text-xs ml-1" style={{ color: 'var(--ink-faint)' }}>/ session</span>
          </div>
          <span
            className="rotating-border flex items-center justify-center text-sm px-3.5 py-2 rounded-full"
            style={{ position: 'relative', overflow: 'hidden', background: 'var(--black)', color: 'var(--paper)' }}
          >
            <span className="relative z-[1] inline-flex items-center gap-1.5">
              View profile
              <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}
