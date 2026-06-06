import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ─── Lightweight i18n ───────────────────────────────────────────────────────
// A minimal, dependency-free translation layer. Key surfaces (nav, hero, footer)
// are translated for English / Korean / Spanish; any missing key falls back to
// English, so the rest of the app can be migrated to t() incrementally.

export type Lang = 'en' | 'ko' | 'es';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'ES' },
];

type Dict = Record<string, string>;

const en: Dict = {
  'nav.home': 'Home',
  'nav.coaches': 'Coaches',
  'nav.about': 'About',
  'nav.signin': 'Sign in',
  'nav.getStarted': 'Get started',
  'nav.dashboard': 'Dashboard',
  'nav.messages': 'Messages',
  'nav.profile': 'Profile',
  'hero.title1': 'Find the coach',
  'hero.title2': 'who gets your game',
  'hero.sub': 'Book sessions with elite, vetted specialists in hitting, pitching, fielding, and strength — for exactly the part of your game you want to master.',
  'hero.browse': 'Browse coaches',
  'hero.join': 'Join as a coach',
  'hero.affiliated': 'Coaches affiliated with',
  'footer.platform': 'Platform',
  'footer.specialties': 'Specialties',
  'footer.support': 'Support',
  'footer.blurb': "San Diego's marketplace for specialized baseball instruction — hitting, pitching, fielding, and strength, with vetted coaches.",
};

const ko: Dict = {
  'nav.home': '홈',
  'nav.coaches': '코치',
  'nav.about': '소개',
  'nav.signin': '로그인',
  'nav.getStarted': '시작하기',
  'nav.dashboard': '대시보드',
  'nav.messages': '메시지',
  'nav.profile': '프로필',
  'hero.title1': '내 야구를 이해하는',
  'hero.title2': '코치를 찾으세요',
  'hero.sub': '타격, 투구, 수비, 체력 분야의 검증된 전문 코치와 세션을 예약하고 원하는 부분을 정확히 보완하세요.',
  'hero.browse': '코치 둘러보기',
  'hero.join': '코치로 참여하기',
  'hero.affiliated': '코치 소속 구단·학교',
  'footer.platform': '플랫폼',
  'footer.specialties': '전문 분야',
  'footer.support': '고객 지원',
  'footer.blurb': '샌디에이고의 전문 야구 지도 마켓플레이스 — 검증된 코치와 함께 타격, 투구, 수비, 체력을 배우세요.',
};

const es: Dict = {
  'nav.home': 'Inicio',
  'nav.coaches': 'Entrenadores',
  'nav.about': 'Acerca de',
  'nav.signin': 'Iniciar sesión',
  'nav.getStarted': 'Comenzar',
  'nav.dashboard': 'Panel',
  'nav.messages': 'Mensajes',
  'nav.profile': 'Perfil',
  'hero.title1': 'Encuentra al entrenador',
  'hero.title2': 'que entiende tu juego',
  'hero.sub': 'Reserva sesiones con especialistas de élite y verificados en bateo, pitcheo, defensa y fuerza — para justo la parte de tu juego que quieres dominar.',
  'hero.browse': 'Ver entrenadores',
  'hero.join': 'Únete como entrenador',
  'hero.affiliated': 'Entrenadores afiliados con',
  'footer.platform': 'Plataforma',
  'footer.specialties': 'Especialidades',
  'footer.support': 'Soporte',
  'footer.blurb': 'El marketplace de San Diego para instrucción de béisbol especializada — bateo, pitcheo, defensa y fuerza, con entrenadores verificados.',
};

const DICT: Record<Lang, Dict> = { en, ko, es };

interface I18nValue { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string; }
const I18nCtx = createContext<I18nValue>({ lang: 'en', setLang: () => {}, t: (k) => en[k] ?? k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem('coachgo_lang') as Lang) || 'en'; } catch { return 'en'; }
  });
  useEffect(() => { try { document.documentElement.lang = lang; } catch { /* ignore */ } }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('coachgo_lang', l); } catch { /* ignore */ } };
  const t = (key: string) => DICT[lang][key] ?? en[key] ?? key;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`inline-flex items-center gap-0.5 p-0.5 rounded-full ${className}`}
      style={{ border: '1px solid var(--line-strong)' }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className="px-2.5 py-1 rounded-full text-xs transition-colors"
          style={{
            background: lang === l.code ? 'var(--black)' : 'transparent',
            color: lang === l.code ? 'var(--paper)' : 'var(--ink-soft)',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
