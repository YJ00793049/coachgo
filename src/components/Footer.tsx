import { Link } from 'react-router-dom';
import { useI18n, LanguageSwitcher } from '../i18n';

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
  </svg>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useI18n();

  const columns = [
    {
      title: t('footer.platform'),
      links: [
        { label: 'Find a Coach', to: '/coaches' },
        { label: 'About Us', to: '/about' },
        { label: 'Join as a Coach', to: '/auth' },
        { label: 'Dashboard', to: '/dashboard' },
      ],
    },
    {
      title: t('footer.specialties'),
      links: [
        { label: 'Hitting', to: '/coaches?specialty=hitting' },
        { label: 'Pitching', to: '/coaches?specialty=pitching' },
        { label: 'Fielding', to: '/coaches?specialty=fielding' },
        { label: 'Strength & Conditioning', to: '/coaches?specialty=strength' },
      ],
    },
    {
      title: t('footer.support'),
      links: [
        { label: 'Help Center', to: '/help' },
        { label: 'Contact Us', to: '/contact' },
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Terms of Service', to: '/terms' },
      ],
    },
  ];

  return (
    <footer className="relative" style={{ background: 'var(--paper-warm)', borderTop: '1px solid var(--line)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-12">

          {/* Brand */}
          <div className="col-span-2 space-y-5">
            <span className="font-display tracking-tight" style={{ color: 'var(--ink)', fontSize: '1.7rem' }}>
              CoachGo
            </span>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--ink-soft)' }}>
              {t('footer.blurb')}
            </p>
            <p className="text-xs tracking-wide" style={{ color: 'var(--ink-faint)' }}>
              San Diego, California
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://instagram.com/coachgonline"
                target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(27,24,19,0.05)]"
                style={{ border: '1px solid var(--line-strong)', color: 'var(--ink-soft)' }}
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://x.com/coachgonline"
                target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(27,24,19,0.05)]"
                style={{ border: '1px solid var(--line-strong)', color: 'var(--ink-soft)' }}
                aria-label="X / Twitter"
              >
                <XIcon />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs uppercase tracking-[0.14em] mb-5" style={{ color: 'var(--ink-faint)' }}>
                {col.title}
              </h4>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="transition-colors hover:text-[var(--ink)]"
                      style={{ color: 'var(--ink-soft)' }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Understated legal paragraph */}
        <p className="mt-16 text-xs leading-relaxed max-w-3xl" style={{ color: 'var(--ink-faint)' }}>
          CoachGo helps players discover and connect with independent baseball instructors. CoachGo does not employ
          coaches and does not handle scheduling or payments — those are arranged directly between players and coaches.
          Coach credentials and statements are self-reported.
        </p>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>
            © {currentYear} CoachGo. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-xs transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-faint)' }}>
              Privacy
            </Link>
            <Link to="/terms" className="text-xs transition-colors hover:text-[var(--ink)]" style={{ color: 'var(--ink-faint)' }}>
              Terms
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
