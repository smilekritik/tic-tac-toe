import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import client from '../api/client';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await client.post('/auth/logout');
    clear();
    navigate('/auth/login');
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.username}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
