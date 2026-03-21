import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, Mail, Save, Trash2, Upload } from 'lucide-react';
import { useMe } from '../hooks/useMe';
import { useAuthStore } from '../store/auth.store';
import client from '../api/client';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import FlagIcon from '../components/FlagIcon';
import {
  AVATAR_EDITOR,
  AVATAR_MASK_OFFSET,
  AVATAR_MASK_SIZE,
} from '../components/avatarEditor.constants';

const USERNAME_RE = /^[A-Za-z0-9_-]+$/;

const cardStyle = {
  background: 'hsl(var(--card))',
  borderRadius: 12,
  padding: 'min(20px, 2.5vh)',
  border: '1px solid hsl(var(--border))',
};

const sectionLabelStyle = {
  fontSize: 'min(12px, 1.5vh)',
  fontWeight: 600,
  marginBottom: 'min(12px, 1.5vh)',
  color: 'hsl(var(--muted-foreground))',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const inputStyle = {
  width: '100%',
  height: 'min(44px, 5.4vh)',
  fontSize: 'min(14px, 1.8vh)',
};

const helperTextStyle = {
  fontSize: 12,
  lineHeight: 1.5,
  color: 'hsl(var(--muted-foreground))',
};

const baseButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 'min(40px, 5vh)',
  padding: '0 16px',
  borderRadius: 8,
  fontSize: 'min(14px, 1.8vh)',
};

const secondaryButtonStyle = {
  ...baseButtonStyle,
  background: 'hsl(var(--muted))',
  color: 'hsl(var(--foreground))',
};

const primaryButtonStyle = {
  ...baseButtonStyle,
  width: '100%',
};

const dangerButtonStyle = {
  ...baseButtonStyle,
  width: '100%',
  background: 'rgba(239, 68, 68, 0.14)',
  color: '#fca5a5',
  border: '1px solid rgba(239, 68, 68, 0.35)',
};

const badgeBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
};

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function maskEmailAddress(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '***';
  }

  const [localPart, domain] = email.split('@');
  const safeLocal =
    localPart.length <= 2
      ? `${localPart[0] || '*'}***`
      : `${localPart.slice(0, 2)}***${localPart.slice(-1)}`;

  return `${safeLocal}@${domain}`;
}

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

function getUsernameClientError(username, t) {
  const trimmed = typeof username === 'string' ? username.trim() : '';

  if (!trimmed) return t('profile:usernameErrors.required');
  if (trimmed.length < 3 || trimmed.length > 24) return t('profile:usernameErrors.length');
  if (/\s/.test(trimmed)) return t('profile:usernameErrors.spaces');
  if (!USERNAME_RE.test(trimmed)) return t('profile:usernameErrors.characters');

  return '';
}

function getPasswordClientError(password, t) {
  if (!password) return t('profile:passwordErrors.required');
  if (password.length < 8) return t('profile:passwordErrors.length');
  if (password.length > 72) return t('profile:passwordErrors.maxLength');
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return t('profile:passwordErrors.format');
  }

  return '';
}

function formatVerificationTimeLeft(deadlineAt, locale) {
  if (!deadlineAt) return null;

  const timeLeftMs = new Date(deadlineAt).getTime() - Date.now();
  if (timeLeftMs <= 0) return null;

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const days = Math.floor(timeLeftMs / (24 * 60 * 60 * 1000));
  if (days >= 1) return rtf.format(days, 'day');

  const hours = Math.max(1, Math.ceil(timeLeftMs / (60 * 60 * 1000)));
  return rtf.format(hours, 'hour');
}

export default function ProfilePage() {
  const { me, loading, refetch } = useMe();
  const { t, i18n } = useTranslation(['profile', 'errors', 'common']);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clear);
  const accessToken = useAuthStore((s) => s.accessToken);
  const fileRef = useRef();
  const editorCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const editorImageRef = useRef(null);
  const usernameCheckTimeoutRef = useRef(null);

  const [form, setForm] = useState({
    username: '',
    email: '',
    preferredLanguage: 'en',
    chatEnabledDefault: true,
    publicProfileEnabled: true,
  });
  const [initialForm, setInitialForm] = useState(null);
  const [messages, setMessages] = useState({});
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({
    state: 'idle',
    message: '',
  });
  const [avatarEditor, setAvatarEditor] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [dragState, setDragState] = useState(null);

  const setMessage = (key, text, type = 'success') => {
    setMessages((prev) => ({ ...prev, [key]: { text, type } }));
  };

  useEffect(() => {
    if (!me) return;

    const nextForm = {
      username: me.username || '',
      email: me.email || '',
      preferredLanguage: me.profile?.preferredLanguage || 'en',
      chatEnabledDefault: me.profile?.chatEnabledDefault ?? true,
      publicProfileEnabled: me.profile?.publicProfileEnabled ?? true,
    };

    setForm(nextForm);
    setInitialForm(nextForm);
    setIsEditingEmail(false);
    setUsernameStatus({ state: 'idle', message: '' });
  }, [me]);

  useEffect(() => {
    return () => {
      if (avatarEditor?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarEditor.src);
      }

      if (usernameCheckTimeoutRef.current) {
        window.clearTimeout(usernameCheckTimeoutRef.current);
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

    const previewRatio = AVATAR_EDITOR.previewSize / AVATAR_MASK_SIZE;

    drawCanvas(previewCanvasRef.current, AVATAR_EDITOR.previewSize, (context) => {
      context.fillStyle = '#222';
      context.fillRect(0, 0, AVATAR_EDITOR.previewSize, AVATAR_EDITOR.previewSize);
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
  }, [avatarEditor]);

  const normalizedUsername = normalizeUsername(form.username);
  const normalizedEmail = normalizeEmail(form.email);
  const initialUsername = initialForm ? normalizeUsername(initialForm.username) : '';
  const initialEmail = initialForm ? normalizeEmail(initialForm.email) : '';
  const usernameChanged = Boolean(initialForm) && normalizedUsername !== initialUsername;
  const emailChanged = Boolean(initialForm) && isEditingEmail && normalizedEmail !== initialEmail;
  const languageChanged =
    Boolean(initialForm) && form.preferredLanguage !== initialForm.preferredLanguage;
  const chatChanged =
    Boolean(initialForm) && form.chatEnabledDefault !== initialForm.chatEnabledDefault;
  const publicProfileChanged =
    Boolean(initialForm) && form.publicProfileEnabled !== initialForm.publicProfileEnabled;
  const generalDirty =
    usernameChanged ||
    emailChanged ||
    languageChanged ||
    chatChanged ||
    publicProfileChanged;
  const zoomPercent = avatarEditor
    ? Math.round((avatarEditor.scale / avatarEditor.baseScale) * 100)
    : 100;
  const usernameClientError = getUsernameClientError(form.username, t);
  const passwordClientError = getPasswordClientError(passwordForm.newPassword, t);
  const passwordMismatch =
    passwordForm.confirmPassword &&
    passwordForm.newPassword !== passwordForm.confirmPassword;
  const verificationTimeLeft = formatVerificationTimeLeft(
    me?.emailVerificationDeadlineAt,
    i18n.language,
  );

  useEffect(() => {
    if (!initialForm) return undefined;

    if (!usernameChanged) {
      setUsernameStatus({ state: 'idle', message: '' });
      return undefined;
    }

    if (usernameClientError) {
      setUsernameStatus({ state: 'invalid', message: usernameClientError });
      return undefined;
    }

    setUsernameStatus({ state: 'checking', message: t('profile:usernameStatus.checking') });

    usernameCheckTimeoutRef.current = window.setTimeout(async () => {
      try {
        const { data } = await client.get('/me/username-availability', {
          params: { username: form.username },
        });

        setUsernameStatus({
          state: data.available ? 'available' : 'taken',
          message: data.available
            ? t('profile:usernameStatus.available')
            : t('profile:usernameStatus.taken'),
        });
      } catch (err) {
        const code = err.response?.data?.error?.code;
        setUsernameStatus({
          state: 'invalid',
          message:
            err.response?.data?.error?.message ||
            t(`errors:${code || 'SOMETHING_WRONG'}`),
        });
      }
    }, 650);

    return () => {
      if (usernameCheckTimeoutRef.current) {
        window.clearTimeout(usernameCheckTimeoutRef.current);
      }
    };
  }, [form.username, initialForm, t, usernameChanged, usernameClientError]);

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const updatePasswordForm = (patch) =>
    setPasswordForm((prev) => ({ ...prev, ...patch }));

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
            imageWidth: image.naturalWidth,
            imageHeight: image.naturalHeight,
            baseScale: minScale,
            minScale: minScale * 0.5,
            maxScale: minScale * 4,
            scale: minScale,
            offset: getCenteredOffset(
              image.naturalWidth,
              image.naturalHeight,
              minScale,
            ),
          };
        });
      };

      image.onerror = () => {
        URL.revokeObjectURL(src);
        setMessage('avatar', t('errors:SOMETHING_WRONG'), 'error');
      };

      image.src = src;
    } catch {
      setMessage('avatar', t('errors:SOMETHING_WRONG'), 'error');
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
        offset: clampOffset(nextOffset, prev.scale, prev.imageWidth, prev.imageHeight),
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

      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.png');

      await client.post('/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await refetch();
      closeAvatarEditor();
      setMessage('avatar', t('profile:saved'));
    } catch (err) {
      const code = err.response?.data?.error?.code;
      setMessage('avatar', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await client.post('/auth/resend-verification');
      setMessage('general', t('profile:verificationEmailSent'));
    } catch (err) {
      const code = err.response?.data?.error?.code;
      setMessage('general', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    } finally {
      setResendingVerification(false);
    }
  };

  const ensureUsernameAvailability = async () => {
    if (!usernameChanged) return true;

    if (usernameClientError) {
      setUsernameStatus({ state: 'invalid', message: usernameClientError });
      return false;
    }

    setUsernameStatus({ state: 'checking', message: t('profile:usernameStatus.checking') });

    try {
      const { data } = await client.get('/me/username-availability', {
        params: { username: form.username },
      });

      if (!data.available) {
        setUsernameStatus({
          state: 'taken',
          message: t('profile:usernameStatus.taken'),
        });
        return false;
      }

      setUsernameStatus({
        state: 'available',
        message: t('profile:usernameStatus.available'),
      });
      return true;
    } catch (err) {
      const code = err.response?.data?.error?.code;
      setUsernameStatus({
        state: 'invalid',
        message:
          err.response?.data?.error?.message ||
          t(`errors:${code || 'SOMETHING_WRONG'}`),
      });
      return false;
    }
  };

  const handleGeneralSave = async () => {
    if (!generalDirty || !initialForm) return;

    const usernameAvailable = await ensureUsernameAvailability();
    if (!usernameAvailable) return;

    const payload = {};
    if (usernameChanged) payload.username = normalizedUsername;
    if (emailChanged) payload.email = normalizedEmail;
    if (languageChanged) payload.preferredLanguage = form.preferredLanguage;
    if (chatChanged) payload.chatEnabledDefault = form.chatEnabledDefault;
    if (publicProfileChanged) payload.publicProfileEnabled = form.publicProfileEnabled;

    setGeneralSaving(true);

    try {
      const { data } = await client.patch('/me/settings', payload);

      setAuth(accessToken, {
        id: data.id,
        username: data.username,
        role: data.role,
      });

      await i18n.changeLanguage(data.profile?.preferredLanguage || form.preferredLanguage);
      await refetch();

      setMessage(
        'general',
        emailChanged
          ? t('profile:settingsSavedWithEmailChange')
          : t('profile:saved'),
      );

      if (emailChanged) {
        setIsEditingEmail(false);
      }
    } catch (err) {
      const code = err.response?.data?.error?.code;
      setMessage('general', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    } finally {
      setGeneralSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordForm.currentPassword) {
      setMessage('password', t('profile:passwordErrors.currentRequired'), 'error');
      return;
    }

    if (passwordClientError) {
      setMessage('password', passwordClientError, 'error');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setMessage('password', t('profile:passwordErrors.sameAsCurrent'), 'error');
      return;
    }

    if (passwordMismatch) {
      setMessage('password', t('profile:passwordErrors.mismatch'), 'error');
      return;
    }

    setPasswordSaving(true);

    try {
      await client.patch('/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      await client.post('/auth/logout');
      clearAuth();
      window.location.href = '/auth/login';
    } catch (err) {
      const code = err.response?.data?.error?.code;
      setMessage('password', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setMessage('danger', t('profile:danger.passwordRequired'), 'error');
      return;
    }

    if (!window.confirm(t('profile:danger.confirmDelete'))) {
      return;
    }

    setDeleteSubmitting(true);

    try {
      await client.delete('/me', {
        data: { password: deletePassword },
      });
      clearAuth();
      window.location.href = '/';
    } catch (err) {
      const code = err.response?.data?.error?.code;
      setMessage('danger', t(`errors:${code || 'SOMETHING_WRONG'}`), 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (loading || !me || !initialForm) {
    return <div className="loading">{t('common:loading')}</div>;
  }

  const langs = [
    { code: 'en' },
    { code: 'uk' },
    { code: 'pl' },
  ];

  const usernameTone =
    usernameStatus.state === 'invalid' || usernameStatus.state === 'taken'
      ? '#f87171'
      : usernameStatus.state === 'available'
        ? '#4ade80'
        : 'hsl(var(--muted-foreground))';

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'min(16px, 2vh)' }}>
        <h1 style={{ fontSize: 'min(24px, 3vh)', fontWeight: 700 }}>
          {t('profile:title')}
        </h1>

        <div style={cardStyle}>
          <h2 style={sectionLabelStyle}>{t('profile:avatar')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar src={me.profile?.avatarPath} size="min(72px, 9vh)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={secondaryButtonStyle}
              >
                <Upload size={14} />
                {t('profile:upload')}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarSelect}
              />
              {messages.avatar && (
                <p
                  style={{
                    fontSize: 12,
                    color: messages.avatar.type === 'error' ? '#f87171' : '#4ade80',
                  }}
                >
                  {messages.avatar.text}
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, display: 'grid', gap: 'min(18px, 2.2vh)' }}>
          <div>
            <h2 style={sectionLabelStyle}>{t('profile:account')}</h2>
            <p style={helperTextStyle}>{t('profile:accountSubtitle')}</p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="username" style={{ fontSize: 13, fontWeight: 600 }}>
              {t('profile:username')}
            </label>
            <input
              id="username"
              value={form.username}
              onChange={(e) => updateForm({ username: e.target.value })}
              style={inputStyle}
              autoComplete="off"
              spellCheck={false}
            />
            <div style={{ display: 'grid', gap: 4 }}>
              <p style={helperTextStyle}>{t('profile:usernameHint')}</p>
              {usernameStatus.message && (
                <p style={{ ...helperTextStyle, color: usernameTone }}>
                  {usernameStatus.message}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600 }}>
                {t('profile:email')}
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isEditingEmail) {
                    updateForm({ email: initialForm.email });
                  }
                  setIsEditingEmail((prev) => !prev);
                }}
                style={secondaryButtonStyle}
              >
                {isEditingEmail ? (
                  <>
                    <EyeOff size={14} />
                    {t('profile:cancelEmailEdit')}
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    {t('profile:changeEmail')}
                  </>
                )}
              </button>
            </div>

            {isEditingEmail ? (
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateForm({ email: e.target.value })}
                style={inputStyle}
                autoComplete="email"
              />
            ) : (
              <div
                style={{
                  ...inputStyle,
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 14px',
                  color: 'hsl(var(--muted-foreground))',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {maskEmailAddress(me.email)}
              </div>
            )}

            <div style={{ display: 'grid', gap: 8 }}>
              {!me.emailVerified && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      ...badgeBaseStyle,
                      background: 'rgba(250, 204, 21, 0.14)',
                      color: '#facc15',
                    }}
                  >
                    <Mail size={14} />
                    {t('profile:pendingVerification')}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    style={secondaryButtonStyle}
                  >
                    {t('profile:resend')}
                  </button>
                </div>
              )}

              <p style={helperTextStyle}>
                {isEditingEmail
                  ? t('profile:emailEditHint')
                  : t('profile:emailMaskedHint')}
              </p>

              {!me.emailVerified && verificationTimeLeft && (
                <p style={{ ...helperTextStyle, color: '#fca5a5' }}>
                  {t('profile:emailAutoDeletionNotice', {
                    timeLeft: verificationTimeLeft,
                  })}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              {t('profile:language')}
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {langs.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => updateForm({ preferredLanguage: lang.code })}
                  style={{
                    ...secondaryButtonStyle,
                    border: `1px solid ${
                      form.preferredLanguage === lang.code
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--border))'
                    }`,
                    color:
                      form.preferredLanguage === lang.code
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--muted-foreground))',
                    background:
                      form.preferredLanguage === lang.code
                        ? 'rgba(129, 140, 248, 0.1)'
                        : 'transparent',
                  }}
                >
                  <FlagIcon code={lang.code} size={18} />
                  <span>{t(`common:language.${lang.code}`)}</span>
                </button>
              ))}
            </div>
          </div>

          <label
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 'min(14px, 1.8vh)', fontWeight: 600 }}>
                {t('profile:publicProfile')}
              </span>
              <span style={helperTextStyle}>{t('profile:publicProfileHint')}</span>
            </div>
            <input
              type="checkbox"
              checked={form.publicProfileEnabled}
              onChange={(e) => updateForm({ publicProfileEnabled: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
          </label>

          <label
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 'min(14px, 1.8vh)', fontWeight: 600 }}>
                {t('profile:chatEnabled')}
              </span>
              <span style={helperTextStyle}>{t('profile:chatEnabledHint')}</span>
            </div>
            <input
              type="checkbox"
              checked={form.chatEnabledDefault}
              onChange={(e) => updateForm({ chatEnabledDefault: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
          </label>

          <div style={{ display: 'grid', gap: 10 }}>
            <button
              type="button"
              onClick={handleGeneralSave}
              disabled={
                !generalDirty ||
                generalSaving ||
                usernameStatus.state === 'checking' ||
                usernameStatus.state === 'invalid' ||
                usernameStatus.state === 'taken'
              }
              style={primaryButtonStyle}
            >
              <Save size={14} />
              {generalSaving ? t('profile:savingChanges') : t('profile:saveChanges')}
            </button>
            {messages.general && (
              <p
                style={{
                  fontSize: 12,
                  textAlign: 'center',
                  color: messages.general.type === 'error' ? '#f87171' : '#4ade80',
                }}
              >
                {messages.general.text}
              </p>
            )}
          </div>
        </div>

        <div style={{ ...cardStyle, display: 'grid', gap: 'min(16px, 2vh)' }}>
          <div>
            <h2 style={sectionLabelStyle}>{t('profile:passwordSection')}</h2>
            <p style={helperTextStyle}>{t('profile:passwordSectionHint')}</p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="currentPassword" style={{ fontSize: 13, fontWeight: 600 }}>
              {t('profile:currentPassword')}
            </label>
            <input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => updatePasswordForm({ currentPassword: e.target.value })}
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="newPassword" style={{ fontSize: 13, fontWeight: 600 }}>
              {t('profile:newPassword')}
            </label>
            <input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => updatePasswordForm({ newPassword: e.target.value })}
              style={inputStyle}
              autoComplete="new-password"
            />
            <p style={helperTextStyle}>{t('profile:newPasswordHint')}</p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="confirmPassword" style={{ fontSize: 13, fontWeight: 600 }}>
              {t('profile:confirmNewPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => updatePasswordForm({ confirmPassword: e.target.value })}
              style={inputStyle}
              autoComplete="new-password"
            />
          </div>

          <button
            type="button"
            onClick={handlePasswordSave}
            disabled={passwordSaving}
            style={primaryButtonStyle}
          >
            <Lock size={14} />
            {passwordSaving ? t('profile:changingPassword') : t('profile:changePassword')}
          </button>

          {messages.password && (
            <p
              style={{
                fontSize: 12,
                color: messages.password.type === 'error' ? '#f87171' : '#4ade80',
              }}
            >
              {messages.password.text}
            </p>
          )}
        </div>

        <div style={{ ...cardStyle, display: 'grid', gap: 'min(16px, 2vh)' }}>
          <div>
            <h2 style={{ ...sectionLabelStyle, color: '#fca5a5' }}>
              {t('profile:danger.title')}
            </h2>
            <p style={helperTextStyle}>{t('profile:danger.subtitle')}</p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="deletePassword" style={{ fontSize: 13, fontWeight: 600 }}>
              {t('profile:danger.passwordLabel')}
            </label>
            <input
              id="deletePassword"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>

          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteSubmitting}
            style={dangerButtonStyle}
          >
            <Trash2 size={14} />
            {deleteSubmitting
              ? t('profile:danger.deleting')
              : t('profile:danger.deleteAction')}
          </button>

          {messages.danger && (
            <p
              style={{
                fontSize: 12,
                color: messages.danger.type === 'error' ? '#f87171' : '#4ade80',
              }}
            >
              {messages.danger.text}
            </p>
          )}
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
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontSize: 13,
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  >
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
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  >
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
                  style={{ ...secondaryButtonStyle, width: '100%' }}
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
                style={secondaryButtonStyle}
              >
                {t('profile:avatarEditor.cancel')}
              </button>
              <button
                type="button"
                onClick={handleAvatarSave}
                disabled={avatarUploading}
                style={secondaryButtonStyle}
              >
                <Save size={14} />
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
