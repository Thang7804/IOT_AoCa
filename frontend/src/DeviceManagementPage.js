import React, { useState, useEffect } from 'react';
import {
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  getUsers,
  assignDeviceToUser,
  unassignDeviceFromUser
} from './api';
import toast from 'react-hot-toast';
import OTAUpdateModal from './OTAUpdateModal';
import './DeviceManagementPage.css';

function DeviceManagementPage({ onBack }) {
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [showAssignForm, setShowAssignForm] = useState(null);
  const [otaDevice, setOtaDevice] = useState(null);

  const [formData, setFormData] = useState(defaultForm());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [devicesRes, usersRes] = await Promise.all([
        getDevices(),
        getUsers()
      ]);

      setDevices(devicesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createDevice(formData);
      toast.success('Tạo device thành công!');
      setShowCreateForm(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Không thể tạo device');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateDevice(editingDevice.deviceId, {
        name: formData.name,
        location: formData.location,
        thresholds: formData.thresholds
      });
      toast.success('Cập nhật thành công!');
      setEditingDevice(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Không thể cập nhật device');
    }
  };

  const handleDelete = async (deviceId) => {
    if (!window.confirm(`Xác nhận xóa device ${deviceId}?`)) return;
    try {
      await deleteDevice(deviceId);
      toast.success('Xóa device thành công!');
      loadData();
    } catch (error) {
      toast.error('Không thể xóa device');
    }
  };

  const handleAssign = async (deviceId, userId) => {
    try {
      await assignDeviceToUser(deviceId, userId);
      toast.success('Gán device thành công!');
      setShowAssignForm(null);
      loadData();
    } catch (error) {
      toast.error('Không thể gán device');
    }
  };

  const handleUnassign = async (deviceId, userId) => {
    try {
      await unassignDeviceFromUser(deviceId, userId);
      toast.success('Hủy gán thành công!');
      loadData();
    } catch (error) {
      toast.error('Không thể hủy gán');
    }
  };

  const startEdit = (device) => {
    setEditingDevice(device);
    setFormData({
      deviceId: device.deviceId,
      name: device.name,
      location: device.location || '',
      thresholds: device.thresholds
    });
  };

  const resetForm = () => {
    setFormData(defaultForm());
  };

  const getUsersWithDevice = (deviceId) => {
    return users.filter((u) => (u.devices || []).includes(deviceId));
  };

  if (loading) {
    return <div className="dm-loading">Đang tải...</div>;
  }

  return (
    <div className="dm-container">
      <div className="dm-header">
        <div>
          <h1 className="dm-title">🔧 Quản lý Thiết bị</h1>
          <p className="dm-subtitle">Quản lý devices và phân quyền cho users</p>
        </div>
        <button onClick={onBack} className="dm-back-btn">
          ← Quay lại Dashboard
        </button>
      </div>

      <div className="dm-actions">
        <button
          onClick={() => {
            resetForm();
            setEditingDevice(null);
            setShowCreateForm(true);
          }}
          className="dm-btn dm-btn-primary"
        >
          ➕ Tạo Device Mới
        </button>
      </div>

      {(showCreateForm || editingDevice) && (
        <div className="dm-modal">
          <div className="dm-modal-content">
            <h2>{editingDevice ? '✏️ Chỉnh sửa Device' : '➕ Tạo Device Mới'}</h2>

            <form onSubmit={editingDevice ? handleUpdate : handleCreate}>
              <div className="dm-form-group">
                <label>Device ID:</label>
                <input
                  type="text"
                  value={formData.deviceId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deviceId: e.target.value.toUpperCase()
                    })
                  }
                  placeholder="ESP32_001"
                  required
                  disabled={editingDevice}
                  className="dm-input"
                />
              </div>

              <div className="dm-form-group">
                <label>Tên thiết bị:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value
                    })
                  }
                  placeholder="Ao tôm số 1"
                  required
                  className="dm-input"
                />
              </div>

              <div className="dm-form-group">
                <label>Vị trí:</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: e.target.value
                    })
                  }
                  placeholder="Khu A - Hàng 1"
                  className="dm-input"
                />
              </div>

              <ThresholdInputs formData={formData} setFormData={setFormData} />

              <div className="dm-form-actions">
                <button type="submit" className="dm-btn dm-btn-success">
                  {editingDevice ? 'Cập nhật' : 'Tạo'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingDevice(null);
                    resetForm();
                  }}
                  className="dm-btn dm-btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dm-devices-grid">
        {devices.map((device) => (
          <div key={device.deviceId} className="dm-device-card">
            <div className="dm-device-header">
              <div>
                <h3>{device.name}</h3>
                <p className="dm-device-id">{device.deviceId}</p>
              </div>
              <span className={`dm-status ${device.status}`}>
                {device.status === 'online' ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>

            <div className="dm-device-body">
              <p>
                <strong>Vị trí:</strong> {device.location || 'Chưa có'}
              </p>
              <p>
                <strong>Last seen:</strong>{' '}
                {device.lastSeen
                  ? new Date(device.lastSeen).toLocaleString('vi-VN')
                  : 'Chưa có'}
              </p>

              <div className="dm-thresholds">
                <p>
                  <strong>Ngưỡng:</strong>
                </p>
                <ul>
                  <li>
                    pH: {device.thresholds.ph.min} - {device.thresholds.ph.max}
                  </li>
                  <li>Độ đục: ≤ {device.thresholds.turbidity.max} NTU</li>
                  <li>
                    Nhiệt độ: {device.thresholds.temperature.min}°C -{' '}
                    {device.thresholds.temperature.max}°C
                  </li>
                </ul>
              </div>

              <div className="dm-assigned-users">
                <p>
                  <strong>
                    Users có quyền ({getUsersWithDevice(device.deviceId).length}):
                  </strong>
                </p>
                {getUsersWithDevice(device.deviceId).length > 0 ? (
                  <ul>
                    {getUsersWithDevice(device.deviceId).map((u) => (
                      <li key={u._id}>
                        {u.email}
                        <button
                          onClick={() => handleUnassign(device.deviceId, u._id)}
                          className="dm-btn-unassign"
                          title="Hủy gán"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dm-no-users">Chưa gán cho user nào</p>
                )}
              </div>
            </div>

            <div className="dm-device-actions">
              <button
                onClick={() => setOtaDevice(device)}
                className="dm-btn dm-btn-info"
                title="OTA Firmware Update"
              >
                📡 OTA
              </button>
              <button
                onClick={() =>
                  setShowAssignForm(
                    showAssignForm === device.deviceId ? null : device.deviceId
                  )
                }
                className="dm-btn dm-btn-info"
              >
                👤 Gán User
              </button>
              <button
                onClick={() => {
                  startEdit(device);
                  setShowCreateForm(true);
                }}
                className="dm-btn dm-btn-warning"
              >
                ✏️ Sửa
              </button>
              <button
                onClick={() => handleDelete(device.deviceId)}
                className="dm-btn dm-btn-danger"
              >
                🗑️ Xóa
              </button>
            </div>

            {showAssignForm === device.deviceId && (
              <div className="dm-assign-dropdown">
                <p>
                  <strong>Chọn user để gán:</strong>
                </p>
                {users.filter((u) => !(u.devices || []).includes(device.deviceId))
                  .length > 0 ? (
                  <ul>
                    {users
                      .filter((u) => !(u.devices || []).includes(device.deviceId))
                      .map((u) => (
                        <li
                          key={u._id}
                          onClick={() => handleAssign(device.deviceId, u._id)}
                          className="dm-user-item"
                        >
                          {u.email} ({u.role})
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>Tất cả users đã được gán</p>
                )}
                <button
                  onClick={() => setShowAssignForm(null)}
                  className="dm-btn dm-btn-secondary dm-btn-small"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="dm-empty">
          <p>Chưa có device nào. Tạo device đầu tiên!</p>
        </div>
      )}

      {otaDevice && (
        <OTAUpdateModal
          device={otaDevice}
          onClose={() => setOtaDevice(null)}
        />
      )}
    </div>
  );
}

function ThresholdInputs({ formData, setFormData }) {
  return (
    <>
      <div className="dm-form-group">
        <label>Ngưỡng pH:</label>
        <div className="dm-threshold-row">
          <input
            type="number"
            step="0.1"
            value={formData.thresholds.ph.min}
            onChange={(e) =>
              setFormData({
                ...formData,
                thresholds: {
                  ...formData.thresholds,
                  ph: { ...formData.thresholds.ph, min: parseFloat(e.target.value) }
                }
              })
            }
            className="dm-input-small"
          />
          <span>đến</span>
          <input
            type="number"
            step="0.1"
            value={formData.thresholds.ph.max}
            onChange={(e) =>
              setFormData({
                ...formData,
                thresholds: {
                  ...formData.thresholds,
                  ph: { ...formData.thresholds.ph, max: parseFloat(e.target.value) }
                }
              })
            }
            className="dm-input-small"
          />
        </div>
      </div>

      <div className="dm-form-group">
        <label>Ngưỡng Độ đục (NTU):</label>
        <input
          type="number"
          value={formData.thresholds.turbidity.max}
          onChange={(e) =>
            setFormData({
              ...formData,
              thresholds: {
                ...formData.thresholds,
                turbidity: { max: parseFloat(e.target.value) }
              }
            })
          }
          className="dm-input-small"
        />
      </div>

      <div className="dm-form-group">
        <label>Ngưỡng Nhiệt độ (°C):</label>
        <div className="dm-threshold-row">
          <input
            type="number"
            step="0.1"
            value={formData.thresholds.temperature.min}
            onChange={(e) =>
              setFormData({
                ...formData,
                thresholds: {
                  ...formData.thresholds,
                  temperature: {
                    ...formData.thresholds.temperature,
                    min: parseFloat(e.target.value)
                  }
                }
              })
            }
            className="dm-input-small"
          />
          <span>đến</span>
          <input
            type="number"
            step="0.1"
            value={formData.thresholds.temperature.max}
            onChange={(e) =>
              setFormData({
                ...formData,
                thresholds: {
                  ...formData.thresholds,
                  temperature: {
                    ...formData.thresholds.temperature,
                    max: parseFloat(e.target.value)
                  }
                }
              })
            }
            className="dm-input-small"
          />
        </div>
      </div>
    </>
  );
}

function defaultForm() {
  return {
    deviceId: '',
    name: '',
    location: '',
    thresholds: {
      ph: { min: 6.5, max: 8.5 },
      turbidity: { max: 50 },
      temperature: { min: 20, max: 32 }
    }
  };
}

export default DeviceManagementPage;

