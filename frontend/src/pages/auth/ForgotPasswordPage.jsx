import { useState } from 'react';
import client from '../../api/client';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await client.post('/auth/forgot-password', { email });
      setMessage(data.message);
    } catch {
      setMessage('Something went wrong');
    }
  };

  return (
    <div>
      <h1>Forgot Password</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">Send reset link</button>
      </form>
      {message && <p>{message}</p>}
      <Link to="/auth/login">Back to login</Link>
    </div>
  );
}
