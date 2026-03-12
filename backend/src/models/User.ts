import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface ISelectedChannel {
  id: string;
  title: string;
  username?: string;
}

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  phoneNumber?: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  mt5Credentials?: {
    account: string;
    password: string;  // Encrypted
    server: string;
  };
  // Telegram integration fields
  telegramSession?: string;
  selectedChannels?: ISelectedChannel[];
  telegramConnected: boolean;
  telegramConnectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(password: string): Promise<boolean>;
  isLocked(): boolean;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 12,
    select: false  // Don't return password by default
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
    default: 'ACTIVE'
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  mt5Credentials: {
    account: String,
    password: String,  // Will be encrypted
    server: String
  },
  // Telegram integration fields
  telegramSession: {
    type: String,
    select: false  // Don't return session by default (security)
  },
  selectedChannels: [{
    id: String,
    title: String,
    username: String
  }],
  telegramConnected: {
    type: Boolean,
    default: false
  },
  telegramConnectedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

export default mongoose.model<IUser>('User', userSchema);
