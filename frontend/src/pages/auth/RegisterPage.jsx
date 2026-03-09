import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/auth/registration', form);
      setSuccess('Registered! Check your email to verify your account.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    }
  };

  return (
    <div className="page">
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Username" value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input type="password" placeholder="Password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <button type="submit">Register</button>
      </form>
      <div className="links">
        <Link to="/auth/login">Login</Link>
      </div>
    </div>
  );
}
