import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'errors']);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.post('/auth/reset-password', {
        token: searchParams.get('token'),
        password,
      });
      navigate('/auth/login');
    } catch {
      setMessage(t('errors:TOKEN_INVALID'));
    }
  };

  return (
    <div className="page">
      <h1>{t('auth:reset.title')}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder={t('auth:reset.placeholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">{t('auth:reset.submit')}</button>
      </form>
      {message && <p className="error">{message}</p>}
    </div>
  );
}
