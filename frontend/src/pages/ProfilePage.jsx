import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Save } from 'lucide-react';
import { useMe } from '../hooks/useMe';
import { useAuthStore } from '../store/auth.store';
import client from '../api/client';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import {
  AVATAR_EDITOR,
  AVATAR_MASK_OFFSET,
  AVATAR_MASK_SIZE,
} from '../components/avatarEditor.constants';

function getCenteredOffset(imageWidth, imageHeight, scale) {
  return {
    x: AVATAR_MASK_OFFSET + (AVATAR_MASK_SIZE - imageWidth * scale) / 2,
    y: AVATAR_MASK_OFFSET + (AVATAR_MASK_SIZE - imageHeight * scale) / 2,
  };
}

function clampAxis(offset, scaledSize) {
  const min = Math.min(
    AVATAR_MASK_OFFSET,
    AVATAR_MASK_OFFSET + AVATAR_MASK_SIZE - scaledSize,
  );
  const max = Math.max(
    AVATAR_MASK_OFFSET,
    AVATAR_MASK_OFFSET + AVATAR_MASK_SIZE - scaledSize,
  );

  return Math.min(max, Math.max(min, offset));
}

function clampOffset(offset, scale, imageWidth, imageHeight) {
  return {
    x: clampAxis(offset.x, imageWidth * scale),
    y: clampAxis(offset.y, imageHeight * scale),
  };
}

export default function ProfilePage() {
  const { me, loading, refetch } = useMe();
  const { t, i18n } = useTranslation(['profile', 'errors', 'common']);
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const fileRef = useRef();
  const editorCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const editorImageRef = useRef(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [lang, setLang] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [messages, setMessages] = useState({});
  const [avatarEditor, setAvatarEditor] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [dragState, setDragState] = useState(null);

  const msg = (key, text, type = 'success') =>
    setMessages((prev) => ({ ...prev, [key]: { text, type } }));
  const previewRatio = avatarEditor
    ? AVATAR_EDITOR.previewSize / AVATAR_MASK_SIZE
    : 1;
  const zoomPercent = avatarEditor
    ? Math.round((avatarEditor.scale / avatarEditor.baseScale) * 100)
    : 100;

  if (me && !username && !email) {
    setUsername(me.username);
    setEmail(me.email);
    setLang(me.profile?.preferredLanguage || 'en');
    setChatEnabled(me.profile?.chatEnabledDefault ?? true);
    setPublicProfile(me.profile?.publicProfileEnabled ?? true);
  }

  useEffect(() => {
    return () => {
      if (avatarEditor?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarEditor.src);
      }
    };
  }, [avatarEditor?.src]);

  useEffect(() => {
    if (!avatarEditor || !editorImageRef.current) return;

    const image = editorImageRef.current;
    const devicePixelRatio = window.devicePixelRatio || 1;

    const drawCanvas = (canvas, cssSize, draw) => {
      if (!canvas) return;

      canvas.width = cssSize * devicePixelRatio;
      canvas.height = cssSize * devicePixelRatio;
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;

      const context = canvas.getContext('2d');
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(0, 0, cssSize, cssSize);
      draw(context);
    };

    drawCanvas(editorCanvasRef.current, AVATAR_EDITOR.cropSize, (context) => {
      context.fillStyle = '#0b0b0d';
      context.fillRect(0, 0, AVATAR_EDITOR.cropSize, AVATAR_EDITOR.cropSize);
      context.drawImage(
        image,
        avatarEditor.offset.x,
        avatarEditor.offset.y,
        avatarEditor.imageWidth * avatarEditor.scale,
        avatarEditor.imageHeight * avatarEditor.scale,
      );

      context.fillStyle = 'rgba(0, 0, 0, 0.52)';
      context.beginPath();
      context.rect(0, 0, AVATAR_EDITOR.cropSize, AVATAR_EDITOR.cropSize);
      context.arc(
        AVATAR_EDITOR.cropSize / 2,
        AVATAR_EDITOR.cropSize / 2,
        AVATAR_MASK_SIZE / 2,
        0,
        Math.PI * 2,
        true,
      );
      context.fill('evenodd');

      context.strokeStyle = 'rgba(255,255,255,0.9)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(
        AVATAR_EDITOR.cropSize / 2,
        AVATAR_EDITOR.cropSize / 2,
        AVATAR_MASK_SIZE / 2,
        0,
        Math.PI * 2,
      );
      context.stroke();
    });

    drawCanvas(previewCanvasRef.current, AVATAR_EDITOR.previewSize, (context) => {
      context.fillStyle = '#222';
      context.fillRect(
        0,
        0,
        AVATAR_EDITOR.previewSize,
        AVATAR_EDITOR.previewSize,
      );
      context.save();
      context.beginPath();
      context.arc(
        AVATAR_EDITOR.previewSize / 2,
        AVATAR_EDITOR.previewSize / 2,
        AVATAR_EDITOR.previewSize / 2,
        0,
        Math.PI * 2,
      );
      context.clip();
      context.drawImage(
        image,
        (avatarEditor.offset.x - AVATAR_MASK_OFFSET) * previewRatio,
        (avatarEditor.offset.y - AVATAR_MASK_OFFSET) * previewRatio,
        avatarEditor.imageWidth * avatarEditor.scale * previewRatio,
        avatarEditor.imageHeight * avatarEditor.scale * previewRatio,
      );
      context.restore();
    });
  }, [avatarEditor, previewRatio]);

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
        msg('email', t('profile:emailChangeConfirmationSent'));
      } else {
        await client.post('/auth/resend-verification');
        msg('email', t('profile:verificationEmailSent'));
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

  const closeAvatarEditor = () => {
    setAvatarEditor((prev) => {
      if (prev?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.src);
      }
      return null;
    });
    editorImageRef.current = null;
    setDragState(null);
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    try {
      const src = URL.createObjectURL(file);
      const image = new window.Image();

      image.onload = () => {
        const minScale = Math.max(
          AVATAR_MASK_SIZE / image.naturalWidth,
          AVATAR_MASK_SIZE / image.naturalHeight,
        );
        editorImageRef.current = image;

        setAvatarEditor((prev) => {
          if (prev?.src?.startsWith('blob:')) {
            URL.revokeObjectURL(prev.src);
          }

          return {
            src,
            fileName: file.name,
            imageWidth: image.naturalWidth,
            imageHeight: image.naturalHeight,
            baseScale: minScale,
            minScale: minScale * 0.5,
            maxScale: minScale * 4,
            scale: minScale,
            offset: getCenteredOffset(image.naturalWidth, image.naturalHeight, minScale),
          };
        });
      };

      image.onerror = () => {
        URL.revokeObjectURL(src);
        msg('avatar', t('errors:SOMETHING_WRONG'), 'error');
      };

      image.src = src;
    } catch {
      msg('avatar', t('errors:SOMETHING_WRONG'), 'error');
    }
  };

  const handleAvatarZoomPercent = (nextPercent) => {
    setAvatarEditor((prev) => {
      if (!prev) return prev;

      const nextScale = prev.baseScale * (nextPercent / 100);
      const clampedScale = Math.min(prev.maxScale, Math.max(prev.minScale, nextScale));
      const centerX = (AVATAR_EDITOR.cropSize / 2 - prev.offset.x) / prev.scale;
      const centerY = (AVATAR_EDITOR.cropSize / 2 - prev.offset.y) / prev.scale;
      const unclampedOffset = {
        x: AVATAR_EDITOR.cropSize / 2 - centerX * clampedScale,
        y: AVATAR_EDITOR.cropSize / 2 - centerY * clampedScale,
      };

      return {
        ...prev,
        scale: clampedScale,
        offset: clampOffset(
          unclampedOffset,
          clampedScale,
          prev.imageWidth,
          prev.imageHeight,
        ),
      };
    });
  };

  const handleAvatarPointerDown = (e) => {
    if (!avatarEditor || avatarUploading) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffset: avatarEditor.offset,
    });
  };

  const handleAvatarPointerMove = (e) => {
    if (!dragState || !avatarEditor || dragState.pointerId !== e.pointerId) return;

    const nextOffset = {
      x: dragState.startOffset.x + (e.clientX - dragState.startX),
      y: dragState.startOffset.y + (e.clientY - dragState.startY),
    };

    setAvatarEditor((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        offset: clampOffset(
          nextOffset,
          prev.scale,
          prev.imageWidth,
          prev.imageHeight,
        ),
      };
    });
  };

  const handleAvatarPointerUp = (e) => {
    if (dragState?.pointerId === e.pointerId) {
      setDragState(null);
    }
  };

  const handleAvatarSave = async () => {
    if (!avatarEditor || !editorImageRef.current) return;

    setAvatarUploading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_EDITOR.outputSize;
      canvas.height = AVATAR_EDITOR.outputSize;

      const context = canvas.getContext('2d');
      const sourceX = (AVATAR_MASK_OFFSET - avatarEditor.offset.x) / avatarEditor.scale;
      const sourceY = (AVATAR_MASK_OFFSET - avatarEditor.offset.y) / avatarEditor.scale;
      const sourceSize = AVATAR_MASK_SIZE / avatarEditor.scale;

      context.drawImage(
        editorImageRef.current,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        AVATAR_EDITOR.outputSize,
        AVATAR_EDITOR.outputSize,
      );

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
            return;
          }

          reject(new Error('AVATAR_BLOB_FAILED'));
        }, 'image/png');
      });

      const form = new FormData();
      form.append('avatar', blob, 'avatar.png');

      await client.post('/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await refetch();
      closeAvatarEditor();
      msg('avatar', t('profile:saved'));
    } catch (err) {
      const code = err.response?.data?.error?.code;
      msg('avatar', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    } finally {
      setAvatarUploading(false);
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
                <Upload size={14} /> {t('profile:upload')}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarSelect} />
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
              <Save size={14} /> {me?.emailVerified ? t('profile:save') : t('profile:resend')}
            </button>
          </div>
          {!me?.emailVerified && (
            <p style={{ fontSize: 12, marginTop: 4, color: '#f87171' }}>
              {t('profile:emailNotVerified')}
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
              <span style={{ fontSize: 'min(14px, 1.8vh)' }}>{t('profile:publicProfile')}</span>
              <input type="checkbox" checked={publicProfile} onChange={(e) => setPublicProfile(e.target.checked)} style={{ width: 16, height: 16 }} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 'min(40px, 5vh)' }}>
              <span style={{ fontSize: 'min(14px, 1.8vh)' }}>{t('profile:chatEnabled')}</span>
              <input type="checkbox" checked={chatEnabled} onChange={(e) => setChatEnabled(e.target.checked)} style={{ width: 16, height: 16 }} />
            </label>

            <button onClick={handleProfile} style={{ height: 'min(40px, 5vh)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 'min(14px, 1.8vh)' }}>
              <Save size={14} /> {t('profile:save')}
            </button>
            {messages.profile && <p style={{ fontSize: 12, textAlign: 'center', color: messages.profile.type === 'error' ? '#f87171' : '#4ade80' }}>{messages.profile.text}</p>}
          </div>
        </div>
      </div>

      {avatarEditor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: 'min(720px, 100%)',
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 18,
              padding: 20,
              display: 'grid',
              gap: 18,
            }}
          >
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>
                {t('profile:avatarEditor.title')}
              </h2>
              <p style={{ marginTop: 6, fontSize: 14 }}>
                {t('profile:avatarEditor.subtitle')}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(140px, 180px)',
                gap: 20,
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'grid', gap: 12 }}>
                <div
                  onPointerDown={handleAvatarPointerDown}
                  onPointerMove={handleAvatarPointerMove}
                  onPointerUp={handleAvatarPointerUp}
                  onPointerCancel={handleAvatarPointerUp}
                  style={{
                    width: '100%',
                    maxWidth: AVATAR_EDITOR.cropSize,
                    aspectRatio: '1 / 1',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 24,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                    border: '1px solid hsl(var(--border))',
                    cursor: dragState ? 'grabbing' : 'grab',
                    touchAction: 'none',
                  }}
                >
                  <canvas
                    ref={editorCanvasRef}
                    aria-label="Avatar crop preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      borderRadius: 24,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8, maxWidth: AVATAR_EDITOR.cropSize }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                    <span>{t('profile:avatarEditor.zoom')}</span>
                    <span>{zoomPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={400}
                    step={1}
                    value={zoomPercent}
                    onChange={(e) => handleAvatarZoomPercent(Number(e.target.value))}
                    style={{
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      height: 24,
                      accentColor: 'hsl(var(--primary))',
                    }}
                  />
                  <p style={{ fontSize: 12, marginBottom: 0 }}>
                    {t('profile:avatarEditor.hint')}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div
                  style={{
                    background: 'hsl(var(--muted))',
                    borderRadius: 16,
                    padding: 14,
                    border: '1px solid hsl(var(--border))',
                    display: 'grid',
                    gap: 12,
                    justifyItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                    {t('profile:avatarEditor.preview')}
                  </span>
                  <canvas
                    ref={previewCanvasRef}
                    aria-label="Avatar preview"
                    style={{
                      width: AVATAR_EDITOR.previewSize,
                      height: AVATAR_EDITOR.previewSize,
                      display: 'block',
                      borderRadius: '50%',
                      background: '#222',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarUploading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    background: 'hsl(var(--muted))',
                  }}
                >
                  <Upload size={14} />
                  {t('profile:avatarEditor.change')}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={closeAvatarEditor}
                disabled={avatarUploading}
                style={{
                  background: 'hsl(var(--muted))',
                  color: 'hsl(var(--foreground))',
                }}
              >
                {t('profile:avatarEditor.cancel')}
              </button>
              <button type="button" onClick={handleAvatarSave} disabled={avatarUploading}>
                <Save size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                {avatarUploading
                  ? t('profile:avatarEditor.saving')
                  : t('profile:avatarEditor.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
