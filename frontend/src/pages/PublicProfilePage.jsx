import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Trophy } from 'lucide-react';
import client from '../api/client';
import { useAuthStore } from '../store/auth.store';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';

export default function PublicProfilePage() {
  const { username } = useParams();
  const { t } = useTranslation(['errors', 'common']);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((s) => s.user);
  const isOwn = currentUser?.username === username;

  useEffect(() => {
    const req = isOwn ? client.get('/me') : client.get(`/users/${username}`);
    req
      .then(({ data }) => setProfile(data))
      .catch((err) => {
        const code = err.response?.data?.error?.code;
        setError(t(`errors:${code || 'SOMETHING_WRONG'}`));
      })
      .finally(() => setLoading(false));
  }, [username, isOwn]);

  if (loading) return <div className="loading">{t('common:loading')}</div>;

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
              <Trophy size={14} /> Stats
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profile.ratings.map((r) => (
                <div key={r.gameMode.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'min(12px, 1.5vh)', background: 'hsl(var(--muted))', borderRadius: 8 }}>
                  <span style={{ fontWeight: 500, fontSize: 'min(14px, 1.8vh)' }}>{r.gameMode.name}</span>
                  <div style={{ display: 'flex', gap: 12, fontSize: 'min(14px, 1.8vh)' }}>
                    <span>ELO: <strong>{r.eloRating}</strong></span>
                    <span style={{ color: '#4ade80' }}>W {r.wins}</span>
                    <span style={{ color: '#f87171' }}>L {r.losses}</span>
                    <span style={{ color: '#facc15' }}>D {r.draws}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
