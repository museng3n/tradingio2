import { SidebarNav } from '@/components/layout/SidebarNav';
import { ConnectionStatusPanel } from '@/components/layout/ConnectionStatusPanel';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoginModal } from '@/features/auth/LoginModal';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { PositionsPage } from '@/features/positions/PositionsPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { HistoryPage } from '@/features/history/HistoryPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { useAppShellStore } from '@/features/auth/auth.store';

export function AppShell(): JSX.Element {
  const currentPage = useAppShellStore((state) => state.currentPage);

  return (
    <>
      <div className="flex h-screen text-gray-100" data-app-shell="canonical-foundation">
        <aside className="w-64 bg-black border-r border-dark flex flex-col" data-canonical-region="sidebar">
          <div className="p-6 border-b border-dark" data-canonical-section="brand">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center" />
              <div>
                <div className="font-bold text-white">TradingHub</div>
                <div className="text-xs text-gray-500">Signal Manager</div>
              </div>
            </div>
          </div>
          <SidebarNav />
          <ConnectionStatusPanel />
        </aside>
        <main className="flex-1 overflow-auto" data-canonical-region="main-content">
          <PageContainer page="dashboard" visible={currentPage === 'dashboard'}>
            <DashboardPage />
          </PageContainer>
          <PageContainer page="positions" visible={currentPage === 'positions'}>
            <PositionsPage />
          </PageContainer>
          <PageContainer page="analytics" visible={currentPage === 'analytics'}>
            <AnalyticsPage />
          </PageContainer>
          <PageContainer page="history" visible={currentPage === 'history'}>
            <HistoryPage />
          </PageContainer>
          <PageContainer page="settings" visible={currentPage === 'settings'}>
            <SettingsPage />
          </PageContainer>
        </main>
      </div>
      <LoginModal />
    </>
  );
}
