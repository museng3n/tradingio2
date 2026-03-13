import { useMutation, useQuery } from '@tanstack/react-query';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { useAppShellStore } from '@/features/auth/auth.store';
import {
  getPositionSecuritySettings,
  updatePositionSecuritySettings,
  type PositionSecuritySecurePositionAfter,
  type PositionSecuritySettingsRequest,
  type PositionSecuritySettingsResponse,
} from '@/features/settings/settings.api';
import { ApiError } from '@/lib/api/client';

interface PositionSecurityDraftState {
  moveSlToBreakeven: boolean;
  securePositionAfter: PositionSecuritySecurePositionAfter;
  customPips: string;
}

export interface PositionSecuritySectionHandle {
  save: () => Promise<void>;
}

const CUSTOM_PIPS_DEFAULT = '20';

const toggleSwitchClassName = (active: boolean): string =>
  active
    ? 'relative w-12 h-6 rounded-full bg-blue-600 transition-colors'
    : 'relative w-12 h-6 rounded-full bg-gray-700 transition-colors';

const circleStyle = (active: boolean): { transform: string } => ({
  transform: active ? 'translateX(24px)' : 'translateX(0)',
});

const mapResponseToDraft = (
  response: PositionSecuritySettingsResponse
): PositionSecurityDraftState => ({
  moveSlToBreakeven: response.data.moveSlToBreakeven,
  securePositionAfter: response.data.securePositionAfter,
  customPips:
    response.data.customPips === null
      ? CUSTOM_PIPS_DEFAULT
      : String(response.data.customPips),
});

const mapDraftToRequest = (
  draft: PositionSecurityDraftState
): PositionSecuritySettingsRequest => ({
  moveSlToBreakeven: draft.moveSlToBreakeven,
  securePositionAfter: draft.securePositionAfter,
  customPips:
    draft.securePositionAfter === 'CUSTOM_PIPS'
      ? Number.parseFloat(draft.customPips)
      : null,
});

const isEquivalentRequest = (
  left: PositionSecuritySettingsRequest,
  right: PositionSecuritySettingsRequest
): boolean => JSON.stringify(left) === JSON.stringify(right);

export const PositionSecuritySection = forwardRef<
  PositionSecuritySectionHandle,
  object
>(function PositionSecuritySection(_props, ref): JSX.Element {
  const user = useAppShellStore((state) => state.user);
  const [draft, setDraft] = useState<PositionSecurityDraftState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings', 'position-security', user?.id],
    queryFn: getPositionSecuritySettings,
    enabled: user !== null,
  });

  const mutation = useMutation({
    mutationFn: updatePositionSecuritySettings,
    onSuccess: (response) => {
      setDraft(mapResponseToDraft(response));
      setSaveError(null);
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiError) {
        setSaveError(mutationError.message);
        return;
      }

      setSaveError('Unable to save position security settings');
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h3 className="text-lg font-semibold text-white">Position Security</h3>
      </div>
      <p className="text-sm text-gray-400 mb-6">Configure automatic position protection settings</p>

      {isLoading || draft === null ? (
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-gray-500 text-center">Loading position security settings...</p>
        </div>
      ) : null}

      {!isLoading && error instanceof ApiError ? (
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-gray-500 text-center">Unable to load position security settings</p>
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
              <label className="text-sm font-medium text-gray-300">Move SL to Breakeven</label>
              <button
                onClick={() => {
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          moveSlToBreakeven: !current.moveSlToBreakeven,
                        }
                      : current
                  );
                }}
                className={toggleSwitchClassName(draft.moveSlToBreakeven)}
              >
                <div
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={circleStyle(draft.moveSlToBreakeven)}
                ></div>
              </button>
            </div>
            <p className="text-xs text-gray-500">Automatically move stop loss to entry price when target is reached</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-3 block">Secure Position After</label>
            <select
              value={draft.securePositionAfter}
              onChange={(event) => {
                const value =
                  event.target.value as PositionSecuritySecurePositionAfter;

                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        securePositionAfter: value,
                        customPips:
                          value === 'CUSTOM_PIPS'
                            ? current.customPips
                            : CUSTOM_PIPS_DEFAULT,
                      }
                    : current
                );
              }}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="TP1">After TP1 Hit</option>
              <option value="TP2">After TP2 Hit</option>
              <option value="TP3">After TP3 Hit</option>
              <option value="CUSTOM_PIPS">Custom Pips</option>
            </select>
          </div>

          <div
            id="customPipsSection"
            className={draft.securePositionAfter === 'CUSTOM_PIPS' ? '' : 'hidden'}
          >
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Custom Pips</label>
              <span className="text-sm font-bold text-white">{draft.customPips}</span>
            </div>
            <input
              type="number"
              value={draft.customPips}
              onChange={(event) => {
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        customPips: event.target.value,
                      }
                    : current
                );
              }}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-2">Move SL to breakeven after X pips in profit</p>
          </div>
        </div>
      ) : null}
    </div>
  );
});
