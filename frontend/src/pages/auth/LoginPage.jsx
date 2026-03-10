import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function LoginPage() {
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'errors']);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await client.post('/auth/login', form);
      setAuth(data.accessToken, data.user);
      navigate('/dashboard');
    } catch (err) {
      const code = err.response?.data?.error?.code;
      setError(code ? t(`errors:${code}`) : t('errors:LOGIN_FAILED'));
    }
  };

  return (
    <div className="page">
      <LanguageSwitcher />
      <h1>{t('auth:login.title')}</h1>
      <form onSubmit={handleSubmit}>
        <input
          placeholder={t('auth:login.placeholder.login')}
          value={form.login}
          onChange={(e) => setForm({ ...form, login: e.target.value })}
        />
        <input
          type="password"
          placeholder={t('auth:login.placeholder.password')}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">{t('auth:login.submit')}</button>
      </form>
      <div className="links">
        <Link to="/auth/register">{t('auth:login.links.register')}</Link>
        <Link to="/auth/forgot-password">{t('auth:login.links.forgot')}</Link>
      </div>
    </div>
  );
}
