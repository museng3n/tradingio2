import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { JSX } from 'react';
import { useAppShellStore } from '@/features/auth/auth.store';
import { getOpenPositions, type OpenPosition } from '@/features/positions/positions.api';
import { ApiError } from '@/lib/api/client';

type PositionsTab = 'open' | 'pending';

const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '-';
  }

  if (Math.abs(value) >= 1000) {
    return value.toFixed(2);
  }

  return value.toFixed(5);
};

const formatLots = (value: number): string => value.toFixed(2);

const formatCurrency = (value: number): string => {
  const sign = value > 0 ? '+' : '';

  return `${sign}${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
};

const getPipSize = (symbol: string): number => (symbol.includes('JPY') ? 0.01 : 0.0001);

const calculatePips = (position: OpenPosition): number => {
  const priceDiff = position.type === 'BUY'
    ? position.currentPrice - position.entryPrice
    : position.entryPrice - position.currentPrice;

  return priceDiff / getPipSize(position.symbol);
};

const formatPips = (position: OpenPosition): string => {
  const pips = calculatePips(position);
  const sign = pips > 0 ? '+' : '';

  return `${sign}${pips.toFixed(1)}`;
};

const formatTakeProfits = (takeProfits: OpenPosition['tps']): string => {
  if (takeProfits.length === 0) {
    return '-';
  }

  return takeProfits.map((takeProfit) => formatPrice(takeProfit.price)).join(' / ');
};

export function PositionsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<PositionsTab>('open');
  const user = useAppShellStore((state) => state.user);
  const { data, isLoading, error } = useQuery({
    queryKey: ['open-positions', user?.id],
    queryFn: getOpenPositions,
    enabled: user !== null,
  });

  const openPositions = data?.data ?? [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Positions</h1>
        <p className="text-muted">Manage your open positions and pending signals</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            setActiveTab('open');
          }}
          id="tab-open"
          className={activeTab === 'open' ? 'px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 font-medium' : 'px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 font-medium'}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Open Positions
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab('pending');
          }}
          id="tab-pending"
          className={activeTab === 'pending' ? 'px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 font-medium' : 'px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 font-medium'}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending Signals
          </span>
        </button>
      </div>

      <div id="content-open" className={`card-dark rounded-lg p-6${activeTab === 'open' ? '' : ' hidden'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Open Positions</h3>
          </div>
          <span className="text-sm font-semibold text-gray-400">{openPositions.length} active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                <th className="pb-3 font-medium">Symbol</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Entry</th>
                <th className="pb-3 font-medium">Current</th>
                <th className="pb-3 font-medium">Pips</th>
                <th className="pb-3 font-medium">Lots</th>
                <th className="pb-3 font-medium">TPs</th>
                <th className="pb-3 font-medium">SL</th>
                <th className="pb-3 font-medium">P&amp;L</th>
              </tr>
            </thead>
            {openPositions.length > 0 ? (
              <tbody>
                {openPositions.map((position) => {
                  const profitLossClassName = position.profitLoss >= 0 ? 'text-green-400' : 'text-red-400';
                  const typeClassName = position.type === 'BUY' ? 'text-green-400' : 'text-red-400';

                  return (
                    <tr key={position._id} className="border-b border-gray-800/70 text-sm text-gray-300">
                      <td className="py-4 font-medium text-white">{position.symbol}</td>
                      <td className={`py-4 font-medium ${typeClassName}`}>{position.type}</td>
                      <td className="py-4">{formatPrice(position.entryPrice)}</td>
                      <td className="py-4">{formatPrice(position.currentPrice)}</td>
                      <td className={`py-4 ${profitLossClassName}`}>{formatPips(position)}</td>
                      <td className="py-4">{formatLots(position.lotSize)}</td>
                      <td className="py-4">{formatTakeProfits(position.tps)}</td>
                      <td className="py-4">{formatPrice(position.sl)}</td>
                      <td className={`py-4 font-medium ${profitLossClassName}`}>{formatCurrency(position.profitLoss)}</td>
                    </tr>
                  );
                })}
              </tbody>
            ) : null}
          </table>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              <p className="text-gray-500 text-center">Loading open positions...</p>
            </div>
          ) : null}
          {!isLoading && error instanceof ApiError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-gray-500 text-center">Unable to load open positions</p>
              <p className="text-gray-600 text-sm">{error.message}</p>
            </div>
          ) : null}
          {!isLoading && !error && openPositions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-gray-500 text-center">No open positions</p>
              <p className="text-gray-600 text-sm">Positions will appear here when signals are executed</p>
            </div>
          ) : null}
        </div>
      </div>

      <div id="content-pending" className={`card-dark rounded-lg p-6${activeTab === 'pending' ? '' : ' hidden'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Pending Signals</h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 text-center">No pending signals</p>
        </div>
      </div>
    </>
  );
}
