import { useMemo, useState, type KeyboardEvent } from 'react';
import type { JSX } from 'react';

type TpMode = 'template' | 'strategy' | 'opentp';
type StrategyMode = 'equal' | 'weighted' | 'custom';
type OpenTPScenario = 'with_fixed' | 'only_open';

interface TpInput {
  id: number;
  value: string;
}

export function SettingsPage(): JSX.Element {
  const [maxRisk, setMaxRisk] = useState('2');
  const [defaultLotSize, setDefaultLotSize] = useState('0.01');
  const [maxOpenPositions, setMaxOpenPositions] = useState('5');
  const [autoTrading, setAutoTrading] = useState(false);
  const [moveSlToBreakeven, setMoveSlToBreakeven] = useState(true);
  const [tpMode, setTpMode] = useState<TpMode>('template');
  const [strategyMode, setStrategyMode] = useState<StrategyMode>('equal');
  const [openTPScenario, setOpenTPScenario] = useState<OpenTPScenario>('with_fixed');
  const [tpInputs, setTpInputs] = useState<TpInput[]>([
    { id: 1, value: '40' },
    { id: 2, value: '35' },
    { id: 3, value: '25' },
  ]);
  const [tpCounter, setTpCounter] = useState(3);
  const [tpSummaryTouched, setTpSummaryTouched] = useState(false);
  const [tpSummaryValues, setTpSummaryValues] = useState<TpInput[]>([
    { id: 1, value: '40' },
    { id: 2, value: '35' },
    { id: 3, value: '25' },
  ]);
  const [symbolInput, setSymbolInput] = useState('');
  const [blockedSymbols, setBlockedSymbols] = useState<string[]>([]);

  const totalPercentage = useMemo(() => tpSummaryValues.reduce((total, input) => total + (parseFloat(input.value) || 0), 0), [tpSummaryValues]);
  const totalPercentageClassName = !tpSummaryTouched ? 'text-white font-bold' : totalPercentage === 100 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold';

  const toggleSwitchClassName = (active: boolean): string =>
    active ? 'relative w-12 h-6 rounded-full bg-blue-600 transition-colors' : 'relative w-12 h-6 rounded-full bg-gray-700 transition-colors';

  const circleStyle = (active: boolean): { transform: string } => ({
    transform: active ? 'translateX(24px)' : 'translateX(0)',
  });
  const [moveSlTransform, setMoveSlTransform] = useState<string | null>(null);

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

  const handleEditTemplate = (tpCount: number): void => {
    window.alert(`Edit ${tpCount} TPs Template - This will open a modal to edit percentages`);
  };

  const handleAddNewTemplate = (): void => {
    window.alert('Add New Template - This will open a modal to create a custom template for 7+ TPs');
  };

  const handleAddTP = (): void => {
    const nextId = tpCounter + 1;
    setTpCounter(nextId);
    setTpSummaryTouched(true);
    setTpInputs((current) => [...current, { id: nextId, value: '0' }]);
    setTpSummaryValues((current) => [...current, { id: nextId, value: '0' }]);
  };

  const handleRemoveTP = (tpNum: number): void => {
    setTpInputs((current) => {
      if (current.length <= 1) {
        return current;
      }

      setTpSummaryTouched(true);
      return current.filter((input) => input.id !== tpNum);
    });
    setTpSummaryValues((current) => current.filter((input) => input.id !== tpNum));
  };

  const handleCommitTPSummary = (): void => {
    setTpSummaryTouched(true);
    setTpSummaryValues(tpInputs);
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

        <div className="card-dark rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Take Profit Strategy</h3>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => setTpMode('template')} id="btn-tp-template" className={tpMode === 'template' ? 'px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium' : 'px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 font-medium'}>Template Based</button>
              <button onClick={() => setTpMode('strategy')} id="btn-tp-strategy" className={tpMode === 'strategy' ? 'px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium' : 'px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 font-medium'}>Strategy Based</button>
              <button onClick={() => setTpMode('opentp')} id="btn-tp-opentp" className={tpMode === 'opentp' ? 'px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium' : 'px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 font-medium'}>Open TP Handler</button>
            </div>
          </div>

          <div id="template-based-mode" className={tpMode === 'template' ? '' : 'hidden'}>
            <p className="text-sm text-gray-400 mb-6">Configure templates for different TP counts - system will auto-apply the correct template based on signal</p>

            <div className="space-y-4">
              <div className="card-darker rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500" />
                    <h4 className="font-semibold text-white">2 TPs Template</h4>
                  </div>
                  <button onClick={() => handleEditTemplate(2)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Edit</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">TP1</div><div className="text-lg font-bold text-white">50%</div></div>
                  <div className="bg-black rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">TP2</div><div className="text-lg font-bold text-white">50%</div></div>
                </div>
              </div>

              <div className="card-darker rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500" />
                    <h4 className="font-semibold text-white">3 TPs Template</h4>
                  </div>
                  <button onClick={() => handleEditTemplate(3)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Edit</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-black rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">TP1</div><div className="text-lg font-bold text-white">33%</div></div>
                  <div className="bg-black rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">TP2</div><div className="text-lg font-bold text-white">33%</div></div>
                  <div className="bg-black rounded-lg p-3"><div className="text-xs text-gray-500 mb-1">TP3</div><div className="text-lg font-bold text-white">34%</div></div>
                </div>
              </div>

              <div className="card-darker rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500" />
                    <h4 className="font-semibold text-white">4 TPs Template</h4>
                  </div>
                  <button onClick={() => handleEditTemplate(4)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Edit</button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP1</div><div className="text-sm font-bold text-white">25%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP2</div><div className="text-sm font-bold text-white">25%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP3</div><div className="text-sm font-bold text-white">25%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP4</div><div className="text-sm font-bold text-white">25%</div></div>
                </div>
              </div>

              <div className="card-darker rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500" />
                    <h4 className="font-semibold text-white">5 TPs Template</h4>
                  </div>
                  <button onClick={() => handleEditTemplate(5)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Edit</button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP1</div><div className="text-sm font-bold text-white">20%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP2</div><div className="text-sm font-bold text-white">20%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP3</div><div className="text-sm font-bold text-white">20%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP4</div><div className="text-sm font-bold text-white">20%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP5</div><div className="text-sm font-bold text-white">20%</div></div>
                </div>
              </div>

              <div className="card-darker rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500" />
                    <h4 className="font-semibold text-white">6 TPs Template</h4>
                  </div>
                  <button onClick={() => handleEditTemplate(6)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Edit</button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP1</div><div className="text-xs font-bold text-white">20%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP2</div><div className="text-xs font-bold text-white">20%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP3</div><div className="text-xs font-bold text-white">20%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP4</div><div className="text-xs font-bold text-white">15%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP5</div><div className="text-xs font-bold text-white">15%</div></div>
                  <div className="bg-black rounded-lg p-2"><div className="text-xs text-gray-500 mb-1">TP6</div><div className="text-xs font-bold text-white">10%</div></div>
                </div>
              </div>

              <button onClick={handleAddNewTemplate} className="w-full card-darker rounded-lg p-4 border-2 border-dashed border-gray-700 hover:border-blue-500 transition-colors">
                <div className="flex items-center justify-center gap-2 text-gray-400 hover:text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium">Add New Template (7+ TPs)</span>
                </div>
              </button>
            </div>
          </div>

          <div id="strategy-based-mode" className={tpMode === 'strategy' ? '' : 'hidden'}>
            <p className="text-sm text-gray-400 mb-6">Apply same strategy to all signals regardless of TP count</p>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-3 block">Distribution Strategy</label>
                <select id="tpStrategy" value={strategyMode} onChange={(event) => setStrategyMode(event.target.value as StrategyMode)} className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                  <option value="equal">Equal Division</option>
                  <option value="weighted">Weighted (More at TP1)</option>
                  <option value="custom">Custom Percentages</option>
                </select>
              </div>

              <div id="equalInfo" className={strategyMode === 'equal' ? 'card-darker rounded-lg p-4' : 'card-darker rounded-lg p-4 hidden'}>
                <p className="text-sm text-gray-400">Lot size will be divided equally across all take profit levels</p>
                <div className="mt-3 text-xs text-gray-500">
                  <div className="flex justify-between mb-1"><span>TP1:</span><span className="text-white">33.33%</span></div>
                  <div className="flex justify-between mb-1"><span>TP2:</span><span className="text-white">33.33%</span></div>
                  <div className="flex justify-between"><span>TP3:</span><span className="text-white">33.34%</span></div>
                </div>
              </div>

              <div id="weightedInfo" className={strategyMode === 'weighted' ? 'card-darker rounded-lg p-4' : 'card-darker rounded-lg p-4 hidden'}>
                <p className="text-sm text-gray-400 mb-3">More position closed at earlier targets</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm text-gray-300">TP1</span><span className="text-sm font-bold text-blue-400">50%</span></div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: '50%' }}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm text-gray-300">TP2</span><span className="text-sm font-bold text-blue-400">30%</span></div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: '30%' }}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm text-gray-300">TP3</span><span className="text-sm font-bold text-blue-400">20%</span></div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: '20%' }}></div></div>
                  </div>
                </div>
              </div>

              <div id="customInfo" className={strategyMode === 'custom' ? '' : 'hidden'}>
                <div id="tpInputsContainer" className="space-y-3">
                  {tpInputs.map((input, index) => (
                    <div key={input.id} className="tp-input-group">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-300 flex-1">TP{input.id} Percentage (%)</label>
                        <button onClick={() => handleRemoveTP(input.id)} className={index === 0 ? 'w-7 h-7 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center opacity-50 cursor-not-allowed' : 'w-7 h-7 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center'} disabled={index === 0}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                          </svg>
                        </button>
                      </div>
                      <input
                        type="number"
                        id={`tp${input.id}-percent`}
                        value={input.value}
                        min="0"
                        max="100"
                        onChange={(event) => {
                          const value = event.target.value;
                          setTpInputs((current) => current.map((item) => (item.id === input.id ? { ...item, value } : item)));
                        }}
                        onBlur={handleCommitTPSummary}
                        className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none mt-2"
                      />
                    </div>
                  ))}
                </div>

                <button onClick={handleAddTP} className="w-full mt-3 px-4 py-2 rounded-lg border-2 border-dashed border-gray-700 hover:border-blue-500 text-gray-400 hover:text-blue-400 font-medium flex items-center justify-center gap-2 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add TP</span>
                </button>

                <div className="card-darker rounded-lg p-3 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total TPs:</span>
                    <span className="text-white font-bold" id="totalTPsCount">{tpInputs.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-400">Total Percentage:</span>
                    <span className={totalPercentageClassName} id="totalPercentage">{totalPercentage}%</span>
                  </div>
                </div>

                <p className="text-xs text-yellow-500 mt-3">Note: Percentages must add up to 100%</p>
              </div>
            </div>
          </div>

          <div id="opentp-mode" className={tpMode === 'opentp' ? '' : 'hidden'}>
            <p className="text-sm text-gray-400 mb-6">Configure how to handle open (unlimited) take profit targets</p>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-3 block">Signal Type</label>
                <select id="openTPScenario" value={openTPScenario} onChange={(event) => setOpenTPScenario(event.target.value as OpenTPScenario)} className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                  <option value="with_fixed">Open TP + Fixed TPs (TP1, TP2, ... + Open)</option>
                  <option value="only_open">Only Open TP (No fixed targets)</option>
                </select>
              </div>

              <div id="opentp-with-fixed" className={openTPScenario === 'with_fixed' ? 'card-darker rounded-lg p-6' : 'card-darker rounded-lg p-6 hidden'}>
                <h4 className="text-white font-semibold mb-4">Open TP Configuration</h4>
                <p className="text-sm text-gray-400 mb-6">When open TP is combined with fixed targets, configure action at specified pips</p>

                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-300 mb-3 block">Action Type</label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="openTPAction" value="reminder" defaultChecked className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                      <div>
                        <div className="text-white font-medium">Reminder</div>
                        <div className="text-xs text-gray-500">Send notification when price reaches X pips</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="openTPAction" value="autoclose" className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                      <div>
                        <div className="text-white font-medium">Auto Close</div>
                        <div className="text-xs text-gray-500">Automatically close position at X pips</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-3 block">Target Pips</label>
                  <input type="number" id="openTPPipsInput" defaultValue="50" min="10" step="5" className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="Enter pips (e.g. 100, 500, 1000)" />
                  <p className="text-xs text-gray-500 mt-2">Enter any value (e.g., 50, 100, 500, 1000+ pips)</p>
                </div>

                <div className="card-dark rounded-lg p-4 mt-6">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-gray-300">
                      <div className="font-semibold mb-1">Position Security applies normally</div>
                      <div className="text-gray-400">Your security settings (move SL to breakeven) will still apply to fixed TPs</div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="opentp-only-open" className={openTPScenario === 'only_open' ? 'card-darker rounded-lg p-6' : 'card-darker rounded-lg p-6 hidden'}>
                <h4 className="text-white font-semibold mb-4">Single Open TP Configuration</h4>
                <p className="text-sm text-gray-400 mb-6">When signal has only one open TP with no fixed targets</p>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Security at (pips)</label>
                    <p className="text-xs text-gray-500 mb-3">Move SL to breakeven when profit reaches</p>
                    <input type="number" id="openTPSecurityInput" defaultValue="30" min="10" step="5" className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="Enter pips" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Close at (pips)</label>
                    <p className="text-xs text-gray-500 mb-3">Close entire position when profit reaches</p>
                    <input type="number" id="openTPCloseInput" defaultValue="80" min="20" step="10" className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="Enter pips" />
                  </div>

                  <div className="card-dark rounded-lg p-4">
                    <div className="flex gap-2">
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm">
                        <div className="font-semibold text-white mb-1">Example</div>
                        <div className="text-gray-400">{'Entry: 2500 \u2192 At 2530 (+30 pips): Move SL to 2500 \u2192 At 2580 (+80 pips): Close position'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-yellow-500">Note: Close pips must be greater than security pips</div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Changes
        </button>
      </div>
    </>
  );
}
