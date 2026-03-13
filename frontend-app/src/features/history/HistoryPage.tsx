import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { JSX } from 'react';
import { useAppShellStore } from '@/features/auth/auth.store';
import { getSecuredSignalsHistory } from '@/features/history/history.api';

type HistoryTab = 'secured' | 'bugs';

const formatHistoryDateTime = (value: string): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '-';
  }

  if (Math.abs(value) >= 1000) {
    return value.toFixed(2);
  }

  return value.toFixed(5);
};

const formatPipsToBreakeven = (value: number | null): string =>
  value === null ? '-' : String(value);

export function HistoryPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<HistoryTab>('secured');
  const user = useAppShellStore((state) => state.user);
  const { data, isLoading, error } = useQuery({
    queryKey: ['secured-signals-history', user?.id],
    queryFn: getSecuredSignalsHistory,
    enabled: user !== null,
  });

  const securedSignals = error ? [] : (data?.positions ?? []);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">History</h1>
        <p className="text-muted">Track secured positions and signal issues</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            setActiveTab('secured');
          }}
          id="hist-tab-secured"
          className={activeTab === 'secured' ? 'px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 font-medium' : 'px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 font-medium'}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Secured Signals
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab('bugs');
          }}
          id="hist-tab-bugs"
          className={activeTab === 'bugs' ? 'px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 font-medium' : 'px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 font-medium'}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Signal Bugs
          </span>
        </button>
      </div>

      <div id="hist-content-secured" className={`card-dark rounded-lg p-6${activeTab === 'secured' ? '' : ' hidden'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-white">Secured Signals</h3>
          </div>
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                <th className="pb-3 font-medium">Time Secured</th>
                <th className="pb-3 font-medium">Symbol</th>
                <th className="pb-3 font-medium">Direction</th>
                <th className="pb-3 font-medium">Entry</th>
                <th className="pb-3 font-medium">Secured At</th>
                <th className="pb-3 font-medium">Pips to BE</th>
                <th className="pb-3 font-medium">Reason</th>
              </tr>
            </thead>
            {securedSignals.length > 0 ? (
              <tbody>
                {securedSignals.map((position) => (
                  <tr key={position.id} className="border-b border-gray-800/70 text-sm text-gray-300">
                    <td className="py-4">{formatHistoryDateTime(position.timeSecured)}</td>
                    <td className="py-4 font-medium text-white">{position.symbol}</td>
                    <td className={`py-4 font-medium ${position.direction === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                      {position.direction}
                    </td>
                    <td className="py-4">{formatPrice(position.entry)}</td>
                    <td className="py-4">{formatPrice(position.securedAt)}</td>
                    <td className="py-4">{formatPipsToBreakeven(position.pipsToBE)}</td>
                    <td className="py-4">{position.reason}</td>
                  </tr>
                ))}
              </tbody>
            ) : null}
          </table>
          {!isLoading && !error && securedSignals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <p className="text-gray-500 text-center">No secured signals yet</p>
              <p className="text-gray-600 text-sm">Positions moved to breakeven will appear here</p>
            </div>
          ) : null}
        </div>
      </div>

      <div id="hist-content-bugs" className={`card-dark rounded-lg p-6${activeTab === 'bugs' ? '' : ' hidden'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-white">Signal Bugs</h3>
          </div>
          <p className="text-sm text-gray-500">Issues that prevented signal execution</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Symbol</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Entry Price</th>
                <th className="pb-3 font-medium">Market Price</th>
                <th className="pb-3 font-medium">Issue</th>
              </tr>
            </thead>
          </table>
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 text-center">No signal bugs recorded</p>
            <p className="text-gray-600 text-sm">Failed signals will be tracked here</p>
          </div>
        </div>
      </div>
    </>
  );
}
