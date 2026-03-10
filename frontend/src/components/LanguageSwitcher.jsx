import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'uk', label: 'Українська' },
  { code: 'pl', label: 'Polski' },
];

function FlagImg({ code, size = 20 }) {
  return (
    <img
      src={`/flags/${code}.png`}
      alt={code}
      style={{ width: size, height: size * 0.65, objectFit: 'cover', borderRadius: 2, display: 'block' }}
    />
  );
}

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = i18n.resolvedLanguage?.split('-')[0] || 'en';

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-colors shrink-0"
      >
        <FlagImg code={currentLang} size={22} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden shadow-xl min-w-[150px]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
              style={{ background: lang.code === currentLang ? 'hsl(var(--muted))' : '' }}
            >
              <FlagImg code={lang.code} size={20} />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
