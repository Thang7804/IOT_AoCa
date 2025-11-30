const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/v1/users
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới xem được danh sách users' });
    }

    const users = await User.find().select('-password');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/users/:userId/role
router.put('/:userId/role', protect, async (req, res) => {
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
    if (!user) return res.status(404).json({ success: false, message: 'User không tồn tại' });

    user.role = role;
    await user.save();

    res.json({ success: true, message: `Đã đổi role của ${user.email} thành ${role}`, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/users/create
router.post('/create', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới tạo tài khoản được' });
    }

    const { email, password, fullName, role, devices } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Email, password và fullName là bắt buộc' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });

    const user = await User.create({ email, password, fullName, role: role || 'user', devices: devices || [] });

    res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', data: { id: user._id, email: user.email, fullName: user.fullName, role: user.role, devices: user.devices } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/users/:userId
router.delete('/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Chỉ admin mới xóa user được' });
    if (userId === req.user._id.toString()) return res.status(400).json({ success: false, message: 'Không thể xóa chính mình' });

    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User không tồn tại' });

    res.json({ success: true, message: `Đã xóa user ${user.email}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/users/:userId
router.put('/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, email, role, devices } = req.body;

    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Chỉ admin mới sửa user được' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User không tồn tại' });

    if (fullName) user.fullName = fullName;
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
      user.email = email;
    }
    if (role) user.role = role;
    if (devices) user.devices = devices;

    await user.save();

    res.json({ success: true, message: 'Cập nhật user thành công', data: { id: user._id, email: user.email, fullName: user.fullName, role: user.role, devices: user.devices } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/users/:userId/reset-password
router.post('/:userId/reset-password', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Chỉ admin mới reset password được' });
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password phải ít nhất 6 ký tự' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User không tồn tại' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: `Đã reset password cho ${user.email}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
