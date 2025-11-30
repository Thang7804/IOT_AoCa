const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Telemetry = require('../models/Telemetry');
const Device = require('../models/Device');

// GET /api/v1/alerts/active?deviceId=...
router.get('/active', protect, async (req, res) => {
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
      alerts.push({ type: 'ph_low', message: `pH thấp (${latest.ph.toFixed(2)}) dưới ${thresholds.ph.min}`, severity: 'high' });
    }

    if (latest.ph > thresholds.ph.max) {
      alerts.push({ type: 'ph_high', message: `pH cao (${latest.ph.toFixed(2)}) vượt ${thresholds.ph.max}`, severity: 'high' });
    }

    if (latest.turbidity > thresholds.turbidity.max) {
      alerts.push({ type: 'turbidity_high', message: `Độ đục cao (${latest.turbidity.toFixed(1)}) vượt ${thresholds.turbidity.max}`, severity: 'medium' });
    }

    if (latest.temperature < thresholds.temperature.min) {
      alerts.push({ type: 'temp_low', message: `Nhiệt độ thấp (${latest.temperature.toFixed(1)}°C)`, severity: 'medium' });
    }

    if (latest.temperature > thresholds.temperature.max) {
      alerts.push({ type: 'temp_high', message: `Nhiệt độ cao (${latest.temperature.toFixed(1)}°C)`, severity: 'high' });
    }

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
