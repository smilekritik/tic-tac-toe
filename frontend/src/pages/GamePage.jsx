import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketStore } from '../store/socket.store';
import { useAuthStore } from '../store/auth.store';
import Board from '../components/game/Board';
import XIcon from '../components/game/XIcon';
import OIcon from '../components/game/OIcon';
import Avatar from '../components/Avatar';
import { cn } from '../lib/utils';
import client from '../api/client';

export default function GamePage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
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
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const mySymbol = sessionStorage.getItem(`match:${matchId}:symbol`);
  const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
  const myName = mySymbol === 'X' ? (playerX || user?.username) : (playerO || user?.username);
  const opponentName = mySymbol === 'X' ? playerO : playerX;
  const myAvatar = mySymbol === 'X' ? avatarX : avatarO;
  const opponentAvatar = mySymbol === 'X' ? avatarO : avatarX;
  const isMyTurn = mySymbol === currentSymbol && !gameResult;

  useEffect(() => {
    if (!socket) return;
    socket.emit('game:join', { matchId });

    socket.on('game:state', (state) => {
      setBoard(state.board);
      setCurrentSymbol(state.currentSymbol);

      if (state.playerX && state.playerX !== playerX) {
        setPlayerX(state.playerX);
        client.get(`/users/${state.playerX}`).then(({ data }) => {
          setAvatarX(data.profile?.avatarPath || null);
        }).catch(() => {});
      }
      if (state.playerO && state.playerO !== playerO) {
        setPlayerO(state.playerO);
        client.get(`/users/${state.playerO}`).then(({ data }) => {
          setAvatarO(data.profile?.avatarPath || null);
        }).catch(() => {});
      }

      if (state.winLine) setWinLine(state.winLine);
      resetTimer();
    });

    socket.on('game:ended', (result) => { setGameResult(result); clearTimer(); });
    socket.on('game:error', ({ code }) => setError(code));

    return () => {
      socket.off('game:state');
      socket.off('game:ended');
      socket.off('game:error');
    };
  }, [socket, matchId]);

  function resetTimer() {
    clearTimer();
    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearTimer(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  useEffect(() => () => clearTimer(), []);

  const handleMove = (position) => {
    if (!socket || !mySymbol) return;
    socket.emit('game:move', { matchId, position });
  };

  const getResultText = () => {
    if (!gameResult) return null;
    if (gameResult.reason === 'draw') return 'Draw!';
    return gameResult.winnerId === user?.id ? 'You win! 🎉' : 'You lose!';
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

  const PlayerBar = () => (
    <div style={{ width: boardSize, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar src={myAvatar} size={avatarSize} />

      <div style={{ flex: 1, position: 'relative', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: '50%',
          left: isMyTurn || gameResult ? '0%' : '50%',
          background: 'rgba(255,255,255,0.18)',
          borderRight: '2px solid rgba(255,255,255,0.5)',
          transition: 'left 0.5s ease',
        }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', width: '50%', minWidth: 0 }}>
            {mySymbol === 'X' ? <XIcon size={16} /> : <OIcon size={16} />}
            <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myName}</span>
          </div>
          <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>VS</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, padding: '6px 8px', width: '50%', minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opponentName || '...'}</span>
            {opponentSymbol === 'X' ? <XIcon size={16} /> : <OIcon size={16} />}
          </div>
        </div>
      </div>

      <Avatar src={opponentAvatar} size={avatarSize} />
    </div>
  );

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: 20 }}>
      <PlayerBar />

      {!gameResult && (
        <div style={{ width: boardSize, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 700, width: 48, color: getTimerColor() }}>
            {timeLeft}s
          </span>
          <div style={{ flex: 1, height: 8, background: 'hsl(var(--muted))', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{
              width: `${(timeLeft / 30) * 100}%`, height: '100%', borderRadius: 9999,
              backgroundColor: getTimerColor(),
              transition: 'width 1s linear, background-color 1s ease',
            }} />
          </div>
        </div>
      )}

      <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', width: boardSize }}>
        {gameResult ? (
          <span className={cn('text-2xl font-bold', getResultColor())}>{getResultText()}</span>
        ) : isMyTurn ? (
          <div className="animate-pulse" style={{ background: getTimerColor(), color: '#000', borderRadius: 4, padding: '4px 16px', fontSize: 14, fontWeight: 600, transition: 'background-color 1s ease' }}>
            ● Your turn
          </div>
        ) : (
          <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>Opponent is thinking...</span>
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
          Back to lobby
        </button>
      )}

      {error && <p style={{ color: '#f87171', fontSize: 14 }}>{error}</p>}
    </div>
  );
}
