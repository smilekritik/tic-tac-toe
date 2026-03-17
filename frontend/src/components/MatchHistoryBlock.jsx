import { Link } from 'react-router-dom';
import { Clock3, History, Swords, TrendingUp } from 'lucide-react';
import Avatar from './Avatar';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  if (!minutes) return `${restSeconds}s`;
  return `${minutes}m ${restSeconds}s`;
}

function getResultColor(result) {
  if (result === 'win') return '#4ade80';
  if (result === 'loss') return '#f87171';
  return '#facc15';
}

function getSpecialFinishReason(resultType) {
  if (resultType === 'timeout' || resultType === 'abandon') return resultType;
  return null;
}

export default function MatchHistoryBlock({ t, matches = [], loading = false, from }) {
  return (
    <div style={{ background: 'hsl(var(--card))', borderRadius: 12, padding: 'min(20px, 2.5vh)', border: '1px solid hsl(var(--border))' }}>
      <h2 style={{ fontSize: 'min(12px, 1.5vh)', fontWeight: 600, marginBottom: 'min(12px, 1.5vh)', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <History size={14} /> {t('matches:title')}
      </h2>

      {loading ? (
        <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 'min(14px, 1.8vh)' }}>
          {t('matches:loading')}
        </div>
      ) : matches.length === 0 ? (
        <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 'min(14px, 1.8vh)' }}>
          {t('matches:empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {matches.map((match) => {
            const specialFinishReason = getSpecialFinishReason(match.resultType);

            return (
              <Link
                key={match.matchId}
                to={`/matches/${match.matchId}`}
                state={{ from }}
                style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 'min(12px, 1.5vh)', background: 'hsl(var(--muted))', borderRadius: 8 }}
              >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'min(14px, 1.8vh)' }}>{match.gameMode.name}</div>
                  <div style={{ fontSize: 'min(12px, 1.5vh)', color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                    {formatDate(match.finishedAt || match.startedAt)}
                  </div>
                </div>
                <div style={{ color: getResultColor(match.result), fontWeight: 700, fontSize: 'min(13px, 1.7vh)', textTransform: 'uppercase' }}>
                  {t(`matches:result.${match.result}`)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar src={match.opponent.avatarPath} size="40px" />
                <div>
                  <div style={{ fontSize: 'min(13px, 1.7vh)', color: 'hsl(var(--muted-foreground))' }}>{t('matches:opponent')}</div>
                  <div style={{ fontWeight: 600, fontSize: 'min(14px, 1.8vh)' }}>@{match.opponent.username}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 'min(13px, 1.7vh)', color: 'hsl(var(--muted-foreground))' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Swords size={13} />
                  {t('matches:moves')}: <strong style={{ color: 'hsl(var(--foreground))' }}>{match.moveCount}</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock3 size={13} />
                  {t('matches:duration')}: <strong style={{ color: 'hsl(var(--foreground))' }}>{formatDuration(match.durationSeconds)}</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={13} />
                  {t('matches:ratingDelta')}: <strong style={{ color: 'hsl(var(--foreground))' }}>
                    {typeof match.ratingDelta === 'number' && match.ratingDelta > 0 ? `+${match.ratingDelta}` : match.ratingDelta ?? '—'}
                  </strong>
                </span>
                {specialFinishReason && (
                  <span>
                    {t('matches:finishReason')}: <strong style={{ color: 'hsl(var(--foreground))' }}>{t(`matches:reason.${specialFinishReason}`)}</strong>
                  </span>
                )}
              </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
