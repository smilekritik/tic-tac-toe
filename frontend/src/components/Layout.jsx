import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, Trophy, User } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useSocketStore } from '../store/socket.store';
import client from '../api/client';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export default function Layout({ children }) {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const connected = useSocketStore((s) => s.connected);
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const handleLogout = async () => {
    await client.post('/auth/logout');
    clear();
    navigate('/auth/login');
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <div style={{ maxWidth: 'min(512px, 90vw)', margin: '0 auto', padding: '0 16px', height: 'min(56px, 7vh)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link to="/dashboard" style={{ fontWeight: 700, fontSize: 'min(18px, 2.5vh)', flexShrink: 0 }}>
            Tic-Tac-Toe
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#4ade80' : '#ef4444', flexShrink: 0 }} />
            <LanguageSwitcher />
            {user && (
              <Link to="/leaderboard" className="w-9 h-9 flex items-center justify-center rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-colors shrink-0" title={t('nav.leaderboard')}>
                <Trophy size={18} />
              </Link>
            )}
            <Link to="/profile" className="w-9 h-9 flex items-center justify-center rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-colors shrink-0" title={t('nav.profile')}>
              <Settings size={18} />
            </Link>
            {user && (
              <Link to={`/u/${user.username}`} className="w-9 h-9 flex items-center justify-center rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-colors shrink-0" title={user.username}>
                <User size={18} />
              </Link>
            )}
            <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-colors shrink-0" title={t('nav.logout')}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: 'min(512px, 90vw)', margin: '0 auto', padding: 'min(32px, 4vh) 16px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
