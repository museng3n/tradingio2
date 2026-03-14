import mongoose, { Document, Schema } from 'mongoose';

interface ITP {
  level: number;
  price: number;
  percentage: number;
  hit: boolean;
  hitAt?: Date;
}

interface IOriginalPlannedTP {
  level: number;
  targetPrice: number | null;
  percentage: number;
  isExactTarget: boolean;
}

interface ITPPlanningProvenance {
  strategySource: 'request' | 'executor_default';
  mode: 'template' | 'strategy' | 'opentp';
  strategyType?: 'equal' | 'weighted' | 'custom' | null;
  usedFallback: boolean;
  normalizedPercentages: boolean;
}

interface ITPPlanningSnapshot {
  plannedTps: IOriginalPlannedTP[];
  provenance: ITPPlanningProvenance;
}

export interface IPosition extends Document {
  userId: mongoose.Types.ObjectId;
  signalId: mongoose.Types.ObjectId;
  odooId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  closePrice?: number;
  lotSize: number;
  profitLoss: number;
  profitLossPercentage: number;
  tps: ITP[];
  sl: number;
  tpPlanning?: {
    originalPlan?: ITPPlanningSnapshot;
    wasModifiedAfterOpen: boolean;
  };
  slSecured: boolean;
  slSecuredAt?: Date;
  securityApplied: boolean;
  status: 'OPEN' | 'CLOSED';
  closeReason?: 'TP' | 'SL' | 'MANUAL';
  openedAt: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const originalPlannedTpSchema = new Schema<IOriginalPlannedTP>({
  level: {
    type: Number,
    required: true
  },
  targetPrice: {
    type: Number,
    default: null
  },
  percentage: {
    type: Number,
    required: true
  },
  isExactTarget: {
    type: Boolean,
    required: true
  }
}, {
  _id: false
});

const tpPlanningProvenanceSchema = new Schema<ITPPlanningProvenance>({
  strategySource: {
    type: String,
    enum: ['request', 'executor_default'],
    required: true
  },
  mode: {
    type: String,
    enum: ['template', 'strategy', 'opentp'],
    required: true
  },
  strategyType: {
    type: String,
    enum: ['equal', 'weighted', 'custom'],
    default: null
  },
  usedFallback: {
    type: Boolean,
    required: true
  },
  normalizedPercentages: {
    type: Boolean,
    required: true
  }
}, {
  _id: false
});

const tpPlanningSnapshotSchema = new Schema<ITPPlanningSnapshot>({
  plannedTps: {
    type: [originalPlannedTpSchema],
    default: []
  },
  provenance: {
    type: tpPlanningProvenanceSchema,
    required: true
  }
}, {
  _id: false
});

const positionSchema = new Schema<IPosition>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  signalId: {
    type: Schema.Types.ObjectId,
    ref: 'Signal',
    required: true
  },
  odooId: {
    type: String,
    default: ''
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  entryPrice: {
    type: Number,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  closePrice: {
    type: Number
  },
  lotSize: {
    type: Number,
    required: true,
    min: 0.01
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  profitLossPercentage: {
    type: Number,
    default: 0
  },
  tps: [{
    level: Number,
    price: Number,
    percentage: Number,
    hit: { type: Boolean, default: false },
    hitAt: Date
  }],
  sl: {
    type: Number,
    required: true
  },
  tpPlanning: {
    originalPlan: {
      type: tpPlanningSnapshotSchema,
      immutable: true,
      default: undefined
    },
    wasModifiedAfterOpen: {
      type: Boolean,
      default: false
    }
  },
  slSecured: {
    type: Boolean,
    default: false
  },
  slSecuredAt: {
    type: Date
  },
  securityApplied: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN',
    index: true
  },
  closeReason: {
    type: String,
    enum: ['TP', 'SL', 'MANUAL']
  },
  openedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  closedAt: Date
}, {
  timestamps: true
});

// Index for faster queries
positionSchema.index({ userId: 1, status: 1 });
positionSchema.index({ status: 1, openedAt: -1 });

export default mongoose.model<IPosition>('Position', positionSchema);
