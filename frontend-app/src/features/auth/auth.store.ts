import { create } from 'zustand';
import type { CanonicalPage } from '@/app/routes';
import type { AuthenticatedUser, LoginSuccessResponse } from '@/features/auth/auth.api';

const AUTH_STORAGE_KEY = 'tradinghub_auth';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

interface AuthStorageValue {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

interface AppShellUser extends AuthenticatedUser {
  token: string;
}

interface AppShellState {
  currentPage: CanonicalPage;
  loginVisible: boolean;
  user: AppShellUser | null;
  setCurrentPage: (page: CanonicalPage) => void;
  showLogin: () => void;
  hideLogin: () => void;
  setUser: (user: AppShellUser | null) => void;
  setAuthSession: (session: AuthSession) => void;
  clearAuthSession: () => void;
  initializeAuth: () => void;
}

const persistAuthSession = (session: AuthStorageValue): void => {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const clearPersistedAuthSession = (): void => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const useAppShellStore = create<AppShellState>((set) => ({
  currentPage: 'dashboard',
  loginVisible: true,
  user: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  showLogin: () => set({ loginVisible: true }),
  hideLogin: () => set({ loginVisible: false }),
  setUser: (user) => set({ user }),
  setAuthSession: (session) => {
    persistAuthSession(session);
    set({
      user: {
        ...session.user,
        token: session.accessToken,
      },
      loginVisible: false,
    });
  },
  clearAuthSession: () => {
    clearPersistedAuthSession();
    set({
      user: null,
      loginVisible: true,
    });
  },
  initializeAuth: () => {
    try {
      const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);

      if (!saved) {
        set({ user: null, loginVisible: true });
        return;
      }

      const data = JSON.parse(saved) as Partial<AuthStorageValue>;

      if (data.user && data.accessToken && data.refreshToken) {
        set({
          user: {
            ...data.user,
            token: data.accessToken,
          },
          loginVisible: false,
        });
        return;
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }

    set({ user: null, loginVisible: true });
  },
}));
