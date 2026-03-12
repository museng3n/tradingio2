import { apiClient } from '@/lib/api/client';

export interface OpenPositionTakeProfit {
  level: number;
  price: number;
  percentage: number;
  hit: boolean;
  hitAt?: string;
}

export interface OpenPosition {
  _id: string;
  signalId:
    | string
    | {
        _id: string;
        symbol?: string;
        type?: string;
        entry?: number;
      };
  odooId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  lotSize: number;
  profitLoss: number;
  profitLossPercentage: number;
  tps: OpenPositionTakeProfit[];
  sl: number;
  slSecured: boolean;
  slSecuredAt?: string;
  securityApplied: boolean;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PositionsResponse {
  success: boolean;
  data: OpenPosition[];
}

export async function getOpenPositions(): Promise<PositionsResponse> {
  return apiClient.get<PositionsResponse>('/positions/open');
}
