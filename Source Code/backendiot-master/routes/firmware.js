const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Device = require('../models/Device');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mqttHandler = require('../mqtt-handler');

// File upload storage config (moved from server.js)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/firmware';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
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
    if (allowedExt.includes(ext)) cb(null, true); else cb(new Error('Chỉ chấp nhận file .bin, .hex hoặc .elf'));
  }
});

// POST /api/v1/firmware/upload/:deviceId
router.post('/upload/:deviceId', protect, upload.single('firmware'), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { version } = req.body;

    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Chỉ admin mới upload firmware được' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Không có file được upload' });

    const device = await Device.findOne({ deviceId });
    if (!device) { fs.unlinkSync(req.file.path); return res.status(404).json({ success: false, message: 'Device không tồn tại' }); }

    device.firmware.availableVersion = version;
    device.firmware.lastUpdateCheck = new Date();
    await device.save();

    res.json({ success: true, message: 'Upload firmware thành công', data: { deviceId, version, filename: req.file.filename, size: req.file.size, path: req.file.path } });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/firmware/update/:deviceId
router.post('/update/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { version } = req.body;

    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Chỉ admin mới trigger update được' });

    const device = await Device.findOne({ deviceId });
    if (!device) return res.status(404).json({ success: false, message: 'Device không tồn tại' });
    if (device.status !== 'online') return res.status(400).json({ success: false, message: 'Device đang offline, không thể update' });

    const firmwarePath = `./uploads/firmware/firmware_${deviceId}_v${version}.bin`;
    if (!fs.existsSync(firmwarePath)) return res.status(404).json({ success: false, message: 'File firmware không tồn tại' });

    device.firmware.updateStatus = 'pending';
    device.firmware.updateProgress = 0;
    device.firmware.updateError = null;
    await device.save();

    const otaCommand = { cmd_id: `OTA_${Date.now()}`, action: 'OTA_UPDATE', version, url: `http://${req.get('host')}/api/v1/firmware/download/${deviceId}/${version}`, size: fs.statSync(firmwarePath).size };

    const _mqttClient = mqttHandler.getClient();
    if (_mqttClient) _mqttClient.publish(`agrosense/${deviceId}/cmd`, JSON.stringify(otaCommand)); else console.warn('MQTT client not ready, cannot publish OTA command');

    res.json({ success: true, message: 'Đã gửi lệnh OTA update tới device', data: { deviceId, version, status: 'pending' } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/firmware/download/:deviceId/:version
router.get('/download/:deviceId/:version', async (req, res) => {
  try {
    const { deviceId, version } = req.params;
    const firmwarePath = path.join(__dirname, '..', 'uploads', 'firmware', `firmware_${deviceId}_v${version}.bin`);
    if (!fs.existsSync(firmwarePath)) return res.status(404).json({ success: false, message: 'File firmware không tồn tại' });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="firmware_${deviceId}_v${version}.bin"`);
    res.setHeader('Content-Length', fs.statSync(firmwarePath).size);

    const fileStream = fs.createReadStream(firmwarePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/firmware/:deviceId
router.get('/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (req.user.role !== 'admin' && !req.user.devices.includes(deviceId)) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });

    const device = await Device.findOne({ deviceId });
    if (!device) return res.status(404).json({ success: false, message: 'Device không tồn tại' });

    const firmwareDir = './uploads/firmware';
    const files = fs.existsSync(firmwareDir) ? fs.readdirSync(firmwareDir).filter(f => f.startsWith(`firmware_${deviceId}_`)).map(f => { const stats = fs.statSync(path.join(firmwareDir, f)); const versionMatch = f.match(/v([0-9.]+)/); return { filename: f, version: versionMatch ? versionMatch[1] : 'unknown', size: stats.size, uploadedAt: stats.mtime }; }) : [];

    res.json({ success: true, data: { deviceId, currentVersion: device.firmware.currentVersion, availableVersion: device.firmware.availableVersion, updateStatus: device.firmware.updateStatus, updateProgress: device.firmware.updateProgress, updateError: device.firmware.updateError, lastUpdateCheck: device.firmware.lastUpdateCheck, updateHistory: device.firmware.updateHistory || [], availableFiles: files } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/firmware/:deviceId/:version
router.delete('/:deviceId/:version', protect, async (req, res) => {
  try {
    const { deviceId, version } = req.params;
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Chỉ admin mới xóa firmware được' });

    const firmwarePath = `./uploads/firmware/firmware_${deviceId}_v${version}.bin`;
    if (!fs.existsSync(firmwarePath)) return res.status(404).json({ success: false, message: 'File firmware không tồn tại' });

    fs.unlinkSync(firmwarePath);
    res.json({ success: true, message: 'Xóa firmware thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
