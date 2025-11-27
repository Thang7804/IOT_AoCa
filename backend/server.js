require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mqtt = require('mqtt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
  mqttClient.subscribe('agrosense/+/ota_progress', (err) => {
    if (err) {
      console.error('MQTT subscribe error:', err);
    } else {
      console.log('Subscribed to agrosense/+/ota_progress');
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const parts = topic.split('/');
    const deviceId = parts[1];
    const messageType = parts[2] || 'telemetry';
    const payload = JSON.parse(message.toString());

    if (messageType === 'telemetry') {
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
    }

    // Handle OTA progress
    if (messageType === 'ota_progress') {
      const device = await Device.findOne({ deviceId });
      if (device) {
        device.firmware.updateStatus = payload.status || 'downloading';
        device.firmware.updateProgress = payload.progress || 0;
        
        if (payload.status === 'success') {
          device.firmware.currentVersion = payload.version;
          device.firmware.updateHistory.push({
            version: payload.version,
            updatedAt: new Date(),
            success: true
          });
        } else if (payload.status === 'failed') {
          device.firmware.updateError = payload.error || 'Unknown error';
          device.firmware.updateHistory.push({
            version: payload.version,
            updatedAt: new Date(),
            success: false,
            error: payload.error
          });
        }
        
        await device.save();
        console.log(`[${deviceId}] OTA Progress: ${payload.status} ${payload.progress}%`);
      }
    }
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

// Admin tạo tài khoản cho user
app.post('/api/v1/users/create', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới tạo tài khoản được' 
      });
    }

    const { email, password, fullName, role, devices } = req.body;

    // Validate
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password và fullName là bắt buộc' 
      });
    }

    // Check email đã tồn tại
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email đã tồn tại' 
      });
    }

    // Tạo user
    const user = await User.create({
      email,
      password,
      fullName,
      role: role || 'user',
      devices: devices || []
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        devices: user.devices
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Xóa user (Admin only)
app.delete('/api/v1/users/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới xóa user được' 
      });
    }

    // Không cho xóa chính mình
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa chính mình' 
      });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại' 
      });
    }

    res.json({
      success: true,
      message: `Đã xóa user ${user.email}`
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cập nhật thông tin user (Admin only)
app.put('/api/v1/users/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, email, role, devices } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới sửa user được' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại' 
      });
    }

    // Cập nhật
    if (fullName) user.fullName = fullName;
    if (email && email !== user.email) {
      // Kiểm tra email mới có trùng không
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email đã tồn tại' 
        });
      }
      user.email = email;
    }
    if (role) user.role = role;
    if (devices) user.devices = devices;

    await user.save();

    res.json({
      success: true,
      message: 'Cập nhật user thành công',
      data: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        devices: user.devices
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset password user (Admin only)
app.post('/api/v1/users/:userId/reset-password', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới reset password được' 
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password phải ít nhất 6 ký tự' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại' 
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: `Đã reset password cho ${user.email}`
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== FILE UPLOAD CONFIG ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/firmware';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const deviceId = req.params.deviceId || 'unknown';
    const version = req.body.version || Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `firmware_${deviceId}_v${version}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExt = ['.bin', '.hex', '.elf'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file .bin, .hex hoặc .elf'));
    }
  }
});

// ==================== OTA ROUTES ====================

// Upload firmware file
app.post('/api/v1/firmware/upload/:deviceId', protect, upload.single('firmware'), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { version, description } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới upload firmware được' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không có file được upload' 
      });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ 
        success: false, 
        message: 'Device không tồn tại' 
      });
    }

    device.firmware.availableVersion = version;
    device.firmware.lastUpdateCheck = new Date();
    await device.save();

    res.json({
      success: true,
      message: 'Upload firmware thành công',
      data: {
        deviceId,
        version,
        filename: req.file.filename,
        size: req.file.size,
        path: req.file.path
      }
    });

  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Trigger OTA update
app.post('/api/v1/firmware/update/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { version } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới trigger update được' 
      });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ 
        success: false, 
        message: 'Device không tồn tại' 
      });
    }

    if (device.status !== 'online') {
      return res.status(400).json({ 
        success: false, 
        message: 'Device đang offline, không thể update' 
      });
    }

    const firmwarePath = `./uploads/firmware/firmware_${deviceId}_v${version}.bin`;
    if (!fs.existsSync(firmwarePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'File firmware không tồn tại' 
      });
    }

    device.firmware.updateStatus = 'pending';
    device.firmware.updateProgress = 0;
    device.firmware.updateError = null;
    await device.save();

    const otaCommand = {
      cmd_id: `OTA_${Date.now()}`,
      action: 'OTA_UPDATE',
      version,
      url: `http://${req.get('host')}/api/v1/firmware/download/${deviceId}/${version}`,
      size: fs.statSync(firmwarePath).size
    };

    mqttClient.publish(
      `agrosense/${deviceId}/cmd`,
      JSON.stringify(otaCommand)
    );

    res.json({
      success: true,
      message: 'Đã gửi lệnh OTA update tới device',
      data: {
        deviceId,
        version,
        status: 'pending'
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download firmware (cho ESP32)
app.get('/api/v1/firmware/download/:deviceId/:version', async (req, res) => {
  try {
    const { deviceId, version } = req.params;

    const firmwarePath = path.join(__dirname, 'uploads', 'firmware', `firmware_${deviceId}_v${version}.bin`);

    if (!fs.existsSync(firmwarePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'File firmware không tồn tại' 
      });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="firmware_${deviceId}_v${version}.bin"`);
    res.setHeader('Content-Length', fs.statSync(firmwarePath).size);

    const fileStream = fs.createReadStream(firmwarePath);
    fileStream.pipe(res);

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lấy firmware info
app.get('/api/v1/firmware/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (req.user.role !== 'admin' && !req.user.devices.includes(deviceId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Không có quyền truy cập' 
      });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ 
        success: false, 
        message: 'Device không tồn tại' 
      });
    }

    const firmwareDir = './uploads/firmware';
    const files = fs.existsSync(firmwareDir) 
      ? fs.readdirSync(firmwareDir)
          .filter(f => f.startsWith(`firmware_${deviceId}_`))
          .map(f => {
            const stats = fs.statSync(path.join(firmwareDir, f));
            const versionMatch = f.match(/v([0-9.]+)/);
            return {
              filename: f,
              version: versionMatch ? versionMatch[1] : 'unknown',
              size: stats.size,
              uploadedAt: stats.mtime
            };
          })
      : [];

    res.json({
      success: true,
      data: {
        deviceId,
        currentVersion: device.firmware.currentVersion,
        availableVersion: device.firmware.availableVersion,
        updateStatus: device.firmware.updateStatus,
        updateProgress: device.firmware.updateProgress,
        updateError: device.firmware.updateError,
        lastUpdateCheck: device.firmware.lastUpdateCheck,
        updateHistory: device.firmware.updateHistory || [],
        availableFiles: files
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Xóa firmware file
app.delete('/api/v1/firmware/:deviceId/:version', protect, async (req, res) => {
  try {
    const { deviceId, version } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới xóa firmware được' 
      });
    }

    const firmwarePath = `./uploads/firmware/firmware_${deviceId}_v${version}.bin`;

    if (!fs.existsSync(firmwarePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'File firmware không tồn tại' 
      });
    }

    fs.unlinkSync(firmwarePath);

    res.json({
      success: true,
      message: 'Xóa firmware thành công'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Serve static files
app.use('/uploads', express.static('uploads'));

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

