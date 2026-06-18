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
  'hero.sub': 'Discover elite, vetted specialists in hitting, pitching, fielding, and strength — connect with the right one and they reach out directly to plan your training.',
  'hero.browse': 'Discover coaches',
  'hero.join': 'Join as a coach',
  'hero.affiliated': 'Coaches affiliated with',
  'footer.platform': 'Platform',
  'footer.specialties': 'Specialties',
  'footer.support': 'Support',
  'footer.blurb': 'Your personal LinkedIn for baseball coaching — discover vetted San Diego specialists in hitting, pitching, fielding, and strength, then connect directly.',
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
  'hero.sub': '타격, 투구, 수비, 체력 분야의 검증된 전문 코치를 찾아 연결하면, 코치가 직접 연락해 훈련 계획을 함께 세웁니다.',
  'hero.browse': '코치 둘러보기',
  'hero.join': '코치로 참여하기',
  'hero.affiliated': '코치 소속 구단·학교',
  'footer.platform': '플랫폼',
  'footer.specialties': '전문 분야',
  'footer.support': '고객 지원',
  'footer.blurb': '야구 코칭을 위한 나만의 링크드인 — 검증된 샌디에이고 전문 코치를 찾아 바로 연결하세요.',
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
  'hero.sub': 'Descubre especialistas de élite y verificados en bateo, pitcheo, defensa y fuerza — conecta con el indicado y te contactará directamente para planear tu entrenamiento.',
  'hero.browse': 'Descubrir entrenadores',
  'hero.join': 'Únete como entrenador',
  'hero.affiliated': 'Entrenadores afiliados con',
  'footer.platform': 'Plataforma',
  'footer.specialties': 'Especialidades',
  'footer.support': 'Soporte',
  'footer.blurb': 'Tu LinkedIn personal para el coaching de béisbol — descubre especialistas verificados de San Diego y conecta directamente.',
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
