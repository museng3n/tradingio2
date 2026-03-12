import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../src/models/User';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@tradinghub.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminSecure123!@#';

const seedAdmin = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      console.log('Admin user already exists:', ADMIN_EMAIL);
      await mongoose.connection.close();
      return;
    }

    // Create admin user
    const admin = await User.create({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'ADMIN',
      twoFactorEnabled: false
    });

    console.log('Admin user created successfully!');
    console.log('Email:', ADMIN_EMAIL);
    console.log('Password:', ADMIN_PASSWORD);
    console.log('User ID:', admin._id);
    console.log('\nIMPORTANT: Please enable 2FA after first login!');

    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
