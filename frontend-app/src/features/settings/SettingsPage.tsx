import { useRef, useState, type KeyboardEvent } from 'react';
import type { JSX } from 'react';
import {
  PositionSecuritySection,
  type PositionSecuritySectionHandle,
} from '@/features/settings/components/PositionSecuritySection';
import {
  RiskManagementSection,
  type RiskManagementSectionHandle,
} from '@/features/settings/components/RiskManagementSection';
import {
  TPStrategySection,
  type TPStrategySectionHandle,
} from '@/features/settings/components/TPStrategySection';

export function SettingsPage(): JSX.Element {
  const [symbolInput, setSymbolInput] = useState('');
  const [blockedSymbols, setBlockedSymbols] = useState<string[]>([]);
  const positionSecurityRef = useRef<PositionSecuritySectionHandle>(null);
  const riskManagementRef = useRef<RiskManagementSectionHandle>(null);
  const tpStrategyRef = useRef<TPStrategySectionHandle>(null);

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
        <RiskManagementSection ref={riskManagementRef} />

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

        <PositionSecuritySection ref={positionSecurityRef} />

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
            void Promise.all([
              positionSecurityRef.current?.save(),
              riskManagementRef.current?.save(),
              tpStrategyRef.current?.save(),
            ]);
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
