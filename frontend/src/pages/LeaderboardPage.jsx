import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flame, Trophy } from 'lucide-react';
import client from '../api/client';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';

function getWinRate(entry) {
  if (!entry?.gamesPlayed) return 0;
  return Math.round((entry.wins / entry.gamesPlayed) * 100);
}

export default function LeaderboardPage() {
  const { t } = useTranslation(['leaderboard', 'errors', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [activeMode, setActiveMode] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mode = searchParams.get('mode');

  useEffect(() => {
    let cancelled = false;

    client.get('/leaderboard', {
      params: mode ? { mode } : undefined,
    })
      .then(({ data }) => {
        if (cancelled) return;

        setCategories(data.categories || []);
        setActiveMode(data.mode || null);
        setEntries(data.entries || []);

        if (data.mode?.code && data.mode.code !== mode) {
          setSearchParams({ mode: data.mode.code }, { replace: true });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const code = err.response?.data?.error?.code;
        setError(t(`errors:${code || 'SOMETHING_WRONG'}`));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, setSearchParams, t]);

  const handleCategoryChange = (code) => {
    if (code === activeMode?.code) return;

    setLoading(true);
    setError(null);
    setSearchParams({ mode: code });
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'min(16px, 2vh)' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.18), rgba(245,158,11,0.08))', borderRadius: 16, padding: 'min(20px, 2.5vh)', border: '1px solid rgba(250,204,21,0.22)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(250,204,21,0.18)', color: '#facc15' }}>
              <Trophy size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: 'min(24px, 3vh)', fontWeight: 700 }}>{t('leaderboard:title')}</h1>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 'min(14px, 1.8vh)', marginTop: 2 }}>
                {t('leaderboard:subtitle')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {categories.map((category) => {
              const isActive = activeMode?.code === category.code;

              return (
                <button
                  key={category.code}
                  onClick={() => handleCategoryChange(category.code)}
                  style={{
                    height: 'min(38px, 4.8vh)',
                    padding: '0 14px',
                    borderRadius: 999,
                    border: `1px solid ${isActive ? '#facc15' : 'hsl(var(--border))'}`,
                    background: isActive ? 'rgba(250,204,21,0.16)' : 'hsl(var(--card))',
                    color: isActive ? '#facc15' : 'hsl(var(--foreground))',
                    fontSize: 'min(13px, 1.7vh)',
                    fontWeight: 500,
                  }}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ background: 'hsl(var(--card))', borderRadius: 16, border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
          <div style={{ padding: 'min(16px, 2vh) min(18px, 2.2vh)', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 'min(18px, 2.3vh)', fontWeight: 600 }}>
                {activeMode?.name || t('leaderboard:title')}
              </h2>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 'min(13px, 1.7vh)', marginTop: 2 }}>
                {t('leaderboard:topPlayers')}
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 'min(24px, 3vh)', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              {t('common:loading')}
            </div>
          ) : error ? (
            <div style={{ padding: 'min(24px, 3vh)', textAlign: 'center', color: '#f87171' }}>
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 'min(24px, 3vh)', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              {t('leaderboard:empty')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {entries.map((entry) => (
                <Link
                  key={entry.username}
                  to={`/u/${entry.username}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 'min(14px, 1.8vh) min(18px, 2.2vh)',
                    borderTop: '1px solid hsl(var(--border))',
                    background: entry.isCurrentUser ? 'rgba(74,222,128,0.08)' : 'transparent',
                  }}
                >
                  <div style={{ width: 32, textAlign: 'center', fontWeight: 700, color: entry.rank <= 3 ? '#facc15' : 'hsl(var(--muted-foreground))' }}>
                    #{entry.rank}
                  </div>

                  <Avatar src={entry.avatarPath} size="40px" />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 'min(15px, 1.9vh)' }}>@{entry.username}</span>
                      {entry.isCurrentUser && (
                        <span style={{ fontSize: 'min(12px, 1.5vh)', color: '#4ade80' }}>
                          {t('leaderboard:you')}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, color: 'hsl(var(--muted-foreground))', fontSize: 'min(13px, 1.7vh)' }}>
                      <span>{t('leaderboard:games')}: <strong style={{ color: 'hsl(var(--foreground))' }}>{entry.gamesPlayed}</strong></span>
                      <span>{t('leaderboard:winRate')}: <strong style={{ color: 'hsl(var(--foreground))' }}>{getWinRate(entry)}%</strong></span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Flame size={13} />
                        {t('leaderboard:streak')}: <strong style={{ color: 'hsl(var(--foreground))' }}>{entry.winStreak}</strong>
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: '#facc15', fontWeight: 700, fontSize: 'min(18px, 2.2vh)' }}>
                      {entry.eloRating}
                    </div>
                    <div style={{ fontSize: 'min(12px, 1.5vh)', color: 'hsl(var(--muted-foreground))' }}>
                      {t('leaderboard:rating')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
