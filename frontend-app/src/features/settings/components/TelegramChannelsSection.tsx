import { useMutation, useQuery } from '@tanstack/react-query';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import type { JSX } from 'react';
import { useAppShellStore } from '@/features/auth/auth.store';
import {
  getTelegramChannelsSettings,
  updateTelegramChannelsSettings,
  type TelegramChannelsSettingsRequest,
  type TelegramChannelsSettingsResponse,
  type TelegramSelectedChannel,
} from '@/features/settings/settings.api';
import { ApiError } from '@/lib/api/client';

interface TelegramChannelsDraftState {
  selectedChannels: TelegramSelectedChannel[];
}

export interface TelegramChannelsSectionHandle {
  save: () => Promise<void>;
}

const mapResponseToDraft = (
  response: TelegramChannelsSettingsResponse
): TelegramChannelsDraftState => ({
  selectedChannels: response.data.selectedChannels.map((channel) => ({
    id: channel.id,
    title: channel.title,
    ...(channel.username ? { username: channel.username } : {}),
  })),
});

const mapDraftToRequest = (
  draft: TelegramChannelsDraftState
): TelegramChannelsSettingsRequest => ({
  selectedChannels: draft.selectedChannels.map((channel) => ({
    id: channel.id,
    title: channel.title,
    ...(channel.username ? { username: channel.username } : {}),
  })),
});

const isEquivalentRequest = (
  left: TelegramChannelsSettingsRequest,
  right: TelegramChannelsSettingsRequest
): boolean => JSON.stringify(left) === JSON.stringify(right);

const getDisplayChannelName = (channel: TelegramSelectedChannel): string =>
  channel.title || (channel.username ? `@${channel.username}` : channel.id);

export const TelegramChannelsSection = forwardRef<
  TelegramChannelsSectionHandle,
  object
>(function TelegramChannelsSection(_props, ref): JSX.Element {
  const user = useAppShellStore((state) => state.user);
  const [draft, setDraft] = useState<TelegramChannelsDraftState>({
    selectedChannels: [],
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings', 'telegram-channels', user?.id],
    queryFn: getTelegramChannelsSettings,
    enabled: user !== null,
  });

  const mutation = useMutation({
    mutationFn: updateTelegramChannelsSettings,
    onSuccess: (response) => {
      setDraft(mapResponseToDraft(response));
      setSaveError(null);
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiError) {
        setSaveError(mutationError.message);
        return;
      }

      setSaveError('Unable to save Telegram channels settings');
    },
  });

  useEffect(() => {
    if (data) {
      setDraft(mapResponseToDraft(data));
      setSaveError(null);
      setHasLoaded(true);
    }
  }, [data]);

  useEffect(() => {
    if (error instanceof ApiError) {
      setHasLoaded(true);
    }
  }, [error]);

  const requestDraft = useMemo(
    () => mapDraftToRequest(draft),
    [draft]
  );

  const loadedRequest = useMemo(
    () =>
      data
        ? mapDraftToRequest(mapResponseToDraft(data))
        : {
            selectedChannels: [],
          },
    [data]
  );

  const isDirty = !isEquivalentRequest(requestDraft, loadedRequest);

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        if (!hasLoaded || !isDirty || mutation.isPending) {
          return;
        }

        await mutation.mutateAsync(requestDraft);
      },
    }),
    [hasLoaded, isDirty, mutation, requestDraft]
  );

  return (
    <div className="card-dark rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Telegram Channels</h3>
        </div>
        <span className="text-sm font-semibold text-gray-400">
          {draft.selectedChannels.length} of {draft.selectedChannels.length} active
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-6">Manage signal source channels</p>

      {saveError ? (
        <p className="text-xs text-yellow-500 mb-4">{saveError}</p>
      ) : null}

      <div className="mb-4">
        <div className="px-4 py-2 bg-black border border-gray-700 rounded-lg">
          <p className="text-sm text-gray-400">
            Telegram channels are synced from your uploaded Telegram session.
          </p>
        </div>
      </div>

      {draft.selectedChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-800 rounded-lg">
          <svg className="w-12 h-12 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-500 text-center">No channels added yet</p>
          <p className="text-gray-600 text-sm">Upload a Telegram session to sync your channels</p>
        </div>
      ) : (
        <div className="card-darker rounded-lg p-4">
          {draft.selectedChannels.map((channel) => (
            <div key={channel.id} className="flex items-center justify-between p-3 bg-black rounded-lg mb-2 last:mb-0">
              <div className="flex items-center gap-3 min-w-0">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    {getDisplayChannelName(channel)}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {channel.username ? `@${channel.username}` : channel.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDraft((current) => ({
                    ...current,
                    selectedChannels: current.selectedChannels.filter(
                      (item) => item.id !== channel.id
                    ),
                  }));
                }}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
