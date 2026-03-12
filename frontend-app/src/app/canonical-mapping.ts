import type { CanonicalPage } from '@/app/routes';

export const CANONICAL_PAGE_IDS: Record<CanonicalPage, string> = {
  dashboard: 'page-dashboard',
  positions: 'page-positions',
  analytics: 'page-analytics',
  history: 'page-history',
  settings: 'page-settings',
};

export const CANONICAL_NAV_IDS: Record<CanonicalPage, string> = {
  dashboard: 'nav-dashboard',
  positions: 'nav-positions',
  analytics: 'nav-analytics',
  history: 'nav-history',
  settings: 'nav-settings',
};
