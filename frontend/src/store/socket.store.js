import { create } from 'zustand';

export const useSocketStore = create((set) => ({
  socket: null,
  connected: false,
  setSocket: (socket) => set({ socket }),
  setConnected: (connected) => set({ connected }),
  clear: () => set({ socket: null, connected: false }),
}));
