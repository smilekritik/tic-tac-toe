import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function GuestRoute({ children }) {
  const user = useAuthStore((s) => s.user);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
