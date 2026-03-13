import Position from '../../models/Position';
import tpStrategyService from '../trading/tp-strategy.service';

export interface SecuredHistoryItem {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  securedAt: number;
  timeSecured: Date;
  pipsToBE: number | null;
  reason: 'TP1_HIT';
  status: 'OPEN' | 'CLOSED';
  openedAt: Date;
  closedAt?: Date;
}

export class UserHistoryService {
  async getSecuredSignalsHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    total: number;
    page: number;
    pages: number;
    positions: SecuredHistoryItem[];
  }> {
    const skip = (page - 1) * limit;

    const [positions, total] = await Promise.all([
      Position.find({ userId, slSecured: true })
        .sort({ slSecuredAt: -1, openedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('signalId', 'sl'),
      Position.countDocuments({ userId, slSecured: true })
    ]);

    return {
      total,
      page,
      pages: Math.ceil(total / limit),
      positions: positions.map((position) => {
        const signal = position.signalId as { sl?: number } | null;
        const originalSl = typeof signal?.sl === 'number' ? signal.sl : null;

        return {
          id: position._id.toString(),
          symbol: position.symbol,
          direction: position.type,
          entry: position.entryPrice,
          securedAt: position.sl,
          timeSecured: position.slSecuredAt ?? position.updatedAt ?? position.openedAt,
          pipsToBE: originalSl === null
            ? null
            : tpStrategyService.calculatePips(position.entryPrice, originalSl, position.symbol),
          reason: 'TP1_HIT',
          status: position.status,
          openedAt: position.openedAt,
          closedAt: position.closedAt
        };
      })
    };
  }
}

export default new UserHistoryService();
