export interface CanonicalApiContract {
  readonly path: string;
  readonly method: 'GET' | 'POST';
}

export const canonicalApiContracts: readonly CanonicalApiContract[] = [
  { path: '/dashboard/stats', method: 'GET' },
  { path: '/positions/open', method: 'GET' },
  { path: '/positions/history', method: 'GET' },
  { path: '/positions/close', method: 'POST' },
  { path: '/signals/recent', method: 'GET' },
  { path: '/signals/history', method: 'GET' },
  { path: '/analytics/performance', method: 'GET' },
  { path: '/analytics/profit', method: 'GET' },
  { path: '/channels/list', method: 'GET' },
  { path: '/channels/toggle', method: 'POST' },
  { path: '/settings', method: 'GET' },
  { path: '/settings/update', method: 'POST' },
  { path: '/ea/test-connection', method: 'GET' },
  { path: '/ea/status', method: 'GET' },
];
