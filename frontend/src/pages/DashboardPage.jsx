import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, User, Settings, Wifi, WifiOff, Search, X } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useSocketStore } from '../store/socket.store';
import client from '../api/client';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { cn } from '../lib/utils';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const connected = useSocketStore((s) => s.connected);
  const socket = useSocketStore((s) => s.socket);
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'common']);
  const [inQueue, setInQueue] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('matchmaking:queued', () => setInQueue(true));
    socket.on('matchmaking:left', () => setInQueue(false));
    socket.on('matchmaking:matched', ({ matchId, symbol }) => {
      setInQueue(false);
      sessionStorage.setItem(`match:${matchId}:symbol`, symbol);
      navigate(`/game/${matchId}`);
    });

    return () => {
      socket.off('matchmaking:queued');
      socket.off('matchmaking:left');
      socket.off('matchmaking:matched');
    };
  }, [socket]);

  const handleFindGame = () => {
    if (!socket) return;
    if (inQueue) {
      socket.emit('matchmaking:leave');
    } else {
      socket.emit('matchmaking:join');
    }
  };

  const handleLogout = async () => {
    await client.post('/auth/logout');
    clear();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t('auth:dashboard.title')}</h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              {t('auth:dashboard.welcome', { username: user?.username })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/profile" className="p-2 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-colors">
              <Settings size={20} />
            </Link>
            <Link to={`/u/${user?.username}`} className="p-2 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-colors">
              <User size={20} />
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--muted))] rounded-lg text-sm hover:bg-[hsl(var(--border))] transition-colors">
              <LogOut size={16} /> {t('common:nav.logout')}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 text-sm">
          {connected
            ? <><Wifi size={16} className="text-green-400" /><span className="text-green-400">Connected</span></>
            : <><WifiOff size={16} className="text-red-400" /><span className="text-red-400">Disconnected</span></>
          }
        </div>

        <div className="bg-[hsl(var(--card))] rounded-xl p-8 border border-[hsl(var(--border))] flex flex-col items-center gap-6">
          <h2 className="text-xl font-semibold">Classic 3×3</h2>

          <button
            onClick={handleFindGame}
            disabled={!connected}
            className={cn(
              'flex items-center gap-2 px-8 py-3 rounded-xl font-medium text-lg transition-all',
              inQueue
                ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30'
                : 'bg-[hsl(var(--primary))] text-white hover:opacity-90',
              !connected && 'opacity-50 cursor-not-allowed'
            )}
          >
            {inQueue ? <><X size={20} /> Cancel</> : <><Search size={20} /> Find Game</>}
          </button>

          {inQueue && (
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] text-sm">
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
              Searching for opponent...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
