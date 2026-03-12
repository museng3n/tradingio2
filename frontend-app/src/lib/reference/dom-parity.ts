export interface ParitySelector {
  canonicalId: string;
  description: string;
}

export const paritySelectors: readonly ParitySelector[] = [
  { canonicalId: 'nav-dashboard', description: 'Dashboard navigation item' },
  { canonicalId: 'nav-positions', description: 'Positions navigation item' },
  { canonicalId: 'nav-analytics', description: 'Analytics navigation item' },
  { canonicalId: 'nav-history', description: 'History navigation item' },
  { canonicalId: 'nav-settings', description: 'Settings navigation item' },
  { canonicalId: 'page-dashboard', description: 'Dashboard page container' },
  { canonicalId: 'page-positions', description: 'Positions page container' },
  { canonicalId: 'page-analytics', description: 'Analytics page container' },
  { canonicalId: 'page-history', description: 'History page container' },
  { canonicalId: 'page-settings', description: 'Settings page container' },
  { canonicalId: 'loginModal', description: 'Login modal container' },
];
