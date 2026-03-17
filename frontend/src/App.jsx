import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSocket } from './hooks/useSocket';
import ProtectedRoute from './router/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ActivatePage from './pages/auth/ActivatePage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import GamePage from './pages/GamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import MatchDetailsPage from './pages/MatchDetailsPage';
import Footer from './components/Footer';

function SocketInitializer() {
  useSocket();
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <SocketInitializer />
      <div className="app-shell">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route
              path="/auth/forgot-password"
              element={<ForgotPasswordPage />}
            />
            <Route
              path="/auth/reset-password"
              element={<ResetPasswordPage />}
            />
            <Route path="/auth/activate/:token" element={<ActivatePage />} />
            <Route path="/u/:username" element={<PublicProfilePage />} />
            <Route path="/matches/:matchId" element={<MatchDetailsPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/profile" element={<Navigate to="/settings" replace />} />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game/:matchId"
              element={
                <ProtectedRoute>
                  <GamePage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
