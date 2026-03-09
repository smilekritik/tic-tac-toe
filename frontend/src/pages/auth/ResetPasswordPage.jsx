import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await client.post('/auth/reset-password', { token: searchParams.get('token'), password });
      navigate('/auth/login');
    } catch {
      setMessage('Invalid or expired token');
    }
  };

  return (
    <div>
      <h1>Reset Password</h1>
      <form onSubmit={handleSubmit}>
        <input type="password" placeholder="New password" value={password}
          onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Reset</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
