import { motion } from 'framer-motion';
import { Shield, Users, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { SPRING } from '../tokens';
import { GlowingEffect } from '../../components/ui/glowing-effect-card';
import { ShimmerButton } from '../../components/ui/shimmer-button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';

const VALUES = [
  {
    title: 'Quality First',
    icon: <Shield size={28} />,
    desc: 'Every coach on CoachGo is vetted and proven.',
    detail: 'We only accept coaches with real playing experience and a track record of developing players at all levels.',
    accentColor: '#1B1813',
    glowColor: 'rgba(27,24,19,0.25)',
  },
  {
    title: 'Accessibility',
    icon: <Users size={28} />,
    desc: 'Elite coaching for every player, not just elite budgets.',
    detail: 'We connect players of all backgrounds with top-tier instruction at fair, transparent prices.',
    accentColor: '#8A7BA8',
    glowColor: 'rgba(27,24,19,0.25)',
  },
  {
    title: 'Specialization',
    icon: <Trophy size={28} />,
    desc: 'General coaching only gets you so far.',
    detail: "Our marketplace is built around specialists — coaches who've mastered one discipline and teach it best.",
    accentColor: '#5E8C5A',
    glowColor: 'rgba(94,140,90,0.25)',
  },
];

export default function AboutPage() {
  return (
    <PageTransition>
      <div className="min-h-screen" style={{ background: '#F6F4EF' }}>

        {/* Hero */}
        <section className="py-32 px-4" style={{ borderBottom: '1px solid rgba(27,24,19,0.06)' }}>
          <div className="max-w-[720px] mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <span className="tag-badge">Our Story</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-6xl md:text-7xl text-ink leading-none mb-16"
            >
              WHY WE<br />
              <span style={{ WebkitTextStroke: '1px rgba(27,24,19,0.45)', color: 'transparent' }}>BUILT THIS</span>
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg leading-[1.9] space-y-8 text-left"
            >
              <p style={{ color: 'rgba(27,24,19,0.55)' }}>
                Growing up playing baseball,{' '}
                <span className="text-ink font-semibold">finding a great coach felt impossible.</span>{' '}
                Not because great coaches don't exist — they do. But because there was never a good way to find them.
                You'd hear about someone through a teammate, try them for a season, and then start the search all over again.
                Coach hopping became the norm.
              </p>
              <p style={{ color: 'rgba(27,24,19,0.55)' }}>
                It's not just a personal problem —{' '}
                <span className="text-ink font-semibold">it's a universal baseball problem.</span>{' '}
                Every serious player at some point realizes their team coach can't do it all. You need a hitting specialist
                for your swing, a pitching coach for your mechanics, someone who lives and breathes the exact thing you're
                trying to fix. But finding that person? You're on your own — Googling blind, getting outdated websites,
                and never knowing who's actually worth your time.
              </p>
              <p style={{ color: 'rgba(27,24,19,0.55)' }}>
                <span className="text-ink font-semibold">CoachGo is the platform that should have always existed.</span>{' '}
                One place where every coach is a specialist, every profile is transparent, and every player —
                no matter where they are in their development — can find exactly the coach they need and book with confidence.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Values */}
        <section className="py-32" style={{ background: 'rgba(27,24,19,0.01)', borderBottom: '1px solid rgba(27,24,19,0.06)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ ...SPRING }}
              className="text-center mb-20"
            >
              <p className="tag-badge mb-6 inline-block">What We Stand For</p>
              <h2 className="font-display text-5xl md:text-6xl text-ink leading-none">
                OUR<br />
                <span style={{ WebkitTextStroke: '1px rgba(27,24,19,0.45)', color: 'transparent' }}>VALUES</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {VALUES.map((value, i) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ ...SPRING, delay: i * 0.12 }}
                  className="relative rounded-3xl"
                >
                  <GlowingEffect disabled={false} spread={50} borderWidth={2} proximity={80} />
                  <motion.div
                    className="rounded-3xl p-8 relative overflow-hidden"
                    style={{ background: 'rgba(27,24,19,0.03)', border: '1px solid rgba(27,24,19,0.06)' }}
                    whileHover={{ y: -6, boxShadow: `0 24px 60px ${value.glowColor}` }}
                    transition={SPRING}
                  >
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{
                      background: `radial-gradient(ellipse at 30% 30%, ${value.glowColor.replace('0.25', '0.06')} 0%, transparent 60%)`
                    }} />
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 relative"
                      style={{ background: `${value.glowColor.replace('0.25', '0.12')}`, color: value.accentColor }}>
                      {value.icon}
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-2">{value.title}</h3>
                    <p className="font-medium mb-3" style={{ color: 'rgba(27,24,19,0.7)' }}>{value.desc}</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(27,24,19,0.4)' }}>{value.detail}</p>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Founder */}
        <section className="py-32 px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ ...SPRING }}
              className="flex flex-col md:flex-row items-center gap-16"
            >
              {/* Premium Founder Avatar */}
              <div className="shrink-0 relative">
                {/* Outer rotating glow ring */}
                <motion.div
                  className="absolute -inset-[3px] rounded-3xl"
                  style={{
                    background: '#16130E',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                />
                <Avatar className="w-48 h-48 md:w-[200px] md:h-[200px] rounded-3xl relative" style={{ zIndex: 1 }}>
                  <AvatarImage
                    src="/yuvi.jpg"
                    alt="Yuvraj Jindal"
                    className="rounded-3xl object-cover w-full h-full"
                    style={{ objectPosition: 'center 15%' }}
                  />
                  <AvatarFallback
                    className="rounded-3xl text-5xl font-display font-bold text-ink"
                    style={{
                      background: '#16130E',
                      boxShadow: '0 0 40px rgba(27,24,19,0.4), inset 0 1px 0 rgba(27,24,19,0.2)',
                    }}
                  >
                    YJ
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Content */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#1B1813' }}>Meet the Founder</p>
                <h2 className="font-display text-4xl text-ink mb-1">Yuvraj Jindal</h2>
                <p className="text-sm font-medium mb-8 uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.3)' }}>
                  Founder · Del Norte HS Varsity Baseball
                </p>

                <div className="space-y-5 text-base leading-relaxed">
                  <p style={{ color: 'rgba(27,24,19,0.55)', fontSize: '1.15rem', lineHeight: '1.8' }}>
                    <span className="text-ink font-semibold">"I've been on the field since I was 7 years old.</span>{' '}
                    From travel ball to my current role as a Varsity player at Del Norte High School, baseball has been
                    the constant in my life. But through every season and every tournament, one problem followed me:
                    finding a great coach was harder than it should be."
                  </p>
                  <p style={{ color: 'rgba(27,24,19,0.55)', fontSize: '1.15rem', lineHeight: '1.8' }}>
                    "I didn't just need a general instructor — I needed a specialist. Someone whose entire focus was
                    the exact part of the game I was trying to master.{' '}
                    <span className="text-ink font-semibold">I spent years hopping from coach to coach,
                    never having one place to search, compare, and commit.</span>"
                  </p>
                  <p style={{ color: 'rgba(27,24,19,0.55)', fontSize: '1.15rem', lineHeight: '1.8' }}>
                    "<span className="text-ink font-semibold">I got tired of waiting for someone else to fix it.</span>{' '}
                    So I decided to step up and build it myself. CoachGo is for every player who's been in that
                    same situation — and deserves better."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20" style={{ background: 'rgba(27,24,19,0.04)', borderTop: '1px solid rgba(27,24,19,0.06)', borderBottom: '1px solid rgba(27,24,19,0.06)' }}>
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-3 gap-8 text-center">
              {[
                { value: '8+', label: 'Elite Coaches' },
                { value: '4',  label: 'Specialties' },
                { value: '100%', label: 'Vetted' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ ...SPRING, delay: i * 0.1 }}
                >
                  <p className="font-display text-5xl text-ink mb-2">{stat.value}</p>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(27,24,19,0.3)' }}>{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 text-center">
          <div className="max-w-3xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ ...SPRING }}
            >
              <h2 className="font-display text-5xl text-ink mb-8 gradient-headline">READY TO FIND YOUR EDGE?</h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                  <ShimmerButton
                    shimmerColor="#1B1813"
                    shimmerDuration="2.5s"
                    borderRadius="12px"
                    background="#16130E"
                    className="px-10 py-4 font-bold text-base"
                    onClick={() => window.location.href = '/coaches'}
                  >
                    Find a Coach
                  </ShimmerButton>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING}>
                  <Link to="/auth" className="btn-secondary px-10 py-4">Join as a Coach</Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

      </div>
    </PageTransition>
  );
}
