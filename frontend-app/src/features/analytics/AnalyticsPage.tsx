import { useState } from 'react';

type TpFilterKey = 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'tp6';

export function AnalyticsPage(): JSX.Element {
  const [filters, setFilters] = useState<Record<TpFilterKey, boolean>>({
    tp1: true,
    tp2: true,
    tp3: true,
    tp4: false,
    tp5: false,
    tp6: false,
  });

  const getFilterClassName = (filter: TpFilterKey): string => {
    if (filters[filter]) {
      return 'px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border-2 border-blue-600 text-sm font-medium';
    }

    return 'px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 border-2 border-gray-700 text-sm font-medium';
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-muted">Detailed trading statistics and performance metrics</p>
      </div>

      <div className="card-dark rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-white">Trading Statistics</h3>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              TOTAL TRADES
            </div>
            <div className="text-3xl font-bold text-white mb-1">0</div>
            <div className="text-sm text-gray-500">0W / 0L</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              WIN RATE
            </div>
            <div className="text-3xl font-bold text-white">0.00%</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              PROFIT FACTOR
            </div>
            <div className="text-3xl font-bold text-white">0.00</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AVG RISK/REWARD
            </div>
            <div className="text-3xl font-bold text-white">0.00</div>
          </div>
        </div>
      </div>

      <div className="card-dark rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-white">Profit &amp; Loss</h3>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              NET PROFIT
            </div>
            <div className="text-3xl font-bold text-green-400">+$0.00</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              TOTAL PROFIT
            </div>
            <div className="text-3xl font-bold text-green-400">+$0.00</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              TOTAL LOSS
            </div>
            <div className="text-3xl font-bold text-red-400">+$0.00</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              SHARPE RATIO
            </div>
            <div className="text-3xl font-bold text-white">0.00</div>
          </div>
        </div>
      </div>

      <div className="card-dark rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-white">Best &amp; Worst</h3>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              LARGEST WIN
            </div>
            <div className="text-3xl font-bold text-green-400">+$0.00</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              LARGEST LOSS
            </div>
            <div className="text-3xl font-bold text-red-400">+$0.00</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              MAX DRAWDOWN
            </div>
            <div className="text-3xl font-bold text-white">0.00%</div>
            <div className="text-sm text-gray-500">+$0.00</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AVG HOLD TIME
            </div>
            <div className="text-3xl font-bold text-white">N/A</div>
          </div>
        </div>
      </div>

      <div className="card-dark rounded-lg p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-white">TP Achievement Statistics</h3>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm font-medium text-gray-400 mb-3">Filter TPs:</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilters((current) => ({ ...current, tp1: !current.tp1 }))} id="filter-tp1" className={getFilterClassName('tp1')}>TP1</button>
            <button onClick={() => setFilters((current) => ({ ...current, tp2: !current.tp2 }))} id="filter-tp2" className={getFilterClassName('tp2')}>TP2</button>
            <button onClick={() => setFilters((current) => ({ ...current, tp3: !current.tp3 }))} id="filter-tp3" className={getFilterClassName('tp3')}>TP3</button>
            <button onClick={() => setFilters((current) => ({ ...current, tp4: !current.tp4 }))} id="filter-tp4" className={getFilterClassName('tp4')}>TP4</button>
            <button onClick={() => setFilters((current) => ({ ...current, tp5: !current.tp5 }))} id="filter-tp5" className={getFilterClassName('tp5')}>TP5</button>
            <button onClick={() => setFilters((current) => ({ ...current, tp6: !current.tp6 }))} id="filter-tp6" className={getFilterClassName('tp6')}>TP6</button>
          </div>
        </div>

        <div className="card-darker rounded-lg p-6 mb-6">
          <div className="relative" style={{ height: '300px' }}>
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-3">
              <div>TP6</div>
              <div>TP5</div>
              <div>TP4</div>
              <div>TP3</div>
              <div>TP2</div>
              <div>TP1</div>
            </div>

            <div className="ml-12 h-full border-l-2 border-b-2 border-gray-700 relative">
              <div className="absolute inset-0 flex flex-col justify-between">
                <div className="border-b border-gray-800"></div>
                <div className="border-b border-gray-800"></div>
                <div className="border-b border-gray-800"></div>
                <div className="border-b border-gray-800"></div>
                <div className="border-b border-gray-800"></div>
                <div className="border-b border-gray-800"></div>
              </div>

              <svg className={`absolute inset-0 w-full h-full${filters.tp1 ? '' : ' hidden'}`} id="tp1-line">
                <polyline points="50,250 100,245 150,240 200,235 250,230" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="250" r="4" fill="#3b82f6" />
                <circle cx="100" cy="245" r="4" fill="#3b82f6" />
                <circle cx="150" cy="240" r="4" fill="#3b82f6" />
                <circle cx="200" cy="235" r="4" fill="#3b82f6" />
                <circle cx="250" cy="230" r="4" fill="#3b82f6" />
              </svg>

              <svg className={`absolute inset-0 w-full h-full${filters.tp2 ? '' : ' hidden'}`} id="tp2-line">
                <polyline points="50,200 100,195 150,190 200,185 250,180" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="200" r="4" fill="#10b981" />
                <circle cx="100" cy="195" r="4" fill="#10b981" />
                <circle cx="150" cy="190" r="4" fill="#10b981" />
                <circle cx="200" cy="185" r="4" fill="#10b981" />
                <circle cx="250" cy="180" r="4" fill="#10b981" />
              </svg>

              <svg className={`absolute inset-0 w-full h-full${filters.tp3 ? '' : ' hidden'}`} id="tp3-line">
                <polyline points="50,150 100,145 150,140 200,135" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="150" r="4" fill="#f59e0b" />
                <circle cx="100" cy="145" r="4" fill="#f59e0b" />
                <circle cx="150" cy="140" r="4" fill="#f59e0b" />
                <circle cx="200" cy="135" r="4" fill="#f59e0b" />
              </svg>

              <svg className={`absolute inset-0 w-full h-full${filters.tp4 ? '' : ' hidden'}`} id="tp4-line">
                <polyline points="50,100 100,95 150,90" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="100" r="4" fill="#8b5cf6" />
                <circle cx="100" cy="95" r="4" fill="#8b5cf6" />
                <circle cx="150" cy="90" r="4" fill="#8b5cf6" />
              </svg>

              <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-gray-500 px-2">
                <div>0</div>
                <div>20</div>
                <div>40</div>
                <div>60</div>
                <div>80</div>
                <div>100</div>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 mt-8">Pips from Entry</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card-darker rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-gray-300">TP1 Hit</span>
              </div>
              <span className="text-sm font-bold text-green-400">98%</span>
            </div>
            <div className="text-2xl font-bold text-white">245 trades</div>
            <div className="text-xs text-gray-500 mt-1">Average: 15.2 pips</div>
          </div>

          <div className="card-darker rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-300">TP2 Hit</span>
              </div>
              <span className="text-sm font-bold text-green-400">79%</span>
            </div>
            <div className="text-2xl font-bold text-white">198 trades</div>
            <div className="text-xs text-gray-500 mt-1">Average: 28.5 pips</div>
          </div>

          <div className="card-darker rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium text-gray-300">TP3 Hit</span>
              </div>
              <span className="text-sm font-bold text-yellow-400">57%</span>
            </div>
            <div className="text-2xl font-bold text-white">142 trades</div>
            <div className="text-xs text-gray-500 mt-1">Average: 42.8 pips</div>
          </div>

          <div className="card-darker rounded-lg p-4 opacity-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-sm font-medium text-gray-300">TP4 Hit</span>
              </div>
              <span className="text-sm font-bold text-gray-400">36%</span>
            </div>
            <div className="text-2xl font-bold text-white">89 trades</div>
            <div className="text-xs text-gray-500 mt-1">Average: 58.3 pips</div>
          </div>
        </div>
      </div>
    </>
  );
}
