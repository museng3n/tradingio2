export const CANONICAL_PAGES = [
  'dashboard',
  'positions',
  'analytics',
  'history',
  'settings',
] as const;

export type CanonicalPage = (typeof CANONICAL_PAGES)[number];
