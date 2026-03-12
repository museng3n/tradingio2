import mongoose, { Document, Schema } from 'mongoose';

export interface ISignal extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  type: 'BUY' | 'SELL';
  entry: number;
  tps: (number | string)[];  // [2520, 2540, "OPEN"]
  sl: number;
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED' | 'EXPIRED';
  source?: string;
  telegramMessageId?: number;
  channel?: string;
  rawMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const signalSchema = new Schema<ISignal>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  entry: {
    type: Number,
    required: true
  },
  tps: [{
    type: Schema.Types.Mixed  // number or "OPEN"
  }],
  sl: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'CLOSED', 'CANCELLED', 'EXPIRED'],
    default: 'ACTIVE'
  },
  source: String,
  telegramMessageId: Number,
  channel: String,
  rawMessage: String
}, {
  timestamps: true
});

export default mongoose.model<ISignal>('Signal', signalSchema);
