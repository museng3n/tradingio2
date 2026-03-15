import mongoose, { Document, Schema } from 'mongoose';

export interface IAccountValueSnapshot extends Document {
  userId: mongoose.Types.ObjectId;
  mt5Account: string;
  mt5Server: string;
  observedAt: Date;
  balance: number;
  equity: number;
  currency: string;
}

const accountValueSnapshotSchema = new Schema<IAccountValueSnapshot>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  mt5Account: {
    type: String,
    required: true,
    trim: true
  },
  mt5Server: {
    type: String,
    required: true,
    trim: true
  },
  observedAt: {
    type: Date,
    required: true,
    index: true
  },
  balance: {
    type: Number,
    required: true
  },
  equity: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  }
});

accountValueSnapshotSchema.index({ userId: 1, mt5Account: 1, mt5Server: 1, observedAt: 1 });

export default mongoose.model<IAccountValueSnapshot>('AccountValueSnapshot', accountValueSnapshotSchema);
