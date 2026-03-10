import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocketStore } from '../store/socket.store';
import { useAuthStore } from '../store/auth.store';
import Board from '../components/game/Board';
import XIcon from '../components/game/XIcon';
import OIcon from '../components/game/OIcon';
import { cn } from '../lib/utils';

export default function GamePage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const socket = useSocketStore((s) => s.socket);
  const user = useAuthStore((s) => s.user);

  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentSymbol, setCurrentSymbol] = useState('X');
  const [playerX, setPlayerX] = useState('');
  const [playerO, setPlayerO] = useState('');
  const [winLine, setWinLine] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  // Читаем symbol из sessionStorage — сохранили при matchmaking:matched
  const mySymbol = sessionStorage.getItem(`match:${matchId}:symbol`);
  const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';

  // Имена берём из game:state но показываем username из store пока не пришли
  const myName = mySymbol === 'X' ? (playerX || user?.username) : (playerO || user?.username);
  const opponentName = mySymbol === 'X' ? playerO : playerX;

  const isMyTurn = mySymbol === currentSymbol && !gameResult;

  useEffect(() => {
    if (!socket) return;
    socket.emit('game:join', { matchId });

    socket.on('game:state', (state) => {
      setBoard(state.board);
      setCurrentSymbol(state.currentSymbol);
      setPlayerX(state.playerX);
      setPlayerO(state.playerO);
      if (state.winLine) setWinLine(state.winLine);
      resetTimer();
    });

    socket.on('game:ended', (result) => {
      setGameResult(result);
      clearTimer();
    });

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

  const PlayerBar = () => (
    <div className="relative w-[306px] rounded-xl border border-[hsl(var(--border))] overflow-hidden"
      style={{ background: 'hsl(var(--card))' }}>
      <div
        className="absolute top-0 bottom-0 w-1/2 transition-all duration-500 ease-in-out"
        style={{
          left: isMyTurn || gameResult ? '0%' : '50%',
          background: 'rgba(255,255,255,0.18)',
          borderRight: '2px solid rgba(255,255,255,0.5)',
        }}
      />
      <div className="relative flex items-center">
        <div className="flex items-center gap-2 px-3 py-3 w-1/2">
          {mySymbol === 'X' ? <XIcon size={20} /> : <OIcon size={20} />}
          <span className="font-semibold text-sm truncate">{myName}</span>
        </div>
        <span className="text-[hsl(var(--muted-foreground))] text-xs font-medium shrink-0">VS</span>
        <div className="flex items-center justify-end gap-2 px-3 py-3 w-1/2">
          <span className="font-semibold text-sm truncate">{opponentName || '...'}</span>
          {opponentSymbol === 'X' ? <XIcon size={20} /> : <OIcon size={20} />}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-5">

      <PlayerBar />

      {/* Timer */}
      {!gameResult && (
        <div className="flex items-center gap-3 w-[306px]">
          <span className="text-xl font-bold tabular-nums w-10" style={{ color: getTimerColor() }}>
            {timeLeft}s
          </span>
          <div className="flex-1 h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(timeLeft / 30) * 100}%`,
                backgroundColor: getTimerColor(),
                transition: 'width 1s linear, background-color 1s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Status */}
      <div className="h-8 flex items-center justify-center w-[306px]">
        {gameResult ? (
          <span className={cn('text-2xl font-bold', getResultColor())}>{getResultText()}</span>
        ) : isMyTurn ? (
          <div
            className="flex items-center gap-2 px-4 py-1 text-sm font-semibold animate-pulse"
            style={{
              background: getTimerColor(),
              color: '#000000',
              borderRadius: '4px',
              transition: 'background-color 1s ease',
            }}
          >
            ● Your turn
          </div>
        ) : (
          <span className="text-[hsl(var(--muted-foreground))] text-sm">Opponent is thinking...</span>
        )}
      </div>

      <Board
        squares={board}
        onMove={handleMove}
        currentSymbol={currentSymbol}
        mySymbol={mySymbol}
        winLine={winLine}
        gameEnded={!!gameResult}
      />

      {gameResult && (
        <button onClick={() => navigate('/dashboard')} className="w-[306px]">
          Back to lobby
        </button>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
