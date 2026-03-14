import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useAppShellStore } from '@/features/auth/auth.store';
import {
  activateTelegramRuntime,
  getTelegramRuntimeStatus,
  stopTelegramRuntime,
  type TelegramRuntimeStatus,
} from '@/features/settings/settings.api';
import { ApiError } from '@/lib/api/client';

const getStatusToneClassName = (status: TelegramRuntimeStatus | null): string => {
  switch (status) {
    case 'MONITORING_ACTIVE':
      return 'bg-green-500/20 text-green-400';
    case 'DEGRADED_RECONNECTING':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'PROVISIONING_RUNTIME':
      return 'bg-blue-600/10 text-blue-400';
    case 'UPLOADED_NOT_ACTIVATED':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'AUTH_INVALID_OR_SESSION_EXPIRED':
      return 'bg-red-500/20 text-red-400';
    case 'DISCONNECTED':
    default:
      return 'bg-gray-700/40 text-gray-300';
  }
};

const getStatusLabel = (
  status: TelegramRuntimeStatus | null,
  isLoading: boolean,
  hasError: boolean
): string => {
  if (isLoading) {
    return 'Loading';
  }

  if (hasError) {
    return 'Unavailable';
  }

  switch (status) {
    case 'MONITORING_ACTIVE':
      return 'Active';
    case 'DEGRADED_RECONNECTING':
      return 'Reconnecting';
    case 'PROVISIONING_RUNTIME':
      return 'Provisioning';
    case 'UPLOADED_NOT_ACTIVATED':
      return 'Not activated';
    case 'AUTH_INVALID_OR_SESSION_EXPIRED':
      return 'Session expired';
    case 'DISCONNECTED':
    default:
      return 'Disconnected';
  }
};

export function TelegramRuntimeSection(): JSX.Element {
  const user = useAppShellStore((state) => state.user);
  const queryClient = useQueryClient();
  const [runtimeDecryptionKey, setRuntimeDecryptionKey] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const queryKey = ['settings', 'telegram-runtime', user?.id];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: getTelegramRuntimeStatus,
    enabled: user !== null,
  });

  const activateMutation = useMutation({
    mutationFn: activateTelegramRuntime,
    onSuccess: async (response) => {
      setFeedbackMessage(response.data.accepted ? null : response.data.message);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiError) {
        setFeedbackMessage(mutationError.message);
        return;
      }

      setFeedbackMessage('Unable to activate Telegram runtime');
    },
    onSettled: () => {
      setRuntimeDecryptionKey('');
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopTelegramRuntime,
    onSuccess: async (response) => {
      setFeedbackMessage(
        response.data.stopped || response.data.code === 'ALREADY_STOPPED'
          ? null
          : response.data.message
      );
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiError) {
        setFeedbackMessage(mutationError.message);
        return;
      }

      setFeedbackMessage('Unable to stop Telegram runtime');
    },
  });

  useEffect(() => {
    if (error instanceof ApiError) {
      setFeedbackMessage(error.message);
    }
  }, [error]);

  const status = data?.data.status ?? null;
  const isBusy = activateMutation.isPending || stopMutation.isPending;
  const canActivate =
    runtimeDecryptionKey.trim().length > 0 &&
    status !== 'MONITORING_ACTIVE' &&
    status !== 'DEGRADED_RECONNECTING' &&
    status !== 'PROVISIONING_RUNTIME' &&
    status !== 'AUTH_INVALID_OR_SESSION_EXPIRED' &&
    !isBusy;
  const canStop =
    (status === 'MONITORING_ACTIVE' ||
      status === 'DEGRADED_RECONNECTING' ||
      status === 'PROVISIONING_RUNTIME') &&
    !isBusy;

  return (
    <div className="card-dark rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Telegram Runtime</h3>
        </div>
      </div>

      <div className="card-darker rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">Status</div>
          <span
            className={`text-xs px-2 py-0.5 rounded ${getStatusToneClassName(
              isLoading || error instanceof ApiError ? null : status
            )}`}
          >
            {getStatusLabel(status, isLoading, error instanceof ApiError)}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Decryption Key
        </label>
        <input
          type="password"
          value={runtimeDecryptionKey}
          onChange={(event) => {
            setRuntimeDecryptionKey(event.target.value);
            if (feedbackMessage !== null) {
              setFeedbackMessage(null);
            }
          }}
          placeholder="Enter runtime decryption key"
          className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => {
            if (!canActivate) {
              return;
            }

            void activateMutation.mutateAsync({
              runtimeDecryptionKey: runtimeDecryptionKey.trim(),
            });
          }}
          disabled={!canActivate}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.868v4.264a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Activate</span>
        </button>
        <button
          onClick={() => {
            if (!canStop) {
              return;
            }

            void stopMutation.mutateAsync();
          }}
          disabled={!canStop}
          className="px-6 py-3 rounded-lg text-gray-400 hover:bg-gray-800 font-medium flex items-center gap-2 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m-7 4h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Stop</span>
        </button>
      </div>

      {feedbackMessage ? (
        <p className="text-xs text-yellow-500 mt-4">{feedbackMessage}</p>
      ) : null}
    </div>
  );
}
