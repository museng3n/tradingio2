import { CANONICAL_PAGES, type CanonicalPage } from '@/app/routes';
import { CANONICAL_NAV_IDS } from '@/app/canonical-mapping';
import { useAppShellStore } from '@/features/auth/auth.store';

const PAGE_LABELS: Record<CanonicalPage, string> = {
  dashboard: 'Dashboard',
  positions: 'Positions',
  analytics: 'Analytics',
  history: 'History',
  settings: 'Settings',
};

export function SidebarNav(): JSX.Element {
  const currentPage = useAppShellStore((state) => state.currentPage);
  const setCurrentPage = useAppShellStore((state) => state.setCurrentPage);

  return (
    <nav className="flex-1 p-4 overflow-y-auto" data-canonical-section="navigation">
      <div className="text-xs font-semibold text-gray-500 mb-3">NAVIGATION</div>
      {CANONICAL_PAGES.map((page) => {
        const active = currentPage === page;
        const activeClasses = 'bg-blue-600/10 text-blue-500';
        const inactiveClasses = 'text-gray-400 hover:bg-gray-800';

        return (
          <a
            key={page}
            href="#"
            id={CANONICAL_NAV_IDS[page]}
            className={`nav-link flex items-center gap-3 px-3 py-2 rounded-lg mb-1 ${active ? activeClasses : inactiveClasses}`}
            onClick={(event) => {
              event.preventDefault();
              setCurrentPage(page);
            }}
          >
            <span className="font-medium">{PAGE_LABELS[page]}</span>
          </a>
        );
      })}
    </nav>
  );
}
