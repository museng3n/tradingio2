import { create } from 'zustand';

interface RealtimeState {
  websocketLive: boolean;
  setWebsocketLive: (live: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  websocketLive: false,
  setWebsocketLive: (live) => set({ websocketLive: live }),
}));
