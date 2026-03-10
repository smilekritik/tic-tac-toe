import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Trophy, ArrowLeft } from 'lucide-react';
import client from '../api/client';
import { useAuthStore } from '../store/auth.store';

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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error}</p>
      <Link to="/dashboard" className="text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
        <ArrowLeft size={16} /> Back
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/dashboard" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 text-sm">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="bg-[hsl(var(--card))] rounded-xl p-6 border border-[hsl(var(--border))] flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-[hsl(var(--muted))] flex items-center justify-center flex-shrink-0">
            {profile.profile?.avatarPath
              ? <img src={profile.profile.avatarPath} alt="avatar" className="w-full h-full object-cover" />
              : <User size={32} className="text-[hsl(var(--muted-foreground))]" />
            }
          </div>
          <div>
            <h1 className="text-2xl font-bold">@{profile.username}</h1>
            <p className="text-[hsl(var(--muted-foreground))] text-sm">
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {profile.ratings?.length > 0 && (
          <div className="bg-[hsl(var(--card))] rounded-xl p-6 border border-[hsl(var(--border))]">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy size={20} /> Stats
            </h2>
            <div className="space-y-3">
              {profile.ratings.map((r) => (
                <div key={r.gameMode.code} className="flex justify-between items-center p-3 bg-[hsl(var(--muted))] rounded-lg">
                  <span className="font-medium">{r.gameMode.name}</span>
                  <div className="flex gap-4 text-sm text-[hsl(var(--muted-foreground))]">
                    <span>ELO: <strong className="text-[hsl(var(--foreground))]">{r.eloRating}</strong></span>
                    <span className="text-green-400">W {r.wins}</span>
                    <span className="text-red-400">L {r.losses}</span>
                    <span className="text-yellow-400">D {r.draws}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
