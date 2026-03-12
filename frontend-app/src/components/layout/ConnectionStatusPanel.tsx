import type { JSX } from 'react';
import { useRealtimeStore } from '@/features/realtime/realtime.store';

export function ConnectionStatusPanel(): JSX.Element {
  const websocketLive = useRealtimeStore((state) => state.websocketLive);

  return (
    <div className="p-4 border-t border-dark">
      <div className="text-xs font-semibold text-gray-500 mb-2">CONNECTION STATUS</div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-sm">MT5</span>
        </div>
        <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Offline</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
            />
          </svg>
          <span className="text-sm">WebSocket</span>
        </div>
        {websocketLive ? (
          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full pulse-dot" />
            Live
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Offline</span>
        )}
      </div>
    </div>
  );
}
