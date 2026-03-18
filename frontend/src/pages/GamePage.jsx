import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Board from '../components/game/Board';
import OIcon from '../components/game/OIcon';
import XIcon from '../components/game/XIcon';
import Avatar from '../components/Avatar';
import client from '../api/client';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/auth.store';
import { useSocketStore } from '../store/socket.store';

function getRemainingSeconds(turnDeadlineAt) {
  if (!turnDeadlineAt) return 30;
  const remainingMs = Math.max(0, turnDeadlineAt - Date.now());
  return Math.ceil(remainingMs / 1000);
}

function PlayerBar({
  boardSize,
  myAvatar,
  avatarSize,
  isMyTurn,
  gameResult,
  mySymbol,
  myName,
  opponentName,
  opponentSymbol,
  opponentAvatar,
}) {
  return (
    <div style={{ width: boardSize, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar src={myAvatar} size={avatarSize} />

      <div
        style={{
          flex: 1,
          position: 'relative',
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '50%',
            left: isMyTurn || gameResult ? '0%' : '50%',
            background: 'rgba(255,255,255,0.18)',
            borderRight: '2px solid rgba(255,255,255,0.5)',
            transition: 'left 0.5s ease',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 8px',
              width: '50%',
              minWidth: 0,
            }}
          >
            {mySymbol === 'X' ? <XIcon size={16} /> : <OIcon size={16} />}
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {myName}
            </span>
          </div>
          <span
            style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}
          >
            VS
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
              padding: '6px 8px',
              width: '50%',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {opponentName || '...'}
            </span>
            {opponentSymbol === 'X' ? <XIcon size={16} /> : <OIcon size={16} />}
          </div>
        </div>
      </div>

      <Avatar src={opponentAvatar} size={avatarSize} />
    </div>
  );
}

export default function GamePage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['game', 'errors']);
  const socket = useSocketStore((s) => s.socket);
  const user = useAuthStore((s) => s.user);

  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentSymbol, setCurrentSymbol] = useState('X');
  const [playerX, setPlayerX] = useState('');
  const [playerO, setPlayerO] = useState('');
  const [avatarX, setAvatarX] = useState(null);
  const [avatarO, setAvatarO] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [turnDeadlineAt, setTurnDeadlineAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const mySymbol = sessionStorage.getItem(`match:${matchId}:symbol`);
  const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
  const myName =
    mySymbol === 'X' ? (playerX || user?.username) : (playerO || user?.username);
  const opponentName = mySymbol === 'X' ? playerO : playerX;
  const myAvatar = mySymbol === 'X' ? avatarX : avatarO;
  const opponentAvatar = mySymbol === 'X' ? avatarO : avatarX;
  const isMyTurn = mySymbol === currentSymbol && !gameResult && Boolean(turnDeadlineAt);

  useEffect(() => {
    if (!socket) return undefined;

    const updatePlayer = (name, setPlayer, setAvatar) => {
      if (!name) return;

      setPlayer((prev) => {
        if (prev !== name) {
          client
            .get(`/users/${name}`)
            .then(({ data }) => setAvatar(data.profile?.avatarPath || null))
            .catch(() => {});
        }

        return name;
      });
    };

    const handleState = (state) => {
      setBoard(state.board);
      setCurrentSymbol(state.currentSymbol);
      setTurnDeadlineAt(state.turnDeadlineAt ?? null);
      setTimeLeft(getRemainingSeconds(state.turnDeadlineAt ?? null));
      setWinLine(state.winLine || null);

      updatePlayer(state.playerX, setPlayerX, setAvatarX);
      updatePlayer(state.playerO, setPlayerO, setAvatarO);
    };

    const handleTimerUpdate = ({ turnDeadlineAt: nextTurnDeadlineAt }) => {
      setTurnDeadlineAt(nextTurnDeadlineAt ?? null);
      setTimeLeft(getRemainingSeconds(nextTurnDeadlineAt ?? null));
    };

    const handleEnded = (result) => {
      setGameResult(result);
      setTurnDeadlineAt(null);
      setTimeLeft(0);
    };

    const handleError = ({ code }) => setError(code);

    socket.emit('game:join', { matchId });
    socket.on('game:state', handleState);
    socket.on('game:timer-update', handleTimerUpdate);
    socket.on('game:ended', handleEnded);
    socket.on('game:error', handleError);

    return () => {
      socket.off('game:state', handleState);
      socket.off('game:timer-update', handleTimerUpdate);
      socket.off('game:ended', handleEnded);
      socket.off('game:error', handleError);
    };
  }, [socket, matchId]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!turnDeadlineAt || gameResult) return undefined;

    const syncTimeLeft = () => {
      setTimeLeft(getRemainingSeconds(turnDeadlineAt));
    };

    syncTimeLeft();
    timerRef.current = setInterval(syncTimeLeft, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [turnDeadlineAt, gameResult]);

  const handleMove = (position) => {
    if (!socket || !mySymbol) return;
    socket.emit('game:move', { matchId, position });
  };

  const getResultText = () => {
    if (!gameResult) return null;
    if (gameResult.reason === 'draw') return t('game:result.draw');

    if (gameResult.reason === 'abandon') {
      return gameResult.winnerId === user?.id
        ? t('game:result.opponentDisconnectedWin')
        : t('game:result.disconnectLoss');
    }

    if (gameResult.reason === 'timeout') {
      return gameResult.winnerId === user?.id
        ? t('game:result.timeoutWin')
        : t('game:result.timeoutLoss');
    }

    return gameResult.winnerId === user?.id ? t('game:result.win') : t('game:result.lose');
  };

  const getResultColor = () => {
    if (!gameResult) return '';
    if (gameResult.reason === 'draw') return 'text-yellow-400';
    return gameResult.winnerId === user?.id ? 'text-green-400' : 'text-red-400';
  };

  const getTimerColor = () => {
    if (timeLeft > 20) return '#4ade80';
    if (timeLeft > 10) return '#facc15';
    return '#ef4444';
  };

  const avatarSize = 40;
  const boardSize = 'min(306px, 80vw)';

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        gap: 20,
      }}
    >
      <PlayerBar
        boardSize={boardSize}
        myAvatar={myAvatar}
        avatarSize={avatarSize}
        isMyTurn={isMyTurn}
        gameResult={gameResult}
        mySymbol={mySymbol}
        myName={myName}
        opponentName={opponentName}
        opponentSymbol={opponentSymbol}
        opponentAvatar={opponentAvatar}
      />

      {!gameResult && turnDeadlineAt && (
        <div style={{ width: boardSize, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 700, width: 48, color: getTimerColor() }}>
            {timeLeft}s
          </span>
          <div
            style={{
              flex: 1,
              height: 8,
              background: 'hsl(var(--muted))',
              borderRadius: 9999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(timeLeft / 30) * 100}%`,
                height: '100%',
                borderRadius: 9999,
                backgroundColor: getTimerColor(),
                transition: 'width 0.25s linear, background-color 0.25s ease',
              }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: boardSize,
        }}
      >
        {gameResult ? (
          <span className={cn('text-2xl font-bold', getResultColor())}>
            {getResultText()}
          </span>
        ) : isMyTurn ? (
          <div
            className="animate-pulse"
            style={{
              background: getTimerColor(),
              color: '#000',
              borderRadius: 4,
              padding: '4px 16px',
              fontSize: 14,
              fontWeight: 600,
              transition: 'background-color 0.25s ease',
            }}
          >
            {t('game:status.yourTurn')}
          </div>
        ) : !turnDeadlineAt ? (
          <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>
            {t('game:status.waitingForOpponent')}
          </span>
        ) : (
          <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>
            {t('game:status.opponentThinking')}
          </span>
        )}
      </div>

      <Board
        squares={board}
        onMove={handleMove}
        currentSymbol={currentSymbol}
        mySymbol={mySymbol}
        winLine={winLine}
        gameEnded={!!gameResult}
        size={boardSize}
      />

      {gameResult && (
        <button onClick={() => navigate('/dashboard')} style={{ width: boardSize }}>
          {t('game:backToLobby')}
        </button>
      )}

      {error && (
        <p style={{ color: '#f87171', fontSize: 14 }}>
          {t(`errors:${error}`, { defaultValue: error })}
        </p>
      )}
    </div>
  );
}
