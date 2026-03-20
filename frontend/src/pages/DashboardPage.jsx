import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Wifi } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useSocketStore } from '../store/socket.store';
import Layout from '../components/Layout';
import client from '../api/client';

const GAME_MODES = [
  {
    code: 'classic',
    titleKey: 'auth:dashboard.modes.classic.title',
    descriptionKey: 'auth:dashboard.modes.classic.description',
  },
  {
    code: 'moving-window',
    titleKey: 'auth:dashboard.modes.movingWindow.title',
    descriptionKey: 'auth:dashboard.modes.movingWindow.description',
  },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const connected = useSocketStore((s) => s.connected);
  const socket = useSocketStore((s) => s.socket);
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [inQueue, setInQueue] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [matchmakingDisabled, setMatchmakingDisabled] = useState(false);
  const [matchmakingError, setMatchmakingError] = useState(null);
  const [selectedModeCode, setSelectedModeCode] = useState(() => localStorage.getItem('selectedGameMode') || 'classic');

  // Check for active match on mount
  useEffect(() => {
    client.get('/game/active').then(({ data }) => {
      if (data.matchId) setActiveMatchId(data.matchId);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMatchmakingError = ({ code }) => {
      const message = t(`errors:${code || 'SOMETHING_WRONG'}`, {
        defaultValue: code || t('errors:SOMETHING_WRONG'),
      });

      if (code === 'EMAIL_NOT_VERIFIED' || code === 'GAME_BANNED') {
        setMatchmakingDisabled(true);
      }

      if (code === 'ACTIVE_MATCH_EXISTS' || code === 'RECONNECT_WINDOW_ACTIVE') {
        client.get('/game/active').then(({ data }) => {
          if (data.matchId) setActiveMatchId(data.matchId);
        }).catch(() => {});
      }

      setInQueue(false);
      setMatchmakingError(message);
    };

    socket.on('matchmaking:queued', () => setInQueue(true));
    socket.on('matchmaking:left', () => setInQueue(false));
    socket.on('matchmaking:matched', ({ matchId, symbol }) => {
      setInQueue(false);
      setMatchmakingError(null);
      sessionStorage.setItem(`match:${matchId}:symbol`, symbol);
      navigate(`/game/${matchId}`);
    });
    socket.on('matchmaking:error', handleMatchmakingError);

    return () => {
      socket.off('matchmaking:queued');
      socket.off('matchmaking:left');
      socket.off('matchmaking:matched');
      socket.off('matchmaking:error', handleMatchmakingError);
    };
  }, [socket, navigate, t]);

  const handleFindGame = () => {
    if (!socket) return;
    socket.emit(inQueue ? 'matchmaking:leave' : 'matchmaking:join', { modeCode: selectedModeCode });
  };

  const handleReconnect = () => {
    navigate(`/game/${activeMatchId}`);
  };

  const handleModeSelect = (modeCode) => {
    if (inQueue || activeMatchId) return;
    setSelectedModeCode(modeCode);
    localStorage.setItem('selectedGameMode', modeCode);
    setMatchmakingError(null);
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'min(24px, 3vh)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'min(30px, 4vh)', fontWeight: 700 }}>{t('auth:dashboard.title')}</h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: 4, fontSize: 'min(16px, 2vh)' }}>
            {t('auth:dashboard.welcome', { username: user?.username })}
          </p>
        </div>

        <div style={{
          width: '100%',
          background: 'hsl(var(--card))',
          borderRadius: 16,
          padding: 'min(32px, 4vh) min(32px, 4vw)',
          border: '1px solid hsl(var(--border))',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'min(24px, 3vh)',
        }}>
          <div style={{ width: '100%', display: 'grid', gap: 12 }}>
            {GAME_MODES.map((mode) => {
              const isSelected = selectedModeCode === mode.code;

              return (
                <button
                  key={mode.code}
                  type="button"
                  onClick={() => handleModeSelect(mode.code)}
                  disabled={inQueue || !!activeMatchId}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: isSelected ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                    background: isSelected ? 'rgba(129, 140, 248, 0.16)' : 'hsl(var(--muted))',
                    color: 'hsl(var(--foreground))',
                    opacity: inQueue || activeMatchId ? 0.75 : 1,
                    cursor: inQueue || activeMatchId ? 'default' : 'pointer',
                  }}
                >
                  <div style={{ fontSize: 'min(18px, 2.2vh)', fontWeight: 700 }}>
                    {t(mode.titleKey)}
                  </div>
                  <div style={{ marginTop: 6, color: 'hsl(var(--muted-foreground))', fontSize: 'min(14px, 1.8vh)' }}>
                    {t(mode.descriptionKey)}
                  </div>
                </button>
              );
            })}
          </div>

          {activeMatchId ? (
            <button
              onClick={handleReconnect}
              style={{
                width: '100%',
                height: 'min(48px, 6vh)',
                borderRadius: 12,
                fontWeight: 500,
                fontSize: 'min(16px, 2vh)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                border: '1px solid #ef4444',
                cursor: 'pointer',
                animation: 'pulse 2s infinite',
              }}
            >
              <Wifi size={18} /> {t('auth:dashboard.reconnect')}
            </button>
          ) : (
            <button
              onClick={handleFindGame}
              disabled={!connected || matchmakingDisabled}
              style={{
                width: '100%',
                height: 'min(48px, 6vh)',
                borderRadius: 12,
                fontWeight: 500,
                fontSize: 'min(16px, 2vh)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: inQueue ? 'rgba(239,68,68,0.2)' : 'hsl(var(--primary))',
                color: inQueue ? '#f87171' : 'white',
                border: inQueue ? '1px solid #ef4444' : 'none',
                opacity: (!connected || matchmakingDisabled) ? 0.5 : 1,
                cursor: (!connected || matchmakingDisabled) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
              }}
            >
              {inQueue
                ? <><X size={18} /> {t('auth:dashboard.actions.cancel')}</>
                : <><Search size={18} /> {t('auth:dashboard.actions.findGame')}</>}
            </button>
          )}

          {matchmakingError && (
            <p style={{ marginTop: 8, color: '#f87171', fontSize: 'min(14px, 1.8vh)', textAlign: 'center' }}>
              {matchmakingError}
            </p>
          )}

          {inQueue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'hsl(var(--muted-foreground))', fontSize: 'min(14px, 1.8vh)' }}>
              <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(var(--primary))' }} />
              {t('auth:dashboard.searching', { mode: t(GAME_MODES.find((mode) => mode.code === selectedModeCode)?.titleKey || 'auth:dashboard.modes.classic.title') })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
