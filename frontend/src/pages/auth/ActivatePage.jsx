import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function ActivatePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    client.get(`/auth/activate/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="page" style={{ textAlign: 'center' }}>
      <h1>{t('activate.title')}</h1>

      {status === 'loading' && <p>{t('activate.verifying')}</p>}

      {status === 'success' && (
        <>
          <p className="success">{t('activate.success')}</p>
          <div className="links" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button onClick={() => navigate('/auth/login')}>{t('activate.links.login')}</button>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="error">{t('activate.error')}</p>
          <div className="links" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button onClick={() => navigate('/auth/login')}>{t('activate.links.login')}</button>
          </div>
        </>
      )}
    </div>
  );
}
