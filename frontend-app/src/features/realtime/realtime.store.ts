import { create } from 'zustand';

interface RealtimeState {
  websocketLive: boolean;
  setWebsocketLive: (live: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  websocketLive: true,
  setWebsocketLive: (live) => set({ websocketLive: live }),
}));
