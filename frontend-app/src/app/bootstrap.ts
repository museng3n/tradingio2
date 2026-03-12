import { QueryClient } from '@tanstack/react-query';
import { useAppShellStore } from '@/features/auth/auth.store';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export function bootstrapApp(): void {
  useAppShellStore.getState().initializeAuth();
}
