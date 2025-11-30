const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Telemetry = require('../models/Telemetry');
const Device = require('../models/Device');

// GET /api/v1/telemetry/:deviceId?limit=50
router.get('/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit || '50', 10);

    if (req.user.role !== 'admin' && !(req.user.devices || []).includes(deviceId)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }

    const data = await Telemetry.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ success: true, count: data.length, data: data.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/telemetry/:deviceId/latest
router.get('/:deviceId/latest', protect, async (req, res) => {
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

module.exports = router;
