import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
} from 'lucide-react';
import Layout from '../components/Layout';
import Board from '../components/game/Board';
import client from '../api/client';

function formatMove(move) {
  return `${move.moveNumber}. ${move.symbol} -> (${move.positionX + 1}, ${move.positionY + 1})`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (!minutes) return `${restSeconds}s`;
  return `${minutes}m ${restSeconds}s`;
}

function getWinLine(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }

  return null;
}

function buildReplaySnapshots(moves, modeCode) {
  const board = Array(9).fill(null);
  const markQueues = {
    X: [],
    O: [],
  };

  const snapshots = [
    {
      step: 0,
      board: [...board],
      winLine: null,
      move: null,
    },
  ];

  for (const move of moves) {
    const position = move.positionX * 3 + move.positionY;

    if (modeCode === 'moving-window') {
      const queue = markQueues[move.symbol];
      if (queue.length === 3) {
        const removedPosition = queue.shift();
        board[removedPosition] = null;
      }

      board[position] = move.symbol;
      queue.push(position);
    } else {
      board[position] = move.symbol;
    }

    snapshots.push({
      step: move.moveNumber,
      board: [...board],
      winLine: getWinLine(board),
      move,
    });
  }

  return snapshots;
}

const replayButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minWidth: 42,
  height: 42,
  borderRadius: 10,
  background: 'hsl(var(--muted))',
  color: 'hsl(var(--foreground))',
};

export default function MatchDetailsPage() {
  const { matchId } = useParams();
  const location = useLocation();
  const { t } = useTranslation(['matchDetails', 'errors', 'common']);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replayStep, setReplayStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const backTo = location.state?.from || '/';

  useEffect(() => {
    client
      .get(`/matches/${matchId}`)
      .then(({ data }) => {
        setMatch(data);
        setReplayStep(data.moves?.length || 0);
        setIsPlaying(false);
      })
      .catch((err) => {
        const code = err.response?.data?.error?.code;
        setError(t(`errors:${code || 'SOMETHING_WRONG'}`, {
          defaultValue: t('errors:SOMETHING_WRONG'),
        }));
      })
      .finally(() => setLoading(false));
  }, [matchId, t]);

  const replaySnapshots = useMemo(
    () => buildReplaySnapshots(match?.moves || [], match?.gameMode?.code),
    [match],
  );

  useEffect(() => {
    if (!isPlaying || replayStep >= replaySnapshots.length - 1) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setReplayStep((prev) => {
        const nextStep = Math.min(prev + 1, replaySnapshots.length - 1);
        if (nextStep >= replaySnapshots.length - 1) {
          setIsPlaying(false);
        }
        return nextStep;
      });
    }, 900);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isPlaying, replaySnapshots.length, replayStep]);

  const currentSnapshot = replaySnapshots[replayStep] || {
    board: Array(9).fill(null),
    winLine: null,
    move: null,
  };

  const jumpToStep = (nextStep) => {
    setReplayStep(Math.max(0, Math.min(replaySnapshots.length - 1, nextStep)));
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!replaySnapshots.length) {
      return;
    }

    if (replayStep >= replaySnapshots.length - 1) {
      setReplayStep(0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((prev) => !prev);
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 'min(28px, 4vh)', fontWeight: 700 }}>{t('matchDetails:title')}</h1>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>
              {t('matchDetails:subtitle')}
            </p>
          </div>
          <Link to={backTo} style={{ color: 'hsl(var(--primary))' }}>
            {t('matchDetails:backToHistory')}
          </Link>
        </div>

        {loading && <p>{t('matchDetails:loading')}</p>}
        {error && <p style={{ color: '#f87171' }}>{error}</p>}

        {match && (
          <>
            <div style={{ padding: 16, borderRadius: 14, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>{t('matchDetails:players')}</div>
                  <strong>@{match.playerX.username}</strong> vs <strong>@{match.playerO.username}</strong>
                </div>
                <div>
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>{t('matchDetails:result')}</div>
                  <strong>{match.resultType || 'active'}</strong>
                </div>
                <div>
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>{t('matchDetails:mode')}</div>
                  <strong>{match.gameMode?.name || '—'}</strong>
                </div>
                <div>
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>{t('matchDetails:started')}</div>
                  <strong>{match.startedAt ? new Date(match.startedAt).toLocaleString() : '—'}</strong>
                </div>
                <div>
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>{t('matchDetails:duration')}</div>
                  <strong>{formatDuration(match.durationSeconds)}</strong>
                </div>
                <div>
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>{t('matchDetails:ratingDelta')}</div>
                  <strong>X {match.ratingDeltaX ?? '—'} / O {match.ratingDeltaO ?? '—'}</strong>
                </div>
                <div>
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>{t('matchDetails:winner')}</div>
                  <strong>{match.winner?.username ? `@${match.winner.username}` : t('matchDetails:draw')}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
              <Board
                squares={currentSnapshot.board}
                onMove={() => {}}
                currentSymbol="X"
                mySymbol={null}
                winLine={currentSnapshot.winLine}
                gameEnded
                size="min(320px, 90vw)"
              />

              <div
                style={{
                  width: 'min(420px, 100%)',
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                  display: 'grid',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>
                      {t('matchDetails:replay')}
                    </div>
                    <strong>
                      {currentSnapshot.move
                        ? t('matchDetails:currentMove', { move: currentSnapshot.move.moveNumber })
                        : t('matchDetails:initialBoard')}
                    </strong>
                  </div>
                  <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>
                    {t('matchDetails:stepCounter', {
                      current: replayStep,
                      total: Math.max(0, replaySnapshots.length - 1),
                    })}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button type="button" onClick={() => jumpToStep(0)} style={replayButtonStyle} title={t('matchDetails:controls.start')}>
                    <SkipBack size={16} />
                  </button>
                  <button type="button" onClick={() => jumpToStep(replayStep - 1)} style={replayButtonStyle} title={t('matchDetails:controls.previous')}>
                    <StepBack size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlayback}
                    style={{ ...replayButtonStyle, minWidth: 120 }}
                    title={isPlaying ? t('matchDetails:controls.pause') : t('matchDetails:controls.play')}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    {isPlaying ? t('matchDetails:controls.pause') : t('matchDetails:controls.play')}
                  </button>
                  <button type="button" onClick={() => jumpToStep(replayStep + 1)} style={replayButtonStyle} title={t('matchDetails:controls.next')}>
                    <StepForward size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpToStep(replaySnapshots.length - 1)}
                    style={replayButtonStyle}
                    title={t('matchDetails:controls.end')}
                  >
                    <SkipForward size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 14, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{t('matchDetails:moves')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => jumpToStep(0)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: replayStep === 0 ? 'rgba(129, 140, 248, 0.14)' : 'hsl(var(--muted))',
                    border: replayStep === 0 ? '1px solid hsl(var(--primary))' : '1px solid transparent',
                    textAlign: 'left',
                  }}
                >
                  {t('matchDetails:initialBoard')}
                </button>

                {match.moves.map((move) => (
                  <button
                    key={move.id}
                    type="button"
                    onClick={() => jumpToStep(move.moveNumber)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background:
                        replayStep === move.moveNumber
                          ? 'rgba(129, 140, 248, 0.14)'
                          : 'hsl(var(--muted))',
                      border:
                        replayStep === move.moveNumber
                          ? '1px solid hsl(var(--primary))'
                          : '1px solid transparent',
                      fontFamily: 'monospace',
                      textAlign: 'left',
                    }}
                  >
                    {formatMove(move)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
