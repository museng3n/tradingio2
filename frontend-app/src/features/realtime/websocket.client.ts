import { websocketClient } from '@/lib/ws/client';

export function initializeRealtimeLayer(): void {
  websocketClient.initialize();
}
