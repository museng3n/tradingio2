export interface CompatibilityNote {
  canonicalEndpoint: string;
  currentBackendEquivalent?: string;
  status: 'unmapped' | 'mapped' | 'needs-review';
}

export const compatibilityNotes: CompatibilityNote[] = [
  { canonicalEndpoint: '/dashboard/stats', status: 'unmapped' },
  { canonicalEndpoint: '/positions/open', status: 'unmapped' },
  { canonicalEndpoint: '/signals/recent', status: 'unmapped' },
  { canonicalEndpoint: '/history/trades', status: 'unmapped' },
  { canonicalEndpoint: '/analytics/performance', status: 'unmapped' },
  { canonicalEndpoint: '/channels/list', status: 'unmapped' },
  { canonicalEndpoint: '/settings', status: 'unmapped' },
  { canonicalEndpoint: '/settings/update', status: 'unmapped' },
  { canonicalEndpoint: '/ea/test-connection', status: 'unmapped' },
  { canonicalEndpoint: '/ea/status', status: 'unmapped' },
];
