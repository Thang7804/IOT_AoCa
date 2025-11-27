import React, { useState, useEffect } from 'react';
import { 
  getUsers, 
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getDevices
} from './api';
import toast from 'react-hot-toast';
import './UserManagementPage.css';

function UserManagementPage({ user, onBack }) {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showResetPassword, setShowResetPassword] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user',
    devices: []
  });

  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, devicesRes] = await Promise.all([
        getUsers(),
        getDevices()
      ]);

      setUsers(usersRes.data);
      setDevices(devicesRes.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    // Validate
    if (!formData.email || !formData.password || !formData.fullName) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password phải ít nhất 6 ký tự');
      return;
    }

    try {
      await createUser(formData);
      toast.success('Tạo tài khoản thành công!');
      setShowCreateForm(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.message || 'Không thể tạo tài khoản');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      await updateUser(editingUser._id, {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        devices: formData.devices
      });
      toast.success('Cập nhật thành công!');
      setEditingUser(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật user');
    }
  };

  const handleDelete = async (userId, email) => {
    if (!window.confirm(`Xác nhận xóa user ${email}?`)) return;

    try {
      await deleteUser(userId);
      toast.success('Xóa user thành công!');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Không thể xóa user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password phải ít nhất 6 ký tự');
      return;
    }

    try {
      await resetUserPassword(showResetPassword._id, newPassword);
      toast.success('Reset password thành công!');
      setShowResetPassword(null);
      setNewPassword('');
    } catch (error) {
      toast.error(error.message || 'Không thể reset password');
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '', // Không hiển thị password cũ
      fullName: user.fullName,
      role: user.role,
      devices: user.devices || []
    });
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      fullName: '',
      role: 'user',
      devices: []
    });
  };

  const toggleDeviceSelection = (deviceId) => {
    setFormData(prev => ({
      ...prev,
      devices: prev.devices.includes(deviceId)
        ? prev.devices.filter(d => d !== deviceId)
        : [...prev.devices, deviceId]
    }));
  };

  if (loading) {
    return <div className="um-loading">Đang tải...</div>;
  }

  return (
    <div className="um-container">
      {/* Header */}
      <div className="um-header">
        <div>
          <h1 className="um-title">👥 Quản lý Người dùng</h1>
          <p className="um-subtitle">Tạo và quản lý tài khoản người dùng</p>
        </div>
        <button onClick={onBack} className="um-back-btn">
          ← Quay lại
        </button>
      </div>

      {/* Actions */}
      <div className="um-actions">
        <button 
          onClick={() => {
            resetForm();
            setShowCreateForm(true);
          }} 
          className="um-btn um-btn-primary"
        >
          ➕ Tạo Tài khoản Mới
        </button>
        <div className="um-stats">
          <span>Tổng: {users.length} users</span>
          <span>Admin: {users.filter(u => u.role === 'admin').length}</span>
          <span>User: {users.filter(u => u.role === 'user').length}</span>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingUser) && (
        <div className="um-modal" onClick={() => {
          setShowCreateForm(false);
          setEditingUser(null);
          resetForm();
        }}>
          <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? '✏️ Chỉnh sửa User' : '➕ Tạo Tài khoản Mới'}</h2>
            
            <form onSubmit={editingUser ? handleUpdate : handleCreate}>
              <div className="um-form-group">
                <label>Email: *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="user@example.com"
                  required
                  disabled={editingUser}
                  className="um-input"
                />
              </div>

              {!editingUser && (
                <div className="um-form-group">
                  <label>Password: *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                    minLength={6}
                    className="um-input"
                  />
                </div>
              )}

              <div className="um-form-group">
                <label>Họ tên: *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="Nguyễn Văn A"
                  required
                  className="um-input"
                />
              </div>

              <div className="um-form-group">
                <label>Vai trò:</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="um-select"
                >
                  <option value="user">User (Người dùng)</option>
                  <option value="admin">Admin (Quản trị viên)</option>
                </select>
              </div>

              <div className="um-form-group">
                <label>Devices có quyền truy cập:</label>
                <div className="um-device-checkboxes">
                  {devices.map(device => (
                    <label key={device.deviceId} className="um-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.devices.includes(device.deviceId)}
                        onChange={() => toggleDeviceSelection(device.deviceId)}
                      />
                      <span>{device.name} ({device.deviceId})</span>
                    </label>
                  ))}
                </div>
                {devices.length === 0 && (
                  <p className="um-no-devices">Chưa có device nào</p>
                )}
              </div>

              <div className="um-form-actions">
                <button type="submit" className="um-btn um-btn-success">
                  {editingUser ? 'Cập nhật' : 'Tạo tài khoản'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="um-btn um-btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="um-modal" onClick={() => {
          setShowResetPassword(null);
          setNewPassword('');
        }}>
          <div className="um-modal-content um-modal-small" onClick={(e) => e.stopPropagation()}>
            <h2>🔑 Reset Password</h2>
            <p className="um-reset-info">
              User: <strong>{showResetPassword.email}</strong>
            </p>
            
            <form onSubmit={handleResetPassword}>
              <div className="um-form-group">
                <label>Password mới:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  minLength={6}
                  className="um-input"
                  autoFocus
                />
              </div>

              <div className="um-form-actions">
                <button type="submit" className="um-btn um-btn-success">
                  Đổi Password
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowResetPassword(null);
                    setNewPassword('');
                  }}
                  className="um-btn um-btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="um-table-container">
        <table className="um-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Họ tên</th>
              <th>Vai trò</th>
              <th>Devices</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td>{u.email}</td>
                <td>{u.fullName}</td>
                <td>
                  <span className={`um-role-badge um-role-${u.role}`}>
                    {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                  </span>
                </td>
                <td>
                  {u.role === 'admin' ? (
                    <span className="um-all-devices">🌐 Tất cả</span>
                  ) : u.devices && u.devices.length > 0 ? (
                    <span className="um-device-count">{u.devices.length} devices</span>
                  ) : (
                    <span className="um-no-access">Chưa có</span>
                  )}
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                <td>
                  <div className="um-action-btns">
                    <button
                      onClick={() => startEdit(u)}
                      className="um-btn um-btn-sm um-btn-warning"
                      title="Chỉnh sửa"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setShowResetPassword(u)}
                      className="um-btn um-btn-sm um-btn-info"
                      title="Reset password"
                    >
                      🔑
                    </button>
                    {u._id !== user.id && (
                      <button
                        onClick={() => handleDelete(u._id, u.email)}
                        className="um-btn um-btn-sm um-btn-danger"
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="um-empty">
            <p>Chưa có user nào</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagementPage;

