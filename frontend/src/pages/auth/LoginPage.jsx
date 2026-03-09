import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import { useAuthStore } from '../../store/auth.store';

export default function LoginPage() {
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await client.post('/auth/login', form);
      setAuth(data.accessToken, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <div className="page">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="Email or username" value={form.login}
          onChange={(e) => setForm({ ...form, login: e.target.value })} />
        <input type="password" placeholder="Password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error">{error}</p>}
        <button type="submit">Login</button>
      </form>
      <div className="links">
        <Link to="/auth/register">Register</Link>
        <Link to="/auth/forgot-password">Forgot password?</Link>
      </div>
    </div>
  );
}
