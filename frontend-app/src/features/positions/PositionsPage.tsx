import { useState } from 'react';

type PositionsTab = 'open' | 'pending';

export function PositionsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<PositionsTab>('open');

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
          <span className="text-sm font-semibold text-gray-400">0 active</span>
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
          </table>
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
