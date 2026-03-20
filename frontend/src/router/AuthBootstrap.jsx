import { useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

export default function AuthBootstrap({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (!hasHydrated || isInitialized) return undefined;

    let cancelled = false;

    const loadSession = async () => {
      let restoredFromAccessToken = false;

      const complete = () => {
        if (!cancelled) {
          setInitialized(true);
        }
      };

      try {
        if (accessToken) {
          const { data } = await axios.get('/api/me', {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!cancelled) {
            setAuth(accessToken, data);
          }

          restoredFromAccessToken = true;
          complete();
          return;
        }
      } catch {
        restoredFromAccessToken = false;
      }

      if (restoredFromAccessToken) {
        return;
      }

      try {
        const refreshResponse = await axios.get('/api/auth/refresh', {
          withCredentials: true,
        });
        const nextAccessToken = refreshResponse.data.accessToken;

        if (!cancelled) {
          setAccessToken(nextAccessToken);
        }

        const meResponse = await axios.get('/api/me', {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${nextAccessToken}`,
          },
        });

        if (!cancelled) {
          setAuth(nextAccessToken, meResponse.data);
        }
      } catch {
        if (!cancelled) {
          clear();
        }
      } finally {
        complete();
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    clear,
    hasHydrated,
    isInitialized,
    setAccessToken,
    setAuth,
    setInitialized,
  ]);

  if (!hasHydrated || !isInitialized) {
    return <div className="loading">Loading...</div>;
  }

  return children;
}
