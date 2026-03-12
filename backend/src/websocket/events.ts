/**
 * WebSocket Event Types
 *
 * Client -> Server (Emit)
 */
export const CLIENT_EVENTS = {
  AUTHENTICATE: 'authenticate',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe'
} as const;

/**
 * Server -> Client (Listen)
 */
export const SERVER_EVENTS = {
  CONNECTED: 'connected',
  SIGNAL_NEW: 'signal_new',
  SIGNAL_ERROR: 'signal_error',
  POSITION_OPENED: 'position_opened',
  POSITION_UPDATE: 'position_update',
  POSITION_CLOSED: 'position_closed',
  TP_HIT: 'tp_hit',
  SL_HIT: 'sl_hit',
  SL_SECURED: 'sl_secured',
  SL_TRAILED: 'sl_trailed',
  MT5_STATUS: 'mt5_status',
  MONITORING_STARTED: 'monitoring_started',
  MONITORING_STOPPED: 'monitoring_stopped',
  MONITOR_STATUS: 'monitor_status',
  SECURITY_ACTION: 'security_action',
  SECURITY_HISTORY: 'security_history',
  NOTIFICATION: 'notification'
} as const;

/**
 * Subscription Channels
 */
export const CHANNELS = {
  POSITIONS: 'positions',
  SIGNALS: 'signals',
  ANALYTICS: 'analytics',
  ADMIN: 'admin'
} as const;

export type ClientEvent = typeof CLIENT_EVENTS[keyof typeof CLIENT_EVENTS];
export type ServerEvent = typeof SERVER_EVENTS[keyof typeof SERVER_EVENTS];
export type Channel = typeof CHANNELS[keyof typeof CHANNELS];
