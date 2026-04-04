import { useState, useEffect } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import client from '../api/client';
import { useAuthStore } from '../store/auth.store';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import MatchHistoryBlock from '../components/MatchHistoryBlock';

const MATCHES_PER_PAGE = 5;

function getWinRate(rating) {
  if (!rating?.gamesPlayed) return 0;
  return Math.round((rating.wins / rating.gamesPlayed) * 100);
}

function getPageFromSearchParams(searchParams) {
  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const { t } = useTranslation(['errors', 'common', 'profile', 'matches']);
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchesMeta, setMatchesMeta] = useState({
    page: 1,
    limit: MATCHES_PER_PAGE,
    total: 0,
    hasMore: false,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((s) => s.user);
  const isOwn = currentUser?.username === username;
  const location = useLocation();
  const currentPage = getPageFromSearchParams(searchParams);

  function handlePageChange(nextPage) {
    const safePage = Math.max(1, nextPage);
    setLoading(true);
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);

      if (safePage === 1) {
        nextParams.delete('page');
      } else {
        nextParams.set('page', String(safePage));
      }

      return nextParams;
    });
  }

  useEffect(() => {
    const profileRequest = isOwn ? client.get('/me') : client.get(`/users/${username}`);
    const matchesRequest = isOwn
      ? client.get('/me/matches', { params: { page: currentPage, limit: MATCHES_PER_PAGE } })
      : client.get(`/users/${username}/matches`, { params: { page: currentPage, limit: MATCHES_PER_PAGE } });

    Promise.all([profileRequest, matchesRequest])
      .then(([profileResponse, matchesResponse]) => {
        const history = matchesResponse.data || {};
        const totalPages = Math.max(1, Math.ceil((history.total || 0) / (history.limit || MATCHES_PER_PAGE)));

        if ((history.total || 0) > 0 && currentPage > totalPages) {
          setSearchParams((prev) => {
            const nextParams = new URLSearchParams(prev);
            nextParams.set('page', String(totalPages));
            return nextParams;
          }, { replace: true });
          return;
        }

        setProfile(profileResponse.data);
        setMatches(history.items || []);
        setMatchesMeta({
          page: history.page || currentPage,
          limit: history.limit || MATCHES_PER_PAGE,
          total: history.total || 0,
          hasMore: Boolean(history.hasMore),
        });
        setError(null);
      })
      .catch((err) => {
        const code = err.response?.data?.error?.code;
        setError(t(`errors:${code || 'SOMETHING_WRONG'}`));
      })
      .finally(() => setLoading(false));
  }, [username, isOwn, currentPage, t, setSearchParams]);

  if (loading || !profile || profile.username !== username) return <div className="loading">{t('common:loading')}</div>;

  if (error) return (
    <Layout>
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-red-400">{error}</p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'min(16px, 2vh)' }}>
        <div style={{ background: 'hsl(var(--card))', borderRadius: 12, padding: 'min(20px, 2.5vh)', border: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar src={profile.profile?.avatarPath} size="min(64px, 8vh)" />
          <div>
            <h1 style={{ fontSize: 'min(20px, 2.5vh)', fontWeight: 700 }}>@{profile.username}</h1>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 'min(14px, 1.8vh)', marginTop: 4 }}>
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {profile.ratings?.length > 0 && (
          <div style={{ background: 'hsl(var(--card))', borderRadius: 12, padding: 'min(20px, 2.5vh)', border: '1px solid hsl(var(--border))' }}>
            <h2 style={{ fontSize: 'min(12px, 1.5vh)', fontWeight: 600, marginBottom: 'min(12px, 1.5vh)', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={14} /> {t('profile:ratings')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profile.ratings.map((r) => (
                <div key={r.gameMode.code} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 'min(12px, 1.5vh)', background: 'hsl(var(--muted))', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 500, fontSize: 'min(14px, 1.8vh)' }}>{r.gameMode.name}</span>
                    <span style={{ fontSize: 'min(14px, 1.8vh)' }}>
                      {t('profile:rating')}: <strong>{r.eloRating}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 'min(14px, 1.8vh)' }}>
                    <span>{t('profile:games')}: <strong>{r.gamesPlayed}</strong></span>
                    <span style={{ color: '#4ade80' }}>W {r.wins}</span>
                    <span style={{ color: '#f87171' }}>L {r.losses}</span>
                    <span style={{ color: '#facc15' }}>D {r.draws}</span>
                    <span>{t('profile:winRate')}: <strong>{getWinRate(r)}%</strong></span>
                    <span>{t('profile:streak')}: <strong>{r.winStreak}</strong></span>
                    <span>{t('profile:bestStreak')}: <strong>{r.maxWinStreak}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <MatchHistoryBlock
          t={t}
          matches={matches}
          from={`${location.pathname}${location.search}`}
          pagination={matchesMeta}
          onPageChange={handlePageChange}
        />
      </div>
    </Layout>
  );
}
