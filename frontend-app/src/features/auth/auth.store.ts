import { create } from 'zustand';
import type { CanonicalPage } from '@/app/routes';

interface ShellUser {
  email: string;
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
}

export const useAppShellStore = create<AppShellState>((set) => ({
  currentPage: 'dashboard',
  loginVisible: true,
  user: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  showLogin: () => set({ loginVisible: true }),
  hideLogin: () => set({ loginVisible: false }),
  setUser: (user) => set({ user }),
}));
