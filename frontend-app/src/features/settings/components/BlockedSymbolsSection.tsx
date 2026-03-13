import { useMutation, useQuery } from '@tanstack/react-query';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import type { JSX } from 'react';
import { useAppShellStore } from '@/features/auth/auth.store';
import {
  getBlockedSymbolsSettings,
  updateBlockedSymbolsSettings,
  type BlockedSymbolsSettingsRequest,
  type BlockedSymbolsSettingsResponse,
} from '@/features/settings/settings.api';
import { ApiError } from '@/lib/api/client';

interface BlockedSymbolsDraftState {
  symbolInput: string;
  blockedSymbols: string[];
}

export interface BlockedSymbolsSectionHandle {
  save: () => Promise<void>;
}

const mapResponseToDraft = (
  response: BlockedSymbolsSettingsResponse
): BlockedSymbolsDraftState => ({
  symbolInput: '',
  blockedSymbols: [...response.data.symbols],
});

const mapDraftToRequest = (
  draft: BlockedSymbolsDraftState
): BlockedSymbolsSettingsRequest => ({
  symbols: [...draft.blockedSymbols],
});

const isEquivalentRequest = (
  left: BlockedSymbolsSettingsRequest,
  right: BlockedSymbolsSettingsRequest
): boolean => JSON.stringify(left) === JSON.stringify(right);

const normalizeSymbol = (value: string): string => value.trim().toUpperCase();

export const BlockedSymbolsSection = forwardRef<
  BlockedSymbolsSectionHandle,
  object
>(function BlockedSymbolsSection(_props, ref): JSX.Element {
  const user = useAppShellStore((state) => state.user);
  const [draft, setDraft] = useState<BlockedSymbolsDraftState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings', 'blocked-symbols', user?.id],
    queryFn: getBlockedSymbolsSettings,
    enabled: user !== null,
  });

  const mutation = useMutation({
    mutationFn: updateBlockedSymbolsSettings,
    onSuccess: (response) => {
      setDraft(mapResponseToDraft(response));
      setSaveError(null);
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiError) {
        setSaveError(mutationError.message);
        return;
      }

      setSaveError('Unable to save blocked symbols settings');
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

  const handleAddBlockedSymbol = (): void => {
    if (!draft) {
      return;
    }

    const symbol = normalizeSymbol(draft.symbolInput);

    if (!symbol) {
      window.alert('Please enter a symbol');
      return;
    }

    if (draft.blockedSymbols.includes(symbol)) {
      window.alert('Symbol already blocked');
      return;
    }

    setDraft((current) =>
      current
        ? {
            ...current,
            symbolInput: '',
            blockedSymbols: [...current.blockedSymbols, symbol],
          }
        : current
    );
  };

  const handleSymbolKeyPress = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddBlockedSymbol();
    }
  };

  return (
    <div className="card-dark rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <h3 className="text-lg font-semibold text-white">Block Symbols</h3>
      </div>
      <p className="text-sm text-gray-400 mb-6">Block specific trading symbols from being traded</p>

      {isLoading || draft === null ? (
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <p className="text-gray-500 text-center">Loading blocked symbols settings...</p>
        </div>
      ) : null}

      {!isLoading && error instanceof ApiError ? (
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-gray-500 text-center">Unable to load blocked symbols settings</p>
          <p className="text-gray-600 text-sm">{error.message}</p>
        </div>
      ) : null}

      {saveError ? (
        <p className="text-xs text-yellow-500 mb-4">{saveError}</p>
      ) : null}

      {!isLoading && !(error instanceof ApiError) && draft !== null ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Add Symbol to Block</label>
            <div className="flex gap-2">
              <input type="text" id="symbolInput" value={draft.symbolInput} onChange={(event) => {
                const nextValue = event.target.value;
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        symbolInput: nextValue,
                      }
                    : current
                );
              }} onKeyPress={handleSymbolKeyPress} placeholder="XAUUSD" className="flex-1 px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none uppercase" />
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
              <span className="text-xs text-gray-500" id="blockedCount">{draft.blockedSymbols.length} blocked</span>
            </div>
            <div id="blockedSymbolsList" className="card-darker rounded-lg p-4">
              {draft.blockedSymbols.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">No symbols blocked</p>
              ) : (
                <>
                  {draft.blockedSymbols.map((symbol) => (
                    <div key={symbol} className="flex items-center justify-between p-3 bg-black rounded-lg mb-2">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <span className="text-white font-mono font-semibold">{symbol}</span>
                      </div>
                      <button onClick={() => {
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                blockedSymbols: current.blockedSymbols.filter(
                                  (item) => item !== symbol
                                ),
                              }
                            : current
                        );
                      }} className="text-gray-400 hover:text-red-400 transition-colors">
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
      ) : null}
    </div>
  );
});
