const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const mqttHandler = require('../mqtt-handler');

// POST /api/v1/commands/:deviceId/pump
router.post('/:deviceId/pump', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { action, duration = 0 } = req.body;

    if (req.user.role !== 'admin' && !(req.user.devices || []).includes(deviceId)) {
      return res.status(403).json({ success: false, message: 'Không có quyền điều khiển' });
    }

    const cmdId = `CMD_${Date.now()}`;
    const command = { cmd_id: cmdId, action, dur_s: duration };

    const _mqttClient = mqttHandler.getClient();
    if (_mqttClient) {
      _mqttClient.publish(`agrosense/${deviceId}/cmd`, JSON.stringify(command), (err) => {
        if (err) console.error('MQTT publish error:', err);
      });
    } else {
      console.warn('MQTT client not ready, cannot publish command');
    }

    res.json({
      success: true,
      message: 'Lệnh đã được gửi',
      data: { cmdId, deviceId, action, duration }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
