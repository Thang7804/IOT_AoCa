import React, { useState, useEffect, useCallback } from 'react';
import { 
  getDevices, 
  getLatestTelemetry, 
  getTelemetryData,
  sendPumpCommand,
  getActiveAlerts,
  logout 
} from './api';
import toast from 'react-hot-toast';
import './DashboardPage.css';

function DashboardPage({ user, onLogout, onManageDevices, onManageUsers }) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pumpDuration, setPumpDuration] = useState(120);

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadDeviceData();
      loadAlerts();
      
      const interval = setInterval(loadDeviceData, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice]);

  const loadDevices = async () => {
    try {
      const result = await getDevices();
      setDevices(result.data);
      if (result.data.length > 0) {
        setSelectedDevice(result.data[0].deviceId);
      }
    } catch (error) {
      toast.error('Không thể tải danh sách thiết bị');
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceData = useCallback(async () => {
    if (!selectedDevice) return;

    try {
      const [latest, history] = await Promise.all([
        getLatestTelemetry(selectedDevice),
        getTelemetryData(selectedDevice, { limit: 20 })
      ]);

      setLatestData(latest.data);
      setHistoryData(history.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [selectedDevice]);

  const loadAlerts = useCallback(async () => {
    if (!selectedDevice) return;

    try {
      const result = await getActiveAlerts(selectedDevice);
      setAlerts(result.data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  }, [selectedDevice]);

  const handlePumpControl = async () => {
    if (!selectedDevice) return;

    try {
      await sendPumpCommand(selectedDevice, pumpDuration);
      toast.success(`Đã gửi lệnh bơm ${pumpDuration}s`);
      loadDeviceData();
    } catch (error) {
      toast.error('Không thể gửi lệnh bơm');
    }
  };

  const handleLogout = () => {
    logout();
    onLogout();
    toast.success('Đã đăng xuất');
  };

  const canControlDevice = () => {
    return user.role === 'admin' || 
      (selectedDevice && user.assignedDevices?.some(d => 
        d.deviceId === selectedDevice && ['control', 'admin'].includes(d.permission)
      ));
  };

  if (loading) {
    return <div className="dashboard-loading">Đang tải...</div>;
  }

  if (devices.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-header-info">
            <h1 className="dashboard-page-title">🌊 Dashboard</h1>
          </div>
          <button onClick={handleLogout} className="dashboard-logout-btn">
            Đăng xuất
          </button>
        </div>
        <div className="dashboard-empty">
          <h2>Chưa có thiết bị nào</h2>
          <p>Liên hệ Admin để được cấp quyền truy cập thiết bị</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-info">
          <h1 className="dashboard-page-title">🌊 Water Quality Dashboard</h1>
          <p className="dashboard-user-info">
            👤 {user.fullName} • <strong>{user.role}</strong>
          </p>
        </div>
        <div className="dashboard-header-actions">
          {user.role === 'admin' && (
            <>
              <button
                onClick={onManageDevices}
                className="dashboard-manage-btn"
              >
                🛠️ Quản lý thiết bị
              </button>
              <button
                onClick={onManageUsers}
                className="dashboard-manage-btn"
              >
                👥 Quản lý User
              </button>
            </>
          )}
          <button onClick={handleLogout} className="dashboard-logout-btn">
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Device Selector */}
      <div className="dashboard-section">
        <h3>📍 Chọn thiết bị giám sát:</h3>
        <select 
          value={selectedDevice || ''} 
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="dashboard-select"
        >
          {devices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.userAlias || device.name} • {device.deviceId} • {device.status === 'online' ? '🟢 Online' : '🔴 Offline'}
            </option>
          ))}
        </select>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="dashboard-alerts-section">
          <h3>⚠️ Cảnh báo đang hoạt động ({alerts.length})</h3>
          {alerts.map(alert => (
            <div key={alert._id} className="dashboard-alert-card">
              <strong>{alert.type.replace('_', ' ')}</strong>: {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Latest Data */}
      {latestData && (
        <div className="dashboard-section">
          <h3>📊 Dữ liệu hiện tại • Cập nhật: {new Date(latestData.timestamp).toLocaleTimeString('vi-VN')}</h3>
          <div className="dashboard-metrics-grid">
            <MetricCard 
              title="pH"
              value={latestData.ph.toFixed(2)}
              unit=""
              color="#3b82f6"
            />
            <MetricCard 
              title="Độ đục"
              value={latestData.turbidity.toFixed(1)}
              unit="NTU"
              color="#f59e0b"
            />
            <MetricCard 
              title="Nhiệt độ"
              value={latestData.temperature.toFixed(1)}
              unit="°C"
              color="#ef4444"
            />
            <MetricCard 
              title="Trạng thái bơm"
              value={latestData.pumpState ? 'ON' : 'OFF'}
              unit=""
              color={latestData.pumpState ? '#10b981' : '#6b7280'}
            />
          </div>
        </div>
      )}

      {/* Pump Control */}
      {canControlDevice() ? (
        <div className="dashboard-section">
          <h3>🎛️ Điều khiển bơm</h3>
          <div className="dashboard-control-panel">
            <input
              type="number"
              value={pumpDuration}
              onChange={(e) => setPumpDuration(Number(e.target.value))}
              min="10"
              max="600"
              className="dashboard-input"
              placeholder="Thời gian (giây)"
            />
            <button onClick={handlePumpControl} className="dashboard-pump-btn">
              💧 Bật bơm {pumpDuration}s
            </button>
          </div>
        </div>
      ) : (
        <div className="dashboard-section">
          <p className="dashboard-no-permission">
            ℹ️ Bạn chỉ có quyền xem dữ liệu. Liên hệ Admin để được cấp quyền điều khiển.
          </p>
        </div>
      )}

      {/* History Table */}
      {historyData.length > 0 && (
        <div className="dashboard-section">
          <h3>📈 Lịch sử dữ liệu (20 bản ghi gần nhất)</h3>
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>pH</th>
                  <th>Độ đục (NTU)</th>
                  <th>Nhiệt độ (°C)</th>
                  <th>Bơm</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map((record, index) => (
                  <tr key={index}>
                    <td>{new Date(record.timestamp).toLocaleString('vi-VN')}</td>
                    <td>{record.ph.toFixed(2)}</td>
                    <td>{record.turbidity.toFixed(1)}</td>
                    <td>{record.temperature.toFixed(1)}</td>
                    <td>
                      <span 
                        className="dashboard-badge"
                        style={{ background: record.pumpState ? '#10b981' : '#6b7280' }}
                      >
                        {record.pumpState ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, unit, color }) {
  return (
    <div className="dashboard-metric-card" style={{ borderLeftColor: color }}>
      <div className="dashboard-metric-title">{title}</div>
      <div className="dashboard-metric-value">
        {value} <span className="dashboard-metric-unit">{unit}</span>
      </div>
    </div>
  );
}

export default DashboardPage;