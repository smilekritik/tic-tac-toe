import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function ProtectedRoute({ children }) {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const user = useAuthStore((s) => s.user);

  if (!isInitialized) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/auth/login" replace />;
  return children;
}
