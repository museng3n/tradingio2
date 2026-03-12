type Listener = (payload: unknown) => void;

class WebsocketClient {
  private listeners = new Map<string, Listener[]>();

  initialize(): void {
    // Reserved for parity-safe websocket wiring.
  }

  on(event: string, listener: Listener): void {
    const existing = this.listeners.get(event) ?? [];
    this.listeners.set(event, [...existing, listener]);
  }

  emit(event: string, payload: unknown): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.forEach((listener) => listener(payload));
  }
}

export const websocketClient = new WebsocketClient();
