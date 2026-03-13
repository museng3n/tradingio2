import { useMutation, useQuery } from '@tanstack/react-query';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { useAppShellStore } from '@/features/auth/auth.store';
import {
  getRiskManagementSettings,
  updateRiskManagementSettings,
  type RiskManagementSettingsRequest,
  type RiskManagementSettingsResponse,
} from '@/features/settings/settings.api';
import { ApiError } from '@/lib/api/client';

interface RiskManagementDraftState {
  defaultLotSize: string;
  maxRiskPerTradePercent: string;
  maxOpenPositions: string;
  autoTrading: boolean;
}

export interface RiskManagementSectionHandle {
  save: () => Promise<void>;
}

const mapResponseToDraft = (
  response: RiskManagementSettingsResponse
): RiskManagementDraftState => ({
  defaultLotSize: String(response.data.defaultLotSize),
  maxRiskPerTradePercent: String(response.data.maxRiskPerTradePercent),
  maxOpenPositions: String(response.data.maxOpenPositions),
  autoTrading: response.data.autoTrading,
});

const mapDraftToRequest = (
  draft: RiskManagementDraftState
): RiskManagementSettingsRequest => ({
  defaultLotSize: Number.parseFloat(draft.defaultLotSize),
  maxRiskPerTradePercent: Number.parseFloat(draft.maxRiskPerTradePercent),
  maxOpenPositions: Number.parseInt(draft.maxOpenPositions, 10),
  autoTrading: draft.autoTrading,
});

const isEquivalentRequest = (
  left: RiskManagementSettingsRequest,
  right: RiskManagementSettingsRequest
): boolean => JSON.stringify(left) === JSON.stringify(right);

const toggleSwitchClassName = (active: boolean): string =>
  active
    ? 'relative w-12 h-6 rounded-full bg-blue-600 transition-colors'
    : 'relative w-12 h-6 rounded-full bg-gray-700 transition-colors';

const circleStyle = (active: boolean): { transform: string } => ({
  transform: active ? 'translateX(24px)' : 'translateX(0)',
});

export const RiskManagementSection = forwardRef<RiskManagementSectionHandle, object>(
  function RiskManagementSection(_props, ref): JSX.Element {
    const user = useAppShellStore((state) => state.user);
    const [draft, setDraft] = useState<RiskManagementDraftState | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const { data, isLoading, error } = useQuery({
      queryKey: ['settings', 'risk-management', user?.id],
      queryFn: getRiskManagementSettings,
      enabled: user !== null,
    });

    const mutation = useMutation({
      mutationFn: updateRiskManagementSettings,
      onSuccess: (response) => {
        setDraft(mapResponseToDraft(response));
        setSaveError(null);
      },
      onError: (mutationError) => {
        if (mutationError instanceof ApiError) {
          setSaveError(mutationError.message);
          return;
        }

        setSaveError('Unable to save risk management settings');
      },
    });

    useEffect(() => {
      if (data) {
        setDraft(mapResponseToDraft(data));
        setSaveError(null);
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

    return (
      <div className="card-dark rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Risk Management</h3>
        </div>
        <p className="text-sm text-gray-400 mb-6">Configure your trading risk parameters</p>

        {isLoading || draft === null ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-gray-500 text-center">Loading risk management settings...</p>
          </div>
        ) : null}

        {!isLoading && error instanceof ApiError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-500 text-center">Unable to load risk management settings</p>
            <p className="text-gray-600 text-sm">{error.message}</p>
          </div>
        ) : null}

        {saveError ? (
          <p className="text-xs text-yellow-500 mb-4">{saveError}</p>
        ) : null}

        {!isLoading && !(error instanceof ApiError) && draft !== null ? (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Default Lot Size</label>
                <span className="text-sm font-bold text-white">{draft.defaultLotSize}</span>
              </div>
              <input
                type="number"
                value={draft.defaultLotSize}
                step="0.01"
                onChange={(event) => {
                  setDraft((current) =>
                    current
                      ? { ...current, defaultLotSize: event.target.value }
                      : current
                  );
                }}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">Standard lot size for new positions</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Max Risk per Trade (%)</label>
                <span className="text-sm font-bold text-blue-400">{draft.maxRiskPerTradePercent}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={draft.maxRiskPerTradePercent}
                onChange={(event) => {
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          maxRiskPerTradePercent: event.target.value,
                        }
                      : current
                  );
                }}
                className="slider w-full"
              />
              <p className="text-xs text-gray-500 mt-2">Maximum risk percentage per trade</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Max Open Positions</label>
                <span className="text-sm font-bold text-white">{draft.maxOpenPositions}</span>
              </div>
              <input
                type="number"
                value={draft.maxOpenPositions}
                onChange={(event) => {
                  setDraft((current) =>
                    current
                      ? { ...current, maxOpenPositions: event.target.value }
                      : current
                  );
                }}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">Maximum simultaneous open positions</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">Auto Trading</label>
                <button
                  onClick={() => {
                    setDraft((current) =>
                      current
                        ? { ...current, autoTrading: !current.autoTrading }
                        : current
                    );
                  }}
                  className={toggleSwitchClassName(draft.autoTrading)}
                >
                  <div
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                    style={circleStyle(draft.autoTrading)}
                  ></div>
                </button>
              </div>
              <p className="text-xs text-gray-500">Automatically execute signals</p>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
);
