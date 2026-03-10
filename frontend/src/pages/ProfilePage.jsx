import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Mail, AtSign, Globe, Upload, Save, ArrowLeft } from 'lucide-react';
import { useMe } from '../hooks/useMe';
import { useAuthStore } from '../store/auth.store';
import client from '../api/client';
import { cn } from '../lib/utils';

export default function ProfilePage() {
  const { me, loading, refetch } = useMe();
  const { t, i18n } = useTranslation(['profile', 'errors', 'common']);
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const fileRef = useRef();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [lang, setLang] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [messages, setMessages] = useState({});

  const msg = (key, text, type = 'success') =>
    setMessages((prev) => ({ ...prev, [key]: { text, type } }));

  // Инициализация после загрузки
  if (me && !username && !email) {
    setUsername(me.username);
    setEmail(me.email);
    setLang(me.profile?.preferredLanguage || 'en');
    setChatEnabled(me.profile?.chatEnabledDefault ?? true);
    setPublicProfile(me.profile?.publicProfileEnabled ?? true);
  }

  const handleUsername = async () => {
    try {
      const { data } = await client.patch('/me/username', { username });
      setAuth(accessToken, { ...user, username: data.username });
      msg('username', t('profile:saved'));
    } catch (err) {
      const code = err.response?.data?.error?.code;
      msg('username', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    }
  };

  const handleEmail = async () => {
    try {
      await client.patch('/me/email', { email });
      msg('email', 'Confirmation email sent');
    } catch (err) {
      const code = err.response?.data?.error?.code;
      msg('email', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    }
  };

  const handleProfile = async () => {
    try {
      await client.patch('/me/profile', {
        preferredLanguage: lang,
        chatEnabledDefault: chatEnabled,
        publicProfileEnabled: publicProfile,
      });
      i18n.changeLanguage(lang);
      msg('profile', t('profile:saved'));
    } catch {
      msg('profile', t('errors:SOMETHING_WRONG'), 'error');
    }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('avatar', file);
    try {
      await client.post('/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      refetch();
      msg('avatar', t('profile:saved'));
    } catch (err) {
      const code = err.response?.data?.error?.code;
      msg('avatar', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    }
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  const avatarUrl = me?.profile?.avatarPath
    ? `${me.profile.avatarPath}`
    : null;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/dashboard" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="text-3xl font-bold">{t('profile:title')}</h1>

        {/* Avatar */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-6 border border-[hsl(var(--border))]">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User size={20} /> {t('profile:avatar')}
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-[hsl(var(--muted))] flex items-center justify-center">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : <User size={32} className="text-[hsl(var(--muted-foreground))]" />
              }
            </div>
            <div>
              <button
                onClick={() => fileRef.current.click()}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--muted))] rounded-lg text-sm hover:bg-[hsl(var(--border))] transition-colors"
              >
                <Upload size={16} /> Upload
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              {messages.avatar && (
                <p className={cn('text-sm mt-2', messages.avatar.type === 'error' ? 'text-red-400' : 'text-green-400')}>
                  {messages.avatar.text}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Username */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-6 border border-[hsl(var(--border))]">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AtSign size={20} /> {t('profile:username')}
          </h2>
          <div className="flex gap-2">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1"
            />
            <button onClick={handleUsername} className="flex items-center gap-2 px-4 whitespace-nowrap">
              <Save size={16} /> {t('profile:save')}
            </button>
          </div>
          {messages.username && (
            <p className={cn('text-sm mt-2', messages.username.type === 'error' ? 'text-red-400' : 'text-green-400')}>
              {messages.username.text}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-6 border border-[hsl(var(--border))]">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail size={20} /> {t('profile:email')}
          </h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <button onClick={handleEmail} className="flex items-center gap-2 px-4 whitespace-nowrap">
              <Save size={16} /> {t('profile:save')}
            </button>
          </div>
          {messages.email && (
            <p className={cn('text-sm mt-2', messages.email.type === 'error' ? 'text-red-400' : 'text-green-400')}>
              {messages.email.text}
            </p>
          )}
        </div>

        {/* Settings */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-6 border border-[hsl(var(--border))]">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe size={20} /> {t('profile:language')}
          </h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              {['en', 'uk', 'pl'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm border transition-colors',
                    lang === l
                      ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.1]'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  )}
                >
                  {t(`common:language.${l}`)}
                </button>
              ))}
            </div>

            <label className="flex items-center justify-between">
              <span className="text-sm">Public profile</span>
              <input
                type="checkbox"
                checked={publicProfile}
                onChange={(e) => setPublicProfile(e.target.checked)}
                className="w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm">Chat enabled</span>
              <input
                type="checkbox"
                checked={chatEnabled}
                onChange={(e) => setChatEnabled(e.target.checked)}
                className="w-4 h-4"
              />
            </label>

            <button onClick={handleProfile} className="flex items-center gap-2 w-full justify-center">
              <Save size={16} /> {t('profile:save')}
            </button>
            {messages.profile && (
              <p className={cn('text-sm text-center', messages.profile.type === 'error' ? 'text-red-400' : 'text-green-400')}>
                {messages.profile.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
