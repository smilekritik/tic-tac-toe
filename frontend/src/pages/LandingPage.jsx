import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function LandingPage() {
  const { t } = useTranslation('auth');

  return (
    <div className="page">
      <LanguageSwitcher />
      <h1>{t('landing.title')}</h1>
      <p>{t('landing.description')}</p>
      <div className="links">
        <Link to="/auth/login">{t('login.submit')}</Link>
        <Link to="/auth/register">{t('register.submit')}</Link>
      </div>
    </div>
  );
}
