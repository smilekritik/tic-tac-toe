import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');

  return (
    <div className="lang-switcher">
      {['en', 'uk', 'pl'].map((lng) => (
        <button
          key={lng}
          className={`lang-btn ${i18n.resolvedLanguage === lng ? 'active' : ''}`}
          onClick={() => i18n.changeLanguage(lng)}
        >
          {t(`language.${lng}`)}
        </button>
      ))}
    </div>
  );
}
