import { CANONICAL_PAGES, type CanonicalPage } from '@/app/routes';
import { CANONICAL_NAV_IDS } from '@/app/canonical-mapping';
import { useAppShellStore } from '@/features/auth/auth.store';

interface NavItem {
  page: CanonicalPage;
  label: string;
  icon: JSX.Element;
  className: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    page: 'dashboard',
    label: 'Dashboard',
    className: 'nav-link flex items-center gap-3 px-3 py-2 rounded-lg mb-1',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
  },
  {
    page: 'positions',
    label: 'Positions',
    className: 'nav-link flex items-center gap-3 px-3 py-2 rounded-lg mb-1',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    page: 'analytics',
    label: 'Analytics',
    className: 'nav-link flex items-center gap-3 px-3 py-2 rounded-lg mb-1',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    page: 'history',
    label: 'History',
    className: 'nav-link flex items-center gap-3 px-3 py-2 rounded-lg mb-1',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    page: 'settings',
    label: 'Settings',
    className: 'nav-link flex items-center gap-3 px-3 py-2 rounded-lg',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function SidebarNav(): JSX.Element {
  const currentPage = useAppShellStore((state) => state.currentPage);
  const setCurrentPage = useAppShellStore((state) => state.setCurrentPage);

  return (
    <nav className="flex-1 p-4 overflow-y-auto">
      <div className="text-xs font-semibold text-gray-500 mb-3">NAVIGATION</div>
      {CANONICAL_PAGES.map((page) => {
        const item = NAV_ITEMS.find((navItem) => navItem.page === page);

        if (!item) {
          return null;
        }

        return (
          <a
            key={page}
            href="#"
            id={CANONICAL_NAV_IDS[page]}
            className={`${item.className} ${currentPage === page ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:bg-gray-800'}`}
            onClick={(event) => {
              event.preventDefault();
              setCurrentPage(page);
            }}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
