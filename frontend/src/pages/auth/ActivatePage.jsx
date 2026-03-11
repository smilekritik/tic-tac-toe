import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function ActivatePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    client.get(`/auth/activate/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="page" style={{ textAlign: 'center' }}>
      <h1>Email Verification</h1>

      {status === 'loading' && <p>Verifying...</p>}

      {status === 'success' && (
        <>
          <p className="success">Email verified! You can now play.</p>
          <div className="links" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button onClick={() => navigate('/auth/login')}>Go to login</button>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="error">Invalid or expired link.</p>
          <div className="links" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button onClick={() => navigate('/auth/login')}>Go to login</button>
          </div>
        </>
      )}
    </div>
  );
}
