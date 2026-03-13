import { useRef, useState, type KeyboardEvent } from 'react';
import type { JSX } from 'react';
import {
  TPStrategySection,
  type TPStrategySectionHandle,
} from '@/features/settings/components/TPStrategySection';

export function SettingsPage(): JSX.Element {
  const [maxRisk, setMaxRisk] = useState('2');
  const [defaultLotSize, setDefaultLotSize] = useState('0.01');
  const [maxOpenPositions, setMaxOpenPositions] = useState('5');
  const [autoTrading, setAutoTrading] = useState(false);
  const [moveSlToBreakeven, setMoveSlToBreakeven] = useState(true);
  const [symbolInput, setSymbolInput] = useState('');
  const [blockedSymbols, setBlockedSymbols] = useState<string[]>([]);
  const [moveSlTransform, setMoveSlTransform] = useState<string | null>(null);
  const tpStrategyRef = useRef<TPStrategySectionHandle>(null);

  const toggleSwitchClassName = (active: boolean): string =>
    active
      ? 'relative w-12 h-6 rounded-full bg-blue-600 transition-colors'
      : 'relative w-12 h-6 rounded-full bg-gray-700 transition-colors';

  const circleStyle = (active: boolean): { transform: string } => ({
    transform: active ? 'translateX(24px)' : 'translateX(0)',
  });

  const handleAddBlockedSymbol = (): void => {
    const symbol = symbolInput.trim().toUpperCase();

    if (!symbol) {
      window.alert('Please enter a symbol');
      return;
    }

    if (blockedSymbols.includes(symbol)) {
      window.alert('Symbol already blocked');
      return;
    }

    setBlockedSymbols((current) => [...current, symbol]);
    setSymbolInput('');
  };

  const handleSymbolKeyPress = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddBlockedSymbol();
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-muted">Configure your trading preferences and signal sources</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card-dark rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Risk Management</h3>
          </div>
          <p className="text-sm text-gray-400 mb-6">Configure your trading risk parameters</p>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Default Lot Size</label>
                <span className="text-sm font-bold text-white">0.01</span>
              </div>
              <input type="number" value={defaultLotSize} step="0.01" onChange={(event) => setDefaultLotSize(event.target.value)} className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" />
              <p className="text-xs text-gray-500 mt-2">Standard lot size for new positions</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Max Risk per Trade (%)</label>
                <span className="text-sm font-bold text-blue-400">{maxRisk}%</span>
              </div>
              <input type="range" min="0.5" max="10" step="0.5" value={maxRisk} onChange={(event) => setMaxRisk(event.target.value)} className="slider w-full" />
              <p className="text-xs text-gray-500 mt-2">Maximum risk percentage per trade</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Max Open Positions</label>
                <span className="text-sm font-bold text-white">5</span>
              </div>
              <input type="number" value={maxOpenPositions} onChange={(event) => setMaxOpenPositions(event.target.value)} className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" />
              <p className="text-xs text-gray-500 mt-2">Maximum simultaneous open positions</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Auto Trading</label>
                <button onClick={() => setAutoTrading((current) => !current)} className={toggleSwitchClassName(autoTrading)}>
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={circleStyle(autoTrading)}></div>
                </button>
              </div>
              <p className="text-xs text-gray-500">Automatically execute signals</p>
            </div>
          </div>
        </div>

        <div className="card-dark rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Telegram Channels</h3>
            </div>
            <span className="text-sm font-semibold text-gray-400">0 of 0 active</span>
          </div>
          <p className="text-sm text-gray-400 mb-6">Manage signal source channels</p>

          <div className="mb-4">
            <div className="flex gap-2">
              <input type="text" placeholder="@channel_username" className="flex-1 px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" />
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-800 rounded-lg">
            <svg className="w-12 h-12 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500 text-center">No channels added yet</p>
            <p className="text-gray-600 text-sm">Add a Telegram channel to start receiving signals</p>
          </div>
        </div>

        <div className="card-dark rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Position Security</h3>
          </div>
          <p className="text-sm text-gray-400 mb-6">Configure automatic position protection settings</p>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Move SL to Breakeven</label>
                <button
                  onClick={() => {
                    if (moveSlToBreakeven) {
                      setMoveSlToBreakeven(false);
                      setMoveSlTransform('translateX(0)');
                    } else {
                      setMoveSlToBreakeven(true);
                      setMoveSlTransform('translateX(24px)');
                    }
                  }}
                  className={toggleSwitchClassName(moveSlToBreakeven)}
                >
                  <div
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                    style={moveSlTransform ? { transform: moveSlTransform } : undefined}
                  ></div>
                </button>
              </div>
              <p className="text-xs text-gray-500">Automatically move stop loss to entry price when target is reached</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">Secure Position After</label>
              <select className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                <option>After TP1 Hit</option>
                <option>After TP2 Hit</option>
                <option>After TP3 Hit</option>
                <option>Custom Pips</option>
              </select>
            </div>

            <div id="customPipsSection" className="hidden">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Custom Pips</label>
                <span className="text-sm font-bold text-white">20</span>
              </div>
              <input type="number" defaultValue="20" className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" />
              <p className="text-xs text-gray-500 mt-2">Move SL to breakeven after X pips in profit</p>
            </div>
          </div>
        </div>

        <TPStrategySection ref={tpStrategyRef} />

        <div className="card-dark rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Block Symbols</h3>
          </div>
          <p className="text-sm text-gray-400 mb-6">Block specific trading symbols from being traded</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Add Symbol to Block</label>
              <div className="flex gap-2">
                <input type="text" id="symbolInput" value={symbolInput} onChange={(event) => setSymbolInput(event.target.value)} onKeyPress={handleSymbolKeyPress} placeholder="XAUUSD" className="flex-1 px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none uppercase" />
                <button onClick={handleAddBlockedSymbol} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Block
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Blocked Symbols</label>
                <span className="text-xs text-gray-500" id="blockedCount">{blockedSymbols.length} blocked</span>
              </div>
              <div id="blockedSymbolsList" className="card-darker rounded-lg p-4">
                {blockedSymbols.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">No symbols blocked</p>
                ) : (
                  <>
                    {blockedSymbols.map((symbol) => (
                      <div key={symbol} className="flex items-center justify-between p-3 bg-black rounded-lg mb-2">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          <span className="text-white font-mono font-semibold">{symbol}</span>
                        </div>
                        <button onClick={() => setBlockedSymbols((current) => current.filter((item) => item !== symbol))} className="text-gray-400 hover:text-red-400 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            void tpStrategyRef.current?.save();
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Changes
        </button>
      </div>
    </>
  );
}
