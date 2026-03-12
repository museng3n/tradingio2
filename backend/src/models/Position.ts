import mongoose, { Document, Schema } from 'mongoose';

interface ITP {
  level: number;
  price: number;
  percentage: number;
  hit: boolean;
  hitAt?: Date;
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
