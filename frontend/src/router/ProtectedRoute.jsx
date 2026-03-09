import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/auth/login" replace />;
  return children;
}
