import { useMutation, useQuery } from '@tanstack/react-query';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { useAppShellStore } from '@/features/auth/auth.store';
import {
  getTPStrategySettings,
  updateTPStrategySettings,
  type OpenTPAction,
  type OpenTPScenario,
  type TPStrategyMode,
  type TPStrategySettingsRequest,
  type TPStrategySettingsResponse,
  type TPStrategyTemplate,
  type TPStrategyType,
} from '@/features/settings/settings.api';
import { ApiError } from '@/lib/api/client';

interface TpInput {
  id: number;
  value: string;
}

interface TPStrategyDraftState {
  mode: TPStrategyMode;
  templates: TPStrategyTemplate[];
  strategyType: TPStrategyType;
  customInputs: TpInput[];
  openTPScenario: OpenTPScenario;
  openTPAction: OpenTPAction;
  targetPips: string;
  securityPips: string;
  closePips: string;
}

export interface TPStrategySectionHandle {
  save: () => Promise<void>;
}

const buildCustomInputs = (percentages: number[]): TpInput[] =>
  percentages.length > 0
    ? percentages.map((value, index) => ({
        id: index + 1,
        value: String(value),
      }))
    : [
        { id: 1, value: '40' },
        { id: 2, value: '35' },
        { id: 3, value: '25' },
      ];

const toNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapResponseToDraft = (
  response: TPStrategySettingsResponse
): TPStrategyDraftState => ({
  mode: response.data.mode,
  templates: response.data.templates.map((template) => ({
    tpCount: template.tpCount,
    percentages: [...template.percentages],
    enabled: template.enabled,
  })),
  strategyType: response.data.strategyType,
  customInputs: buildCustomInputs(response.data.customPercentages),
  openTPScenario: response.data.openTPConfig.scenario,
  openTPAction: response.data.openTPConfig.action ?? 'reminder',
  targetPips:
    response.data.openTPConfig.targetPips === null
      ? '50'
      : String(response.data.openTPConfig.targetPips),
  securityPips:
    response.data.openTPConfig.securityPips === null
      ? '30'
      : String(response.data.openTPConfig.securityPips),
  closePips:
    response.data.openTPConfig.closePips === null
      ? '80'
      : String(response.data.openTPConfig.closePips),
});

const mapDraftToRequest = (
  draft: TPStrategyDraftState
): TPStrategySettingsRequest => ({
  mode: draft.mode,
  templates: draft.templates.map((template) => ({
    tpCount: template.tpCount,
    percentages: [...template.percentages],
    enabled: template.enabled,
  })),
  strategyType: draft.strategyType,
  customPercentages:
    draft.strategyType === 'custom'
      ? draft.customInputs.map((input) => toNumber(input.value))
      : [],
  openTPConfig:
    draft.openTPScenario === 'with_fixed'
      ? {
          scenario: 'with_fixed',
          action: draft.openTPAction,
          targetPips: toNumber(draft.targetPips),
        }
      : {
          scenario: 'only_open',
          securityPips: toNumber(draft.securityPips),
          closePips: toNumber(draft.closePips),
        },
});

const isEquivalentRequest = (
  left: TPStrategySettingsRequest,
  right: TPStrategySettingsRequest
): boolean => JSON.stringify(left) === JSON.stringify(right);

export const TPStrategySection = forwardRef<TPStrategySectionHandle, object>(
  function TPStrategySection(_props, ref): JSX.Element {
    const user = useAppShellStore((state) => state.user);
    const [draft, setDraft] = useState<TPStrategyDraftState | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [tpSummaryTouched, setTpSummaryTouched] = useState(false);

    const { data, isLoading, error } = useQuery({
      queryKey: ['settings', 'tp-strategy', user?.id],
      queryFn: getTPStrategySettings,
      enabled: user !== null,
    });

    const mutation = useMutation({
      mutationFn: updateTPStrategySettings,
      onSuccess: (response) => {
        setDraft(mapResponseToDraft(response));
        setSaveError(null);
        setTpSummaryTouched(false);
      },
      onError: (mutationError) => {
        if (mutationError instanceof ApiError) {
          setSaveError(mutationError.message);
          return;
        }

        setSaveError('Unable to save TP strategy settings');
      },
    });

    useEffect(() => {
      if (data) {
        setDraft(mapResponseToDraft(data));
        setSaveError(null);
        setTpSummaryTouched(false);
      }
    }, [data]);

    const requestDraft = useMemo(
      () => (draft ? mapDraftToRequest(draft) : null),
      [draft]
    );

    const loadedRequest = useMemo(
      () => (data ? mapDraftToRequest(mapResponseToDraft(data)) : null),
      [data]
    );

    const isDirty =
      requestDraft !== null &&
      loadedRequest !== null &&
      !isEquivalentRequest(requestDraft, loadedRequest);

    useImperativeHandle(
      ref,
      () => ({
        save: async () => {
          if (!requestDraft || !isDirty || mutation.isPending) {
            return;
          }

          await mutation.mutateAsync(requestDraft);
        },
      }),
      [isDirty, mutation, requestDraft]
    );

    const totalPercentage = useMemo(() => {
      if (!draft) {
        return 0;
      }

      return draft.customInputs.reduce(
        (total, input) => total + toNumber(input.value),
        0
      );
    }, [draft]);

    const totalPercentageClassName = !tpSummaryTouched
      ? 'text-white font-bold'
      : totalPercentage === 100
        ? 'text-green-400 font-bold'
        : 'text-yellow-400 font-bold';

    const templateMap = useMemo(() => {
      const templates = new Map<number, TPStrategyTemplate>();

      draft?.templates.forEach((template) => {
        templates.set(template.tpCount, template);
      });

      return templates;
    }, [draft]);

    const handleEditTemplate = (tpCount: number): void => {
      window.alert(
        `Edit ${tpCount} TPs Template - This will open a modal to edit percentages`
      );
    };

    const handleAddNewTemplate = (): void => {
      window.alert(
        'Add New Template - This will open a modal to create a custom template for 7+ TPs'
      );
    };

    const renderTemplateCard = (tpCount: number): JSX.Element | null => {
      const template = templateMap.get(tpCount);

      if (!template) {
        return null;
      }

      const gridClassName =
        tpCount === 2
          ? 'grid grid-cols-2 gap-3'
          : tpCount === 3
            ? 'grid grid-cols-3 gap-3'
            : tpCount === 4
              ? 'grid grid-cols-4 gap-2'
              : tpCount === 5
                ? 'grid grid-cols-5 gap-2'
                : 'grid grid-cols-6 gap-2';
      const cardPaddingClassName =
        tpCount <= 3 ? 'bg-black rounded-lg p-3' : 'bg-black rounded-lg p-2';
      const valueClassName =
        tpCount === 2 || tpCount === 3
          ? 'text-lg font-bold text-white'
          : tpCount === 4 || tpCount === 5
            ? 'text-sm font-bold text-white'
            : 'text-xs font-bold text-white';

      return (
        <div className="card-darker rounded-lg p-4" key={tpCount}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={template.enabled}
                onChange={(event) => {
                  setDraft((current) => {
                    if (!current) {
                      return current;
                    }

                    return {
                      ...current,
                      templates: current.templates.map((currentTemplate) =>
                        currentTemplate.tpCount === tpCount
                          ? { ...currentTemplate, enabled: event.target.checked }
                          : currentTemplate
                      ),
                    };
                  });
                }}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <h4 className="font-semibold text-white">{tpCount} TPs Template</h4>
            </div>
            <button
              onClick={() => {
                handleEditTemplate(tpCount);
              }}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              Edit
            </button>
          </div>
          <div className={gridClassName}>
            {template.percentages.map((percentage, index) => (
              <div className={cardPaddingClassName} key={index + 1}>
                <div className="text-xs text-gray-500 mb-1">TP{index + 1}</div>
                <div className={valueClassName}>{percentage}%</div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="card-dark rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Take Profit Strategy</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => {
              setDraft((current) => (current ? { ...current, mode: 'template' } : current));
            }} id="btn-tp-template" className={draft?.mode === 'template' ? 'px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium' : 'px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 font-medium'}>Template Based</button>
            <button onClick={() => {
              setDraft((current) => (current ? { ...current, mode: 'strategy' } : current));
            }} id="btn-tp-strategy" className={draft?.mode === 'strategy' ? 'px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium' : 'px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 font-medium'}>Strategy Based</button>
            <button onClick={() => {
              setDraft((current) => (current ? { ...current, mode: 'opentp' } : current));
            }} id="btn-tp-opentp" className={draft?.mode === 'opentp' ? 'px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium' : 'px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 font-medium'}>Open TP Handler</button>
          </div>
        </div>

        {isLoading || draft === null ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-center">Loading TP strategy settings...</p>
          </div>
        ) : null}

        {!isLoading && error instanceof ApiError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-500 text-center">Unable to load TP strategy settings</p>
            <p className="text-gray-600 text-sm">{error.message}</p>
          </div>
        ) : null}

        {saveError ? (
          <p className="text-xs text-yellow-500 mb-4">{saveError}</p>
        ) : null}

        {!isLoading && !(error instanceof ApiError) && draft !== null ? (
          <>
            <div id="template-based-mode" className={draft.mode === 'template' ? '' : 'hidden'}>
              <p className="text-sm text-gray-400 mb-6">Configure templates for different TP counts - system will auto-apply the correct template based on signal</p>

              <div className="space-y-4">
                {[2, 3, 4, 5, 6].map((tpCount) => renderTemplateCard(tpCount))}

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

            <div id="strategy-based-mode" className={draft.mode === 'strategy' ? '' : 'hidden'}>
              <p className="text-sm text-gray-400 mb-6">Apply same strategy to all signals regardless of TP count</p>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-3 block">Distribution Strategy</label>
                  <select id="tpStrategy" value={draft.strategyType} onChange={(event) => {
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            strategyType: event.target.value as TPStrategyType,
                          }
                        : current
                    );
                  }} className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                    <option value="equal">Equal Division</option>
                    <option value="weighted">Weighted (More at TP1)</option>
                    <option value="custom">Custom Percentages</option>
                  </select>
                </div>

                <div id="equalInfo" className={draft.strategyType === 'equal' ? 'card-darker rounded-lg p-4' : 'card-darker rounded-lg p-4 hidden'}>
                  <p className="text-sm text-gray-400">Lot size will be divided equally across all take profit levels</p>
                  <div className="mt-3 text-xs text-gray-500">
                    <div className="flex justify-between mb-1"><span>TP1:</span><span className="text-white">33.33%</span></div>
                    <div className="flex justify-between mb-1"><span>TP2:</span><span className="text-white">33.33%</span></div>
                    <div className="flex justify-between"><span>TP3:</span><span className="text-white">33.34%</span></div>
                  </div>
                </div>

                <div id="weightedInfo" className={draft.strategyType === 'weighted' ? 'card-darker rounded-lg p-4' : 'card-darker rounded-lg p-4 hidden'}>
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

                <div id="customInfo" className={draft.strategyType === 'custom' ? '' : 'hidden'}>
                  <div id="tpInputsContainer" className="space-y-3">
                    {draft.customInputs.map((input, index) => (
                      <div key={input.id} className="tp-input-group">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-300 flex-1">TP{input.id} Percentage (%)</label>
                          <button onClick={() => {
                            if (draft.customInputs.length <= 1) {
                              return;
                            }

                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    customInputs: current.customInputs.filter(
                                      (currentInput) => currentInput.id !== input.id
                                    ),
                                  }
                                : current
                            );
                            setTpSummaryTouched(true);
                          }} className={index === 0 ? 'w-7 h-7 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center opacity-50 cursor-not-allowed' : 'w-7 h-7 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center'} disabled={index === 0}>
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
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    customInputs: current.customInputs.map((currentInput) =>
                                      currentInput.id === input.id
                                        ? { ...currentInput, value }
                                        : currentInput
                                    ),
                                  }
                                : current
                            );
                            setTpSummaryTouched(true);
                          }}
                          className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none mt-2"
                        />
                      </div>
                    ))}
                  </div>

                  <button onClick={() => {
                    const nextId =
                      draft.customInputs.reduce(
                        (maxId, input) => Math.max(maxId, input.id),
                        0
                      ) + 1;

                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            customInputs: [...current.customInputs, { id: nextId, value: '0' }],
                          }
                        : current
                    );
                    setTpSummaryTouched(true);
                  }} className="w-full mt-3 px-4 py-2 rounded-lg border-2 border-dashed border-gray-700 hover:border-blue-500 text-gray-400 hover:text-blue-400 font-medium flex items-center justify-center gap-2 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add TP</span>
                  </button>

                  <div className="card-darker rounded-lg p-3 mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Total TPs:</span>
                      <span className="text-white font-bold" id="totalTPsCount">{draft.customInputs.length}</span>
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

            <div id="opentp-mode" className={draft.mode === 'opentp' ? '' : 'hidden'}>
              <p className="text-sm text-gray-400 mb-6">Configure how to handle open (unlimited) take profit targets</p>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-3 block">Signal Type</label>
                  <select id="openTPScenario" value={draft.openTPScenario} onChange={(event) => {
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            openTPScenario: event.target.value as OpenTPScenario,
                          }
                        : current
                    );
                  }} className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                    <option value="with_fixed">Open TP + Fixed TPs (TP1, TP2, ... + Open)</option>
                    <option value="only_open">Only Open TP (No fixed targets)</option>
                  </select>
                </div>

                <div id="opentp-with-fixed" className={draft.openTPScenario === 'with_fixed' ? 'card-darker rounded-lg p-6' : 'card-darker rounded-lg p-6 hidden'}>
                  <h4 className="text-white font-semibold mb-4">Open TP Configuration</h4>
                  <p className="text-sm text-gray-400 mb-6">When open TP is combined with fixed targets, configure action at specified pips</p>

                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-300 mb-3 block">Action Type</label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="openTPAction" value="reminder" checked={draft.openTPAction === 'reminder'} onChange={() => {
                          setDraft((current) =>
                            current ? { ...current, openTPAction: 'reminder' } : current
                          );
                        }} className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                        <div>
                          <div className="text-white font-medium">Reminder</div>
                          <div className="text-xs text-gray-500">Send notification when price reaches X pips</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="openTPAction" value="autoclose" checked={draft.openTPAction === 'autoclose'} onChange={() => {
                          setDraft((current) =>
                            current ? { ...current, openTPAction: 'autoclose' } : current
                          );
                        }} className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                        <div>
                          <div className="text-white font-medium">Auto Close</div>
                          <div className="text-xs text-gray-500">Automatically close position at X pips</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-3 block">Target Pips</label>
                    <input type="number" id="openTPPipsInput" value={draft.targetPips} min="10" step="5" onChange={(event) => {
                      setDraft((current) =>
                        current ? { ...current, targetPips: event.target.value } : current
                      );
                    }} className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="Enter pips (e.g. 100, 500, 1000)" />
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

                <div id="opentp-only-open" className={draft.openTPScenario === 'only_open' ? 'card-darker rounded-lg p-6' : 'card-darker rounded-lg p-6 hidden'}>
                  <h4 className="text-white font-semibold mb-4">Single Open TP Configuration</h4>
                  <p className="text-sm text-gray-400 mb-6">When signal has only one open TP with no fixed targets</p>

                  <div className="space-y-6">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Security at (pips)</label>
                      <p className="text-xs text-gray-500 mb-3">Move SL to breakeven when profit reaches</p>
                      <input type="number" id="openTPSecurityInput" value={draft.securityPips} min="10" step="5" onChange={(event) => {
                        setDraft((current) =>
                          current ? { ...current, securityPips: event.target.value } : current
                        );
                      }} className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="Enter pips" />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Close at (pips)</label>
                      <p className="text-xs text-gray-500 mb-3">Close entire position when profit reaches</p>
                      <input type="number" id="openTPCloseInput" value={draft.closePips} min="20" step="10" onChange={(event) => {
                        setDraft((current) =>
                          current ? { ...current, closePips: event.target.value } : current
                        );
                      }} className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" placeholder="Enter pips" />
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
          </>
        ) : null}
      </div>
    );
  }
);
