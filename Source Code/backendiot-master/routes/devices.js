// routes/devices.js
const express = require('express');
const Device = require('../models/Device');
const Telemetry = require('../models/Telemetry');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/v1/devices
 * - Admin: thấy tất cả device
 * - User thường: chỉ thấy device trong user.devices
 */
router.get('/', protect, async (req, res) => {
  try {
    const query =
      req.user.role === 'admin'
        ? {}
        : { deviceId: { $in: req.user.devices || [] } };

    const devices = await Device.find(query).sort({ lastSeen: -1 });

    res.json({
      success: true,
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    console.error('List devices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/devices/:deviceId
 * - Admin: xem mọi device
 * - User: chỉ xem device được gán
 */
router.get('/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (
      req.user.role !== 'admin' &&
      !(req.user.devices || []).includes(deviceId)
    ) {
      return res
        .status(403)
        .json({ success: false, message: 'Không có quyền truy cập' });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy device' });
    }

    const latestTelemetry = await Telemetry.findOne({ deviceId }).sort({
      timestamp: -1,
    });

    res.json({
      success: true,
      data: { device, latestTelemetry },
    });
  } catch (error) {
    console.error('Get device detail error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/devices
 * - Admin tạo mới device
 * Body ví dụ:
 *  {
 *    "deviceId": "ESP32_001",
 *    "name": "Ao số 1",
 *    "location": "Khu A"
 *  }
 */
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Chỉ admin mới tạo được device' });
    }

    const device = await Device.create(req.body);
    res.status(201).json({ success: true, data: device });
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/v1/devices/:deviceId
 * - Admin cập nhật thông tin cơ bản + thresholds
 * Body cho thresholds:
 *  {
 *    "thresholds": {
 *      "ph": { "min": 6.5, "max": 8.5 },
 *      "turbidity": { "max": 50 },
 *      "temperature": { "min": 20, "max": 32 }
 *    }
 *  }
 */
router.put('/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { name, location, thresholds } = req.body;

    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Chỉ admin mới cập nhật được device' });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy device' });
    }

    if (name) device.name = name;
    if (location) device.location = location;
    if (thresholds) {
      const current =
        device.thresholds && typeof device.thresholds.toObject === 'function'
          ? device.thresholds.toObject()
          : {};
      device.thresholds = {
        ...current,
        ...thresholds,
      };
    }

    await device.save();

    res.json({
      success: true,
      message: 'Cập nhật device thành công',
      data: device,
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/v1/devices/:deviceId/config
 * - Admin bật/tắt AUTO & chỉnh aiConfidenceThreshold
 * Body ví dụ:
 *  {
 *    "autoApplyAI": true,
 *    "aiConfidenceThreshold": 0.7
 *  }
 */
router.put('/:deviceId/config', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { autoApplyAI, aiConfidenceThreshold } = req.body;

    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Chỉ admin mới cập nhật config AI' });
    }

    // build phần cần update
    const update = {};
    if (typeof autoApplyAI === 'boolean') {
      update['config.autoApplyAI'] = autoApplyAI;
    }
    if (typeof aiConfidenceThreshold === 'number') {
      update['config.aiConfidenceThreshold'] = aiConfidenceThreshold;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có trường nào để cập nhật (autoApplyAI / aiConfidenceThreshold)',
      });
    }

    const device = await Device.findOneAndUpdate(
      { deviceId },
      { $set: update },
      {
        new: true,          // trả về doc sau khi update
        runValidators: false, // tránh validate name nếu thiếu
      }
    );

    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy device' });
    }

    return res.json({
      success: true,
      message: 'Cập nhật config AI thành công',
      data: {
        deviceId: device.deviceId,
        config: device.config,
      },
    });
  } catch (error) {
    console.error('Update device config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/v1/devices/:deviceId
 * - Admin xóa device và toàn bộ telemetry của nó
 */
router.delete('/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Chỉ admin mới xóa được device' });
    }

    const device = await Device.findOneAndDelete({ deviceId });
    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy device' });
    }

    await Telemetry.deleteMany({ deviceId });

    res.json({
      success: true,
      message: 'Xóa device thành công',
    });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/devices/:deviceId/assign
 * - Admin gán device cho user
 * Body: { "userId": "<mongoId>" }
 */
router.post('/:deviceId/assign', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { userId } = req.body;

    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Chỉ admin mới gán device được' });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: 'Device không tồn tại' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User không tồn tại' });
    }

    if (!user.devices.includes(deviceId)) {
      user.devices.push(deviceId);
      await user.save();
    }

    res.json({
      success: true,
      message: `Đã gán ${deviceId} cho ${user.email}`,
      data: user,
    });
  } catch (error) {
    console.error('Assign device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/v1/devices/:deviceId/assign/:userId
 * - Admin hủy gán device khỏi user
 */
router.delete('/:deviceId/assign/:userId', protect, async (req, res) => {
  try {
    const { deviceId, userId } = req.params;

    if (req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Chỉ admin mới hủy gán được' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User không tồn tại' });
    }

    user.devices = (user.devices || []).filter((d) => d !== deviceId);
    await user.save();

    res.json({
      success: true,
      message: `Đã hủy gán ${deviceId} khỏi ${user.email}`,
    });
  } catch (error) {
    console.error('Unassign device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
