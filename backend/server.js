require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mqtt = require('mqtt');

const User = require('./models/User');
const Device = require('./models/Device');
const Telemetry = require('./models/Telemetry');
const { protect } = require('./middleware/auth');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// ==================== DATABASE ====================
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => {
    console.error('MongoDB error:', err);
    process.exit(1);
  });

// ==================== MQTT ====================
const mqttBroker = process.env.MQTT_BROKER;

if (!mqttBroker) {
  console.error('❌ MQTT_BROKER is not set in .env');
  process.exit(1);
}

const mqttClient = mqtt.connect(mqttBroker);

mqttClient.on('connect', () => {
  console.log('✓ MQTT connected');
  mqttClient.subscribe('agrosense/+/telemetry', (err) => {
    if (err) {
      console.error('MQTT subscribe error:', err);
    } else {
      console.log('Subscribed to agrosense/+/telemetry');
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const [, deviceId] = topic.split('/');
    const payload = JSON.parse(message.toString());

    await Telemetry.create({
      deviceId,
      ph: payload.ph,
      turbidity: payload.turbidity,
      temperature: payload.temperature,
      pumpState: payload.pump_state || false
    });

    await Device.findOneAndUpdate(
      { deviceId },
      { status: 'online', lastSeen: new Date() },
      { upsert: true, setDefaultsOnInsert: true }
    );

    console.log(`[${deviceId}] Data saved: pH=${payload.ph}, turb=${payload.turbidity}`);
  } catch (error) {
    console.error('MQTT message error:', error);
  }
});

// ==================== AUTH ROUTES ====================
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
    }

    const user = await User.create({ email, password, fullName });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          devices: user.devices
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          devices: user.devices
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/v1/auth/me', protect, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role,
      devices: req.user.devices
    }
  });
});

// ==================== DEVICE ROUTES ====================
app.get('/api/v1/devices', protect, async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? {}
      : { deviceId: { $in: req.user.devices || [] } };

    const devices = await Device.find(query).sort({ lastSeen: -1 });

    res.json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/v1/devices/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (req.user.role !== 'admin' && !(req.user.devices || []).includes(deviceId)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy device' });
    }

    const latestTelemetry = await Telemetry.findOne({ deviceId }).sort({ timestamp: -1 });

    res.json({
      success: true,
      data: { device, latestTelemetry }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/v1/devices', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới tạo được device' });
    }

    const device = await Device.create(req.body);
    res.status(201).json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cập nhật device
app.put('/api/v1/devices/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { name, location, thresholds } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới cập nhật được device' });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy device' });
    }

    if (name) device.name = name;
    if (location) device.location = location;
    if (thresholds) {
      device.thresholds = {
        ...device.thresholds.toObject(),
        ...thresholds
      };
    }

    await device.save();

    res.json({
      success: true,
      message: 'Cập nhật device thành công',
      data: device
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Xóa device
app.delete('/api/v1/devices/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới xóa được device' });
    }

    const device = await Device.findOneAndDelete({ deviceId });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy device' });
    }

    await Telemetry.deleteMany({ deviceId });

    res.json({
      success: true,
      message: 'Xóa device thành công'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Gán device cho user
app.post('/api/v1/devices/:deviceId/assign', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { userId } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới gán device được' });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device không tồn tại' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User không tồn tại' });
    }

    if (!user.devices.includes(deviceId)) {
      user.devices.push(deviceId);
      await user.save();
    }

    res.json({
      success: true,
      message: `Đã gán ${deviceId} cho ${user.email}`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hủy gán device khỏi user
app.delete('/api/v1/devices/:deviceId/assign/:userId', protect, async (req, res) => {
  try {
    const { deviceId, userId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới hủy gán được' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User không tồn tại' });
    }

    user.devices = (user.devices || []).filter(d => d !== deviceId);
    await user.save();

    res.json({
      success: true,
      message: `Đã hủy gán ${deviceId} khỏi ${user.email}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== TELEMETRY ROUTES ====================
app.get('/api/v1/telemetry/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit || '50', 10);

    if (req.user.role !== 'admin' && !(req.user.devices || []).includes(deviceId)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }

    const data = await Telemetry.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: data.length,
      data: data.reverse()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/v1/telemetry/:deviceId/latest', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (req.user.role !== 'admin' && !(req.user.devices || []).includes(deviceId)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }

    const data = await Telemetry.findOne({ deviceId }).sort({ timestamp: -1 });

    if (!data) {
      return res.status(404).json({ success: false, message: 'Chưa có dữ liệu' });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== COMMAND ROUTES ====================
app.post('/api/v1/commands/:deviceId/pump', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { action, duration = 0 } = req.body;

    if (req.user.role !== 'admin' && !(req.user.devices || []).includes(deviceId)) {
      return res.status(403).json({ success: false, message: 'Không có quyền điều khiển' });
    }

    const cmdId = `CMD_${Date.now()}`;
    const command = { cmd_id: cmdId, action, dur_s: duration };

    mqttClient.publish(`agrosense/${deviceId}/cmd`, JSON.stringify(command), (err) => {
      if (err) {
        console.error('MQTT publish error:', err);
      }
    });

    res.json({
      success: true,
      message: 'Lệnh đã được gửi',
      data: { cmdId, deviceId, action, duration }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ALERT ROUTES ====================
app.get('/api/v1/alerts/active', protect, async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.json({ success: true, count: 0, data: [] });
    }

    if (req.user.role !== 'admin' && !(req.user.devices || []).includes(deviceId)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }

    const latest = await Telemetry.findOne({ deviceId }).sort({ timestamp: -1 });
    if (!latest) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const alerts = [];
    const { thresholds } = device;

    if (latest.ph < thresholds.ph.min) {
      alerts.push({
        type: 'ph_low',
        message: `pH thấp (${latest.ph.toFixed(2)}) dưới ${thresholds.ph.min}`,
        severity: 'high'
      });
    }

    if (latest.ph > thresholds.ph.max) {
      alerts.push({
        type: 'ph_high',
        message: `pH cao (${latest.ph.toFixed(2)}) vượt ${thresholds.ph.max}`,
        severity: 'high'
      });
    }

    if (latest.turbidity > thresholds.turbidity.max) {
      alerts.push({
        type: 'turbidity_high',
        message: `Độ đục cao (${latest.turbidity.toFixed(1)}) vượt ${thresholds.turbidity.max}`,
        severity: 'medium'
      });
    }

    if (latest.temperature < thresholds.temperature.min) {
      alerts.push({
        type: 'temp_low',
        message: `Nhiệt độ thấp (${latest.temperature.toFixed(1)}°C)`,
        severity: 'medium'
      });
    }

    if (latest.temperature > thresholds.temperature.max) {
      alerts.push({
        type: 'temp_high',
        message: `Nhiệt độ cao (${latest.temperature.toFixed(1)}°C)`,
        severity: 'high'
      });
    }

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== USER MANAGEMENT ====================
app.get('/api/v1/users', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới xem được danh sách users' });
    }

    const users = await User.find().select('-password');
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/v1/users/:userId/role', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới đổi role được' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User không tồn tại' });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `Đã đổi role của ${user.email} thành ${role}`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    mqtt: mqttClient.connected ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 BACKEND SIMPLE STARTED!');
  console.log('='.repeat(50));
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/v1`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log('='.repeat(50) + '\n');
});

