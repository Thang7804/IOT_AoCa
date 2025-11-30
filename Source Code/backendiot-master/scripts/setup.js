// scripts/setup.js
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Device = require('../models/Device');
const Telemetry = require('../models/Telemetry');

async function main() {
  console.log('🔧 SEEDER: Kết nối MongoDB...');
  if (!process.env.MONGODB_URI) {
    console.error('❌ Thiếu MONGODB_URI trong .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(' Đã kết nối MongoDB tới DB:', mongoose.connection.name);

  // ====== ADMIN ======
  const adminEmail = 'admin@example.com';
  const adminPassword = 'Admin@123456';

  let admin = await User.findOne({ email: adminEmail });

  if (!admin) {
    console.log('👑 Chưa có admin, tạo mới...');
    admin = new User({
      email: adminEmail,
      password: adminPassword, // sẽ được hash bởi pre('save')
      fullName: 'System Admin',
      role: 'admin',
      devices: ['ESP32_001'],
    });
    await admin.save();
    console.log(` Admin tạo xong: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('Admin đã tồn tại, cập nhật role & devices...');
    admin.role = 'admin';
    if (!Array.isArray(admin.devices)) admin.devices = [];
    if (!admin.devices.includes('ESP32_001')) {
      admin.devices.push('ESP32_001');
    }
    await admin.save();
    console.log(` Admin cập nhật: ${adminEmail}`);
  }

  // ====== USER THƯỜNG ======
  const userEmail = 'user@example.com';
  const userPassword = 'User@123456';

  let user = await User.findOne({ email: userEmail });

  if (!user) {
    console.log('👤 Chưa có user thường, tạo mới...');
    user = new User({
      email: userEmail,
      password: userPassword,
      fullName: 'Normal User',
      role: 'user',
      devices: ['ESP32_001'],
    });
    await user.save();
    console.log(`User tạo xong: ${userEmail} / ${userPassword}`);
  } else {
    console.log('User đã tồn tại, cập nhật devices...');
    if (!Array.isArray(user.devices)) user.devices = [];
    if (!user.devices.includes('ESP32_001')) {
      user.devices.push('ESP32_001');
    }
    await user.save();
    console.log(`User cập nhật: ${userEmail}`);
  }

  // ====== DEVICE ESP32_001 ======
  const deviceId = 'ESP32_001';

  let device = await Device.findOne({ deviceId });

  if (!device) {
    console.log('Chưa có device ESP32_001, tạo mới...');
    device = new Device({
      deviceId,
      name: 'Ao số 1',
      location: 'Khu A',
      status: 'offline',
      lastSeen: new Date(),
      thresholds: {
        ph: { min: 6.5, max: 8.5 },
        turbidity: { max: 3000 },
        temperature: { min: 20, max: 35 },
      },
      firmware: {
        currentVersion: '1.0.0',
        availableVersion: '1.0.0',
        updateStatus: 'idle',
        updateProgress: 0,
        updateHistory: [],
      },
      config: {
        autoApplyAI: true,
        aiConfidenceThreshold: 0.7,
      },
    });
    await device.save();
    console.log('Device ESP32_001 đã được tạo');
  } else {
    console.log('Device ESP32_001 đã tồn tại, giữ nguyên');
  }

  // ====== DEMO TELEMETRY (optional) ======
  const countTele = await Telemetry.countDocuments({ deviceId });
  if (countTele === 0) {
    console.log('Chưa có telemetry, tạo vài bản ghi demo...');
    const now = new Date();
    const docs = [];
    for (let i = 5; i >= 1; i--) {
      docs.push({
        deviceId,
        timestamp: new Date(now.getTime() - i * 60 * 1000),
        ph: 7.0 + (Math.random() - 0.5) * 0.3,
        turbidity: 100 + Math.random() * 50,
        temperature: 27 + (Math.random() - 0.5) * 1.0,
        pumpState: false,
      });
    }
    await Telemetry.insertMany(docs);
    console.log('Đã thêm demo telemetry');
  } else {
    console.log(` Telemetry đã có (${countTele} bản ghi)`);
  }

  console.log('DONE. Có thể login bằng:');
  console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`   User : ${userEmail} / ${userPassword}`);

  await mongoose.disconnect();
  console.log('Đã đóng kết nối MongoDB');
  process.exit(0);
}

main().catch((err) => {
  console.error(' Lỗi seeder:', err);
  process.exit(1);
});
