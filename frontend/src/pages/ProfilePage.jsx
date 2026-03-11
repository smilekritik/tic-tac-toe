import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Mail, AtSign, Globe, Upload, Save } from 'lucide-react';
import { useMe } from '../hooks/useMe';
import { useAuthStore } from '../store/auth.store';
import client from '../api/client';
import { cn } from '../lib/utils';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';

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
      if (me?.emailVerified) {
        await client.patch('/me/email', { email });
        msg('email', 'Confirmation email sent');
      } else {
        await client.post('/auth/resend-verification');
        msg('email', 'Verification email sent');
      }
    } catch (err) {
      const code = err.response?.data?.error?.code;
      msg('email', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    }
  };

  const handleProfile = async () => {
    try {
      await client.patch('/me/profile', { preferredLanguage: lang, chatEnabledDefault: chatEnabled, publicProfileEnabled: publicProfile });
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
      await client.post('/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      refetch();
      msg('avatar', t('profile:saved'));
    } catch (err) {
      const code = err.response?.data?.error?.code;
      msg('avatar', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    }
  };

  if (loading) return <div className="loading">{t('common:loading')}</div>;

  const LANGS = [
    { code: 'en', flag: '🇬🇧' },
    { code: 'uk', flag: '🇺🇦' },
    { code: 'pl', flag: '🇵🇱' },
  ];

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'min(16px, 2vh)' }}>
        <h1 style={{ fontSize: 'min(24px, 3vh)', fontWeight: 700 }}>{t('profile:title')}</h1>

        {/* Avatar */}
        <div style={{ background: 'hsl(var(--card))', borderRadius: 12, padding: 'min(20px, 2.5vh)', border: '1px solid hsl(var(--border))' }}>
          <h2 style={{ fontSize: 'min(12px, 1.5vh)', fontWeight: 600, marginBottom: 'min(12px, 1.5vh)', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: 1 }}>{t('profile:avatar')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar src={me?.profile?.avatarPath} size="min(64px, 8vh)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={() => fileRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 'min(36px, 4.5vh)', padding: '0 16px', background: 'hsl(var(--muted))', borderRadius: 8, fontSize: 'min(14px, 1.8vh)', width: 'fit-content' }}>
                <Upload size={14} /> Upload
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
              {messages.avatar && <p style={{ fontSize: 12, color: messages.avatar.type === 'error' ? '#f87171' : '#4ade80' }}>{messages.avatar.text}</p>}
            </div>
          </div>
        </div>

        {/* Username */}
        <div style={{ background: 'hsl(var(--card))', borderRadius: 12, padding: 'min(20px, 2.5vh)', border: '1px solid hsl(var(--border))' }}>
          <h2 style={{ fontSize: 'min(12px, 1.5vh)', fontWeight: 600, marginBottom: 'min(12px, 1.5vh)', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: 1 }}>{t('profile:username')}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ flex: 1, height: 'min(40px, 5vh)', fontSize: 'min(14px, 1.8vh)' }} />
            <button onClick={handleUsername} style={{ height: 'min(40px, 5vh)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, width: 96, justifyContent: 'center', fontSize: 'min(14px, 1.8vh)' }}>
              <Save size={14} /> {t('profile:save')}
            </button>
          </div>
          {messages.username && <p style={{ fontSize: 12, marginTop: 8, color: messages.username.type === 'error' ? '#f87171' : '#4ade80' }}>{messages.username.text}</p>}
        </div>

        {/* Email */}
        <div style={{ background: 'hsl(var(--card))', borderRadius: 12, padding: 'min(20px, 2.5vh)', border: '1px solid hsl(var(--border))' }}>
          <h2 style={{ fontSize: 'min(12px, 1.5vh)', fontWeight: 600, marginBottom: 'min(12px, 1.5vh)', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: 1 }}>{t('profile:email')}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: 1,
                height: 'min(40px, 5vh)',
                fontSize: 'min(14px, 1.8vh)',
                border: `1px solid ${me?.emailVerified ? 'hsl(var(--border))' : '#ef4444'}`,
                background: me?.emailVerified ? 'transparent' : 'rgba(248,113,113,0.08)',
              }}
            />
            <button onClick={handleEmail} style={{ height: 'min(40px, 5vh)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, width: 96, justifyContent: 'center', fontSize: 'min(14px, 1.8vh)' }}>
              <Save size={14} /> {me?.emailVerified ? t('profile:save') : 'Resend'}
            </button>
          </div>
          {!me?.emailVerified && (
            <p style={{ fontSize: 12, marginTop: 4, color: '#f87171' }}>
              Email not verified
            </p>
          )}
          {messages.email && <p style={{ fontSize: 12, marginTop: 4, color: messages.email.type === 'error' ? '#f87171' : '#4ade80' }}>{messages.email.text}</p>}
        </div>

        {/* Settings */}
        <div style={{ background: 'hsl(var(--card))', borderRadius: 12, padding: 'min(20px, 2.5vh)', border: '1px solid hsl(var(--border))' }}>
          <h2 style={{ fontSize: 'min(12px, 1.5vh)', fontWeight: 600, marginBottom: 'min(12px, 1.5vh)', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: 1 }}>{t('profile:language')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'min(16px, 2vh)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  style={{
                    height: 'min(40px, 5vh)', padding: '0 16px', borderRadius: 8, fontSize: 'min(13px, 1.7vh)',
                    border: `1px solid ${lang === l.code ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                    background: lang === l.code ? 'hsl(var(--muted))' : 'transparent',
                    color: lang === l.code ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span>{l.flag}</span>
                  <span>{t(`common:language.${l.code}`)}</span>
                </button>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 'min(40px, 5vh)' }}>
              <span style={{ fontSize: 'min(14px, 1.8vh)' }}>Public profile</span>
              <input type="checkbox" checked={publicProfile} onChange={(e) => setPublicProfile(e.target.checked)} style={{ width: 16, height: 16 }} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 'min(40px, 5vh)' }}>
              <span style={{ fontSize: 'min(14px, 1.8vh)' }}>Chat enabled</span>
              <input type="checkbox" checked={chatEnabled} onChange={(e) => setChatEnabled(e.target.checked)} style={{ width: 16, height: 16 }} />
            </label>

            <button onClick={handleProfile} style={{ height: 'min(40px, 5vh)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 'min(14px, 1.8vh)' }}>
              <Save size={14} /> {t('profile:save')}
            </button>
            {messages.profile && <p style={{ fontSize: 12, textAlign: 'center', color: messages.profile.type === 'error' ? '#f87171' : '#4ade80' }}>{messages.profile.text}</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
