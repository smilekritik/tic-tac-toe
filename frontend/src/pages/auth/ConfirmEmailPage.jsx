import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../../api/client';

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'errors']);
  const [status, setStatus] = useState('loading');
  const [errorCode, setErrorCode] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorCode('TOKEN_INVALID');
      return;
    }

    client.get(`/me/email/confirm/${encodeURIComponent(token)}`)
      .then(() => {
        setStatus('success');
      })
      .catch((error) => {
        setStatus('error');
        setErrorCode(error.response?.data?.error?.code || 'SOMETHING_WRONG');
      });
  }, [searchParams]);

  return (
    <div className="page" style={{ textAlign: 'center' }}>
      <h1>{t('auth:confirmEmail.title')}</h1>

      {status === 'loading' && <p>{t('auth:confirmEmail.verifying')}</p>}

      {status === 'success' && (
        <>
          <p className="success">{t('auth:confirmEmail.success')}</p>
          <div className="links" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button onClick={() => navigate('/auth/login')}>{t('auth:confirmEmail.links.login')}</button>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="error">{t(`errors:${errorCode || 'SOMETHING_WRONG'}`)}</p>
          <div className="links" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button onClick={() => navigate('/auth/login')}>{t('auth:confirmEmail.links.login')}</button>
          </div>
        </>
      )}
    </div>
  );
}
