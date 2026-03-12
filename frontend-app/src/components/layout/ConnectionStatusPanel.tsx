import { useRealtimeStore } from '@/features/realtime/realtime.store';

export function ConnectionStatusPanel(): JSX.Element {
  const websocketLive = useRealtimeStore((state) => state.websocketLive);

  return (
    <div className="p-4 border-t border-dark" data-canonical-section="connection-status">
      <div className="text-xs font-semibold text-gray-500 mb-2">CONNECTION STATUS</div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">MT5</span>
        </div>
        <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Offline</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
