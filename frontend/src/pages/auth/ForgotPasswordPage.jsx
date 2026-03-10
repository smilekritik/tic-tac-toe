import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../../api/client';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const { t } = useTranslation(['auth', 'errors']);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await client.post('/auth/forgot-password', { email });
      setMessage(data.message);
    } catch {
      setMessage(t('errors:SOMETHING_WRONG'));
    }
  };

  return (
    <div className="page">
      <LanguageSwitcher />
      <h1>{t('auth:forgot.title')}</h1>
      <form onSubmit={handleSubmit}>
        <input
          placeholder={t('auth:forgot.placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">{t('auth:forgot.submit')}</button>
      </form>
      {message && <p className="success">{message}</p>}
      <div className="links">
        <Link to="/auth/login">{t('auth:forgot.links.back')}</Link>
      </div>
    </div>
  );
}
