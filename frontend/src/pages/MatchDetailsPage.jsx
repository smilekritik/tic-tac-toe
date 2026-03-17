import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

export default function MatchDetailsPage() {
  const { matchId } = useParams();
  const location = useLocation();
  const { t } = useTranslation(['matchDetails', 'errors', 'common']);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const backTo = location.state?.from || '/';

  useEffect(() => {
    client
      .get(`/matches/${matchId}`)
      .then(({ data }) => setMatch(data))
      .catch((err) => {
        const code = err.response?.data?.error?.code;
        setError(t(`errors:${code || 'SOMETHING_WRONG'}`, {
          defaultValue: t('errors:SOMETHING_WRONG'),
        }));
      })
      .finally(() => setLoading(false));
  }, [matchId, t]);

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

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Board
                squares={match.finalState?.board || Array(9).fill(null)}
                onMove={() => {}}
                currentSymbol="X"
                mySymbol={null}
                winLine={match.winLine}
                gameEnded
                size="min(320px, 90vw)"
              />
            </div>

            <div style={{ padding: 16, borderRadius: 14, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{t('matchDetails:moves')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {match.moves.map((move) => (
                  <div
                    key={move.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'hsl(var(--muted))',
                      fontFamily: 'monospace',
                    }}
                  >
                    {formatMove(move)}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
