import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client';

export default function ActivatePage() {
  const { token } = useParams();
  const [message, setMessage] = useState('Verifying...');

  useEffect(() => {
    client.get(`/auth/activate/${token}`)
      .then(() => setMessage('Email verified! You can now log in.'))
      .catch(() => setMessage('Invalid or expired link.'));
  }, [token]);

  return (
    <div>
      <h1>Email Verification</h1>
      <p>{message}</p>
      <Link to="/auth/login">Go to login</Link>
    </div>
  );
}
