import { create } from 'zustand';
import type { CanonicalPage } from '@/app/routes';

const AUTH_STORAGE_KEY = 'tradinghub_auth';

interface ShellUser {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription: {
    plan: string;
    status: string;
  };
  token: string;
}

interface AppShellState {
  currentPage: CanonicalPage;
  loginVisible: boolean;
  user: ShellUser | null;
  setCurrentPage: (page: CanonicalPage) => void;
  showLogin: () => void;
  hideLogin: () => void;
  setUser: (user: ShellUser | null) => void;
  initializeAuth: () => void;
  loginDevMode: (email: string, password: string) => Promise<{ success: boolean; user: ShellUser; token: string }>;
}

export const useAppShellStore = create<AppShellState>((set) => ({
  currentPage: 'dashboard',
  loginVisible: true,
  user: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  showLogin: () => set({ loginVisible: true }),
  hideLogin: () => set({ loginVisible: false }),
  setUser: (user) => set({ user }),
  initializeAuth: () => {
    try {
      const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);

      if (!saved) {
        set({ user: null, loginVisible: true });
        return;
      }

      const data = JSON.parse(saved) as { user?: Omit<ShellUser, 'token'>; token?: string };

      if (data.user && data.token) {
        set({
          user: {
            ...data.user,
            token: data.token,
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
  loginDevMode: async (email, _password) => {
    const user = {
      id: `dev_${Date.now()}`,
      email,
      name: email.split('@')[0] || email,
      role: 'admin',
      subscription: {
        plan: 'pro',
        status: 'active',
      },
    };
    const token = `dev_token_${Date.now()}`;

    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user,
        token,
      }),
    );

    set({
      user: {
        ...user,
        token,
      },
      loginVisible: false,
    });

    return {
      success: true,
      user: {
        ...user,
        token,
      },
      token,
    };
  },
}));
