import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, User, Settings } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import client from '../api/client';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'common']);

  const handleLogout = async () => {
    await client.post('/auth/logout');
    clear();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t('auth:dashboard.title')}</h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              {t('auth:dashboard.welcome', { username: user?.username })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/profile"
              className="p-2 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-colors"
            >
              <Settings size={20} />
            </Link>
            <Link
              to={`/u/${user?.username}`}
              className="p-2 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-colors"
            >
              <User size={20} />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--muted))] rounded-lg text-sm hover:bg-[hsl(var(--border))] transition-colors"
            >
              <LogOut size={16} /> {t('common:nav.logout')}
            </button>
          </div>
        </div>

        <div className="bg-[hsl(var(--card))] rounded-xl p-8 border border-[hsl(var(--border))] text-center">
          <p className="text-[hsl(var(--muted-foreground))]">Game lobby coming soon...</p>
        </div>
      </div>
    </div>
  );
}
