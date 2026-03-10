import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../../api/client';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { t } = useTranslation(['auth', 'errors']);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/auth/registration', form);
      setSuccess(t('auth:register.success'));
    } catch (err) {
      const code = err.response?.data?.error?.code;
      setError(code ? t(`errors:${code}`) : t('errors:REGISTRATION_FAILED'));
    }
  };

  return (
    <div className="page">
      <LanguageSwitcher />
      <h1>{t('auth:register.title')}</h1>
      <form onSubmit={handleSubmit}>
        <input
          placeholder={t('auth:register.placeholder.email')}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder={t('auth:register.placeholder.username')}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="password"
          placeholder={t('auth:register.placeholder.password')}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <button type="submit">{t('auth:register.submit')}</button>
      </form>
      <div className="links">
        <Link to="/auth/login">{t('auth:register.links.login')}</Link>
      </div>
    </div>
  );
}
