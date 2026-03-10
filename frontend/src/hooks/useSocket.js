import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import { useSocketStore } from '../store/socket.store';

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { socket, setSocket, setConnected, clear } = useSocketStore();

  useEffect(() => {
    if (!accessToken) {
      socket?.disconnect();
      clear();
      return;
    }

    if (socket?.connected) return;

    const newSocket = io('/', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[socket] connect error:', err.message);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      clear();
    };
  }, [accessToken]);

  return useSocketStore((s) => s.socket);
}
