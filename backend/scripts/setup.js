require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Device = require('../models/Device');
const Telemetry = require('../models/Telemetry');

async function setup() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Create admin
    let admin = await User.findOne({ email: 'admin@example.com' });
    if (!admin) {
      admin = await User.create({
        email: 'admin@example.com',
        password: 'Admin@123456',
        fullName: 'Admin',
        role: 'admin'
      });
      console.log('✓ Admin created');
    } else {
      console.log('✓ Admin already exists');
    }

    // Create user
    const userExists = await User.findOne({ email: 'user@example.com' });
    if (!userExists) {
      await User.create({
        email: 'user@example.com',
        password: 'User@123456',
        fullName: 'User Test',
        role: 'user',
        devices: ['ESP32_001']
      });
      console.log('✓ User created');
    } else {
      console.log('✓ User already exists');
    }

    // Create device
    const device = await Device.findOne({ deviceId: 'ESP32_001' });
    if (!device) {
      await Device.create({
        deviceId: 'ESP32_001',
        name: 'Ao số 1',
        location: 'Khu A',
        status: 'online',
        lastSeen: new Date()
      });
      console.log('✓ Device created');
    } else {
      console.log('✓ Device already exists');
    }

    // Seed telemetry
    const telemetryCount = await Telemetry.countDocuments({ deviceId: 'ESP32_001' });
    if (telemetryCount < 10) {
      const telemetryData = [];
      for (let i = 49; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 5 * 60 * 1000);
        telemetryData.push({
          deviceId: 'ESP32_001',
          timestamp,
          ph: 7 + (Math.random() - 0.5) * 0.8,
          turbidity: 25 + (Math.random() - 0.5) * 20,
          temperature: 26 + (Math.random() - 0.5) * 4,
          pumpState: Math.random() < 0.1
        });
      }
      await Telemetry.insertMany(telemetryData);
      console.log('✓ Mock telemetry created (50 records)');
    } else {
      console.log('✓ Telemetry data already exists');
    }

    console.log('\n✅ Setup complete!');
    console.log('Admin: admin@example.com / Admin@123456');
    console.log('User : user@example.com / User@123456');

    process.exit(0);
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    process.exit(1);
  }
}

setup();

