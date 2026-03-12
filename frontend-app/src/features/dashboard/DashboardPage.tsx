import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { getDashboardStats } from '@/features/dashboard/dashboard.api';
import { useAppShellStore } from '@/features/auth/auth.store';

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function DashboardPage(): JSX.Element {
  const user = useAppShellStore((state) => state.user);
  const { data } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: getDashboardStats,
    enabled: user !== null,
  });

  const stats = data?.data;
  const balanceValue = stats ? formatCurrency(stats.account.balance) : '$10,000.00';
  const equityValue = stats ? formatCurrency(stats.account.equity) : '$10,000.00';
  const dailyProfitValue = stats ? formatCurrency(stats.performance.todayProfit) : '$0.00';
  const openPositionsValue = stats ? String(stats.positions.open) : '0';

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-muted">Real-time overview of your trading activity</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card-dark rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-medium">BALANCE</span>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div id="balance-value" className="text-2xl font-bold text-white">{balanceValue}</div>
          <div className="text-green-400 text-sm mt-1">+10.00% today</div>
        </div>

        <div className="card-dark rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-medium">EQUITY</span>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div id="equity-value" className="text-2xl font-bold text-white">{equityValue}</div>
          <div className="text-green-400 text-sm mt-1">+10.00% today</div>
        </div>

        <div className="card-dark rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-medium">OPEN P&amp;L</span>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div id="open-pl-value" className="text-2xl font-bold text-white">$0.00</div>
          <div className="text-gray-400 text-sm mt-1">+0.00%</div>
        </div>

        <div className="card-dark rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-medium">OPEN POSITIONS</span>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          <div id="open-positions-value" className="text-2xl font-bold text-white">{openPositionsValue}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card-dark rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-medium">DAILY P&amp;L</span>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div id="daily-pl-value" className="text-2xl font-bold text-white">{dailyProfitValue}</div>
          <div className="text-green-400 text-sm mt-1">+0.00%</div>
        </div>

        <div className="card-dark rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-medium">WEEKLY P&amp;L</span>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div id="weekly-pl-value" className="text-2xl font-bold text-white">$0.00</div>
        </div>

        <div className="card-dark rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-medium">MONTHLY P&amp;L</span>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div id="monthly-pl-value" className="text-2xl font-bold text-white">$0.00</div>
        </div>

        <div className="card-dark rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-medium">MARGIN LEVEL</span>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div id="margin-level-value" className="text-2xl font-bold text-white">0.0%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card-dark rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Live Trade Feed</h3>
            </div>
            <span className="text-sm text-gray-400">0 signals</span>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-gray-500 text-center mb-2">No signals received yet</p>
            <p className="text-gray-600 text-sm">Connect Telegram channels to start receiving signals</p>
          </div>
        </div>

        <div className="card-dark rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Symbol Exposure</h3>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
            <p className="text-gray-500 text-center mb-2">No exposure data</p>
            <p className="text-gray-600 text-sm">Open positions to see exposure breakdown</p>
          </div>
        </div>
      </div>
    </>
  );
}
