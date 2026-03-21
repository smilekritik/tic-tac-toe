import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const errorCode = err.response?.data?.error?.code;
    const shouldSkipRefresh = [
      'INVALID_CREDENTIALS',
      'EMAIL_VERIFICATION_EXPIRED',
    ].includes(errorCode);

    if (err.response?.status === 401 && !original._retry && !shouldSkipRefresh) {
      original._retry = true;
      try {
        const { data } = await axios.get('/api/auth/refresh', { withCredentials: true });
        useAuthStore.getState().setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(original);
      } catch {
        useAuthStore.getState().clear();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(err);
  }
);

export default client;
