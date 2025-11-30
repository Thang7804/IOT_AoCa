import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

const API_BASE = "http://localhost:5000/api/v1";

// ================== PRESENTATIONAL COMPONENTS ==================

function Navbar({
  lastUpdate,
  connected,
  user,
  devices,
  selectedDeviceId,
  onSelectDevice,
  onLogout,
}) {
  return (
    <header className="navbar">
      <div className="nav-left">
        <div className="logo-dot" />
        <span className="logo-text">AQUA IoT</span>
      </div>

      <nav className="nav-center">
        <a href="#dashboard">Dashboard</a>
        <a href="#history">History</a>
        <a href="#settings">Settings</a>
        {user?.role === "admin" && <a href="#admin">Admin</a>}
        <a href="#about">About</a>
      </nav>

      <div className="nav-right">
        {user && (
          <div className="device-select">
            <span className="device-label">Device:</span>
            <select
              value={selectedDeviceId || ""}
              onChange={(e) => onSelectDevice(e.target.value)}
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId} – {d.name || "No name"}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="connection-indicator">
          <span className={`status-dot ${connected ? "online" : "offline"}`} />
          <span>{connected ? "Connected" : "Disconnected"}</span>
        </div>

        <div className="last-update">Last update: {lastUpdate || "N/A"}</div>

        {user && (
          <div className="user-info">
            <span className="user-name">
              {user.fullName || user.email} ({user.role})
            </span>
            <button className="btn btn-small" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function StatCard({ label, value, subtitle, badgeText, badgeType }) {
  return (
    <div className="card stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label-row">
        <div className="stat-label">{label}</div>
        {badgeText && (
          <span className={`badge ${badgeType ? `badge-${badgeType}` : ""}`}>
            {badgeText}
          </span>
        )}
      </div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}

function PumpCard({ status, mode }) {
  const text = `${mode}: ${status}`;
  return (
    <div className="card pump-card">
      <div className="pump-icon">🛢️</div>
      <div className="pump-text">{text}</div>
    </div>
  );
}

function AiStatusCard({ ai }) {
  if (!ai) {
    return (
      <div className="card ai-card">
        <div className="card-title">AI đánh giá nước hiện tại</div>
        <div>Đang tải dữ liệu AI...</div>
      </div>
    );
  }

  const badgeColorClass =
    ai.water_quality_label === "POOR"
      ? "ai-badge-danger"
      : ai.water_quality_label === "GOOD"
      ? "ai-badge-warning"
      : "ai-badge-good";

  const probPercent = Math.round((ai.confidence || 0) * 100);

  return (
    <div className="card ai-card">
      <div className="card-title">AI đánh giá nước hiện tại</div>
      <div className={`ai-badge ${badgeColorClass}`}>
        {ai.water_quality_label} ({probPercent}%)
      </div>
      <div className="ai-row">
        <span>Khuyến nghị:</span>
        <span className="ai-strong">{ai.recommend}</span>
      </div>
      {ai.duration != null && (
        <div className="ai-row">
          <span>Thời gian bơm gợi ý:</span>
          <span className="ai-strong">{ai.duration}s</span>
        </div>
      )}
      <div className="ai-row">
        <span>Class:</span>
        <span className="ai-strong">{ai.water_quality_class}</span>
      </div>
      <div className="ai-progress">
        <div
          className="ai-progress-fill"
          style={{ width: `${probPercent}%` }}
        />
      </div>
      {ai.message && <div className="ai-note">{ai.message}</div>}
    </div>
  );
}

function ForecastCard({ forecast }) {
  if (!forecast) {
    return (
      <div className="card forecast-card">
        <div className="card-title">Dự đoán sau 30 phút</div>
        <div>Đang tải dữ liệu dự đoán...</div>
      </div>
    );
  }

  return (
    <div className="card forecast-card">
      <div className="card-title">
        Dự đoán sau {forecast.horizon_minutes} phút
      </div>
      <div className="forecast-row">
        <span>pH:</span>
        <span className="forecast-value">{forecast.ph.toFixed(2)}</span>
      </div>
      <div className="forecast-row">
        <span>Turbidity:</span>
        <span className="forecast-value">
          {forecast.turbidity.toFixed(1)} NTU
        </span>
      </div>
      <div className="forecast-row">
        <span>Temp:</span>
        <span className="forecast-value">{forecast.temp.toFixed(1)}°C</span>
      </div>
      <div className="forecast-note">
        Kết quả từ mô hình AI dự đoán cảm biến sau 30 phút.
      </div>
    </div>
  );
}

function ChartPanel({ historyData }) {
  return (
    <div className="card chart-card">
      <div className="card-title">Biểu đồ cảm biến theo thời gian</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={historyData}>
          <XAxis dataKey="time" />
          <YAxis yAxisId="left" domain={[0, 40]} tickCount={9} />
          <YAxis yAxisId="right" orientation="right" domain={[0, "auto"]} />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ph"
            name="pH"
            stroke="#3b82f6"
            dot={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temp"
            name="Temperature (°C)"
            stroke="#10b981"
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="turbidity"
            name="Turbidity (NTU)"
            stroke="#f97316"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HistoryTable({ rows }) {
  const [showAll, setShowAll] = useState(false);

  const hasData = rows && rows.length > 0;
  const visibleRows = showAll ? rows : rows.slice(0, 5);

  return (
    <div className="card history-card">
      <div className="card-title">Lịch sử & phân tích</div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>pH</th>
              <th>Turbidity</th>
              <th>Temp</th>
              <th>Pump</th>
            </tr>
          </thead>
          <tbody>
            {!hasData ? (
              <tr>
                <td colSpan="5">Chưa có dữ liệu</td>
              </tr>
            ) : (
              visibleRows.map((row, i) => (
                <tr key={i}>
                  <td>{row.time}</td>
                  <td>{row.ph.toFixed(2)}</td>
                  <td>{row.turbidity.toFixed(1)}</td>
                  <td>{row.temp.toFixed(1)}</td>
                  <td>{row.pumpStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Nút Xem thêm / Thu gọn */}
      {hasData && rows.length > 5 && (
        <div className="history-more">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? "Thu gọn" : "Xem thêm"}
          </button>
        </div>
      )}
    </div>
  );
}

function AlertsList({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="alerts-list">
        <div className="alert-item alert-ok">Không có cảnh báo.</div>
      </div>
    );
  }

  return (
    <div className="alerts-list">
      {alerts.map((a, idx) => (
        <div
          key={idx}
          className={`alert-item alert-${a.severity || "medium"}`}
        >
          {a.message}
        </div>
      ))}
    </div>
  );
}

function ThresholdCard({ currentThresholds, onSave, saving }) {
  const [localThresholds, setLocalThresholds] = useState(
    currentThresholds || {
      ph: { min: 6.5, max: 8.5 },
      turbidity: { max: 300 },
      temperature: { min: 20, max: 35 },
    }
  );

  useEffect(() => {
    if (currentThresholds) {
      setLocalThresholds(currentThresholds);
    }
  }, [currentThresholds]);

  const handleChange = (path, value) => {
    setLocalThresholds((prev) => {
      const next = { ...prev };
      const [group, key] = path.split(".");
      next[group] = { ...next[group], [key]: value };
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(localThresholds);
  };

  return (
    <div className="card settings-card">
      <div className="card-title">Ngưỡng chất lượng nước</div>
      <form onSubmit={handleSubmit} className="threshold-form">
        <div className="settings-group">
          <div className="settings-row">
            <span>pH min</span>
            <input
              type="number"
              step="0.1"
              value={localThresholds.ph.min}
              onChange={(e) =>
                handleChange("ph.min", parseFloat(e.target.value))
              }
            />
          </div>
          <div className="settings-row">
            <span>pH max</span>
            <input
              type="number"
              step="0.1"
              value={localThresholds.ph.max}
              onChange={(e) =>
                handleChange("ph.max", parseFloat(e.target.value))
              }
            />
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-row">
            <span>Turbidity max (NTU)</span>
            <input
              type="number"
              step="1"
              value={localThresholds.turbidity.max}
              onChange={(e) =>
                handleChange("turbidity.max", parseFloat(e.target.value))
              }
            />
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-row">
            <span>Temp min (°C)</span>
            <input
              type="number"
              step="0.5"
              value={localThresholds.temperature.min}
              onChange={(e) =>
                handleChange("temperature.min", parseFloat(e.target.value))
              }
            />
          </div>
          <div className="settings-row">
            <span>Temp max (°C)</span>
            <input
              type="number"
              step="0.5"
              value={localThresholds.temperature.max}
              onChange={(e) =>
                handleChange("temperature.max", parseFloat(e.target.value))
              }
            />
          </div>
        </div>

        <button
          className="btn btn-primary full-width"
          type="submit"
          disabled={saving}
        >
          {saving ? "Đang lưu..." : "Lưu ngưỡng"}
        </button>
      </form>
    </div>
  );
}

function PumpControlCard({ mode, onModeChange, onCommand, sending }) {
  const [duration, setDuration] = useState(30);

  return (
    <div className="card settings-card">
      <div className="card-title">Chế độ bơm</div>
      <div className="pump-mode">
        <button
          type="button"
          className={`pill ${mode === "AUTO" ? "pill-active" : ""}`}
          onClick={() => onModeChange("AUTO")}
        >
          AUTO
        </button>
        <button
          type="button"
          className={`pill ${mode === "MANUAL" ? "pill-active" : ""}`}
          onClick={() => onModeChange("MANUAL")}
        >
          MANUAL
        </button>
      </div>

      <div className="settings-group">
        <div className="settings-row">
          <span>Thời gian bật (s)</span>
          <input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value || "0", 10))}
          />
        </div>
      </div>

      <div className="pump-buttons">
        <button
          className="btn btn-primary"
          type="button"
          disabled={mode !== "MANUAL" || sending}
          onClick={() => onCommand("PUMP_ON", duration)}
        >
          {sending && mode === "MANUAL" ? "Đang gửi..." : "Bật bơm"}
        </button>
        <button
          className="btn"
          type="button"
          disabled={mode !== "MANUAL" || sending}
          onClick={() => onCommand("PUMP_OFF", 0)}
        >
          Tắt bơm
        </button>
      </div>
    </div>
  );
}

// ================== ADMIN PANEL ==================

function AdminPanel({
  token,
  devices,
  setDevices,
  selectedDeviceId,
  setSelectedDeviceId,
  authFetch,
}) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [newDevice, setNewDevice] = useState({
    deviceId: "",
    name: "",
    location: "",
  });
  const [assignDeviceId, setAssignDeviceId] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [firmwareVersion, setFirmwareVersion] = useState("");
  const [firmwareFile, setFirmwareFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setAdminMessage("");
    try {
      const res = await authFetch(`${API_BASE}/users`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data || []);
      } else {
        setAdminMessage(json.message || "Không lấy được danh sách user");
      }
    } catch (err) {
      setAdminMessage("Lỗi khi load users: " + err.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (token) {
      loadUsers();
    }
  }, [token, loadUsers]);

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    setBusy(true);
    setAdminMessage("");
    try {
      const res = await authFetch(`${API_BASE}/devices`, {
        method: "POST",
        body: JSON.stringify(newDevice),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Tạo device thất bại");
      }
      setDevices((prev) => [...prev, json.data]);
      if (!selectedDeviceId) {
        setSelectedDeviceId(json.data.deviceId);
      }
      setNewDevice({ deviceId: "", name: "", location: "" });
      setAdminMessage("Tạo device thành công");
    } catch (err) {
      setAdminMessage("Lỗi tạo device: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignDeviceId || !assignUserId) return;
    setBusy(true);
    setAdminMessage("");
    try {
      const res = await authFetch(
        `${API_BASE}/devices/${encodeURIComponent(assignDeviceId)}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ userId: assignUserId }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Assign thất bại");
      setAdminMessage(json.message || "Gán device thành công");
      loadUsers();
    } catch (err) {
      setAdminMessage("Lỗi assign: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnassign = async (deviceId, userId) => {
    if (!window.confirm(`Hủy gán ${deviceId} khỏi user này?`)) return;
    setBusy(true);
    setAdminMessage("");
    try {
      const res = await authFetch(
        `${API_BASE}/devices/${encodeURIComponent(
          deviceId
        )}/assign/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Unassign thất bại");
      setAdminMessage(json.message || "Hủy gán thành công");
      loadUsers();
    } catch (err) {
      setAdminMessage("Lỗi unassign: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFirmware = async (e) => {
    e.preventDefault();
    if (!selectedDeviceId) {
      setAdminMessage("Chọn device trước khi upload firmware");
      return;
    }
    if (!firmwareFile) {
      setAdminMessage("Chọn file firmware (.bin) trước");
      return;
    }
    if (!firmwareVersion) {
      setAdminMessage("Nhập version firmware");
      return;
    }
    setBusy(true);
    setAdminMessage("");

    try {
      const formData = new FormData();
      formData.append("firmware", firmwareFile);
      formData.append("version", firmwareVersion);

      const res = await fetch(
        `${API_BASE}/firmware/upload/${encodeURIComponent(selectedDeviceId)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Upload thất bại");
      setAdminMessage("Upload firmware thành công");
    } catch (err) {
      setAdminMessage("Lỗi upload firmware: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleTriggerOTA = async () => {
    if (!selectedDeviceId) {
      setAdminMessage("Chọn device trước khi trigger OTA");
      return;
    }
    if (!firmwareVersion) {
      setAdminMessage("Nhập version firmware để OTA");
      return;
    }
    setBusy(true);
    setAdminMessage("");
    try {
      const res = await authFetch(
        `${API_BASE}/firmware/update/${encodeURIComponent(selectedDeviceId)}`,
        {
          method: "POST",
          body: JSON.stringify({ version: firmwareVersion }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "OTA thất bại");
      setAdminMessage(json.message || "Đã gửi lệnh OTA");
    } catch (err) {
      setAdminMessage("Lỗi trigger OTA: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="admin" className="admin-section">
      <h2>Admin Panel</h2>
      {adminMessage && <div className="admin-message">{adminMessage}</div>}

      <div className="admin-grid">
        {/* Device management */}
        <div className="card admin-card">
          <div className="card-title">Quản lý thiết bị</div>
          <div className="admin-subtitle">Danh sách devices</div>
          <div className="table-wrapper admin-table">
            <table>
              <thead>
                <tr>
                  <th>DeviceId</th>
                  <th>Tên</th>
                  <th>Vị trí</th>
                  <th>Trạng thái</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan="5">Chưa có device</td>
                  </tr>
                ) : (
                  devices.map((d) => (
                    <tr key={d.deviceId}>
                      <td>{d.deviceId}</td>
                      <td>{d.name}</td>
                      <td>{d.location}</td>
                      <td>{d.status}</td>
                      <td>
                        {d.lastSeen
                          ? new Date(d.lastSeen).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleCreateDevice} className="admin-form">
            <div className="admin-subtitle">Tạo device mới</div>
            <input
              type="text"
              placeholder="Device ID (ví dụ ESP32_001)"
              required
              value={newDevice.deviceId}
              onChange={(e) =>
                setNewDevice((p) => ({ ...p, deviceId: e.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Tên hiển thị"
              value={newDevice.name}
              onChange={(e) =>
                setNewDevice((p) => ({ ...p, name: e.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Vị trí"
              value={newDevice.location}
              onChange={(e) =>
                setNewDevice((p) => ({ ...p, location: e.target.value }))
              }
            />
            <button
              className="btn btn-primary full-width"
              type="submit"
              disabled={busy}
            >
              {busy ? "Đang xử lý..." : "Tạo device"}
            </button>
          </form>
        </div>

        {/* User mapping */}
        <div className="card admin-card">
          <div className="card-title">User & Device mapping</div>
          {loadingUsers ? (
            <div>Đang tải danh sách user...</div>
          ) : (
            <div className="table-wrapper admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Devices</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4">Chưa có user</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u._id}>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{(u.devices || []).join(", ") || "None"}</td>
                        <td>
                          {(u.devices || []).map((dId) => (
                            <button
                              key={dId}
                              type="button"
                              className="btn btn-small"
                              onClick={() => handleUnassign(dId, u._id)}
                            >
                              Hủy {dId}
                            </button>
                          ))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={handleAssign} className="admin-form">
            <div className="admin-subtitle">Gán device cho user</div>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              required
            >
              <option value="">Chọn user…</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.email} ({u.role})
                </option>
              ))}
            </select>
            <select
              value={assignDeviceId}
              onChange={(e) => setAssignDeviceId(e.target.value)}
              required
            >
              <option value="">Chọn device…</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary full-width"
              type="submit"
              disabled={busy}
            >
              {busy ? "Đang xử lý..." : "Gán device"}
            </button>
          </form>
        </div>

        {/* Firmware */}
        <div className="card admin-card">
          <div className="card-title">Firmware & OTA</div>
          <div className="admin-subtitle">
            Device đang chọn: {selectedDeviceId || "Chưa chọn"}
          </div>

          <form onSubmit={handleUploadFirmware} className="admin-form">
            <input
              type="text"
              placeholder="Version (ví dụ 1.0.0)"
              value={firmwareVersion}
              onChange={(e) => setFirmwareVersion(e.target.value)}
            />
            <input
              type="file"
              accept=".bin,.hex,.elf"
              onChange={(e) => setFirmwareFile(e.target.files[0] || null)}
            />
            <button
              className="btn btn-primary full-width"
              type="submit"
              disabled={busy}
            >
              {busy ? "Đang upload..." : "Upload firmware"}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-outline full-width"
            disabled={busy}
            onClick={handleTriggerOTA}
          >
            {busy ? "Đang gửi OTA..." : "Trigger OTA update"}
          </button>

          <p className="admin-note">
            Lưu ý: OTA chỉ thành công nếu device đang online và ESP32 đã
            implement xử lý lệnh OTA từ MQTT topic{" "}
            <code>agrosense/&lt;deviceId&gt;/cmd</code>.
          </p>
        </div>
      </div>
    </section>
  );
}

// ================== LOGIN SCREEN ==================

function LoginScreen({ onLogin, loggingIn, error }) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin@123456");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1>AQUA IoT Dashboard</h1>
        <p className="login-subtitle">
          Đăng nhập bằng tài khoản backend (JWT) để giám sát ao nuôi.
        </p>
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button
            className="btn btn-primary full-width"
            type="submit"
            disabled={loggingIn}
          >
            {loggingIn ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="login-hint">
          Mặc định seeder: <code>admin@example.com / Admin@123456</code> hoặc{" "}
          <code>user@example.com / User@123456</code>
        </div>
      </div>
    </div>
  );
}

// ================== MAIN APP ==================

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("aqua_token") || ""
  );
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("aqua_user");
    return raw ? JSON.parse(raw) : null;
  });

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [aiInfo, setAiInfo] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [sendingPump, setSendingPump] = useState(false);
  const [pumpMode, setPumpMode] = useState("AUTO");

  // Helper fetch with JWT
  const authFetch = useCallback(
    (url, options = {}) => {
      if (!token) {
        throw new Error("Missing token");
      }
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      };
      return fetch(url, { ...options, headers });
    },
    [token]
  );

  // Login handler
  const handleLogin = async (email, password) => {
    setLoggingIn(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Đăng nhập thất bại");
      }
      const { user: u, token: t } = json.data;
      setUser(u);
      setToken(t);
      localStorage.setItem("aqua_token", t);
      localStorage.setItem("aqua_user", JSON.stringify(u));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken("");
    setDevices([]);
    setSelectedDeviceId("");
    setCurrent(null);
    setHistory([]);
    setAlerts([]);
    setAiInfo(null);
    setForecast(null);
    setError("");
    localStorage.removeItem("aqua_token");
    localStorage.removeItem("aqua_user");
  };

  // Load devices for logged-in user
  const loadDevices = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authFetch(`${API_BASE}/devices`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Lỗi load devices");
      const list = json.data || [];
      setDevices(list);
      if (!selectedDeviceId && list.length > 0) {
        setSelectedDeviceId(list[0].deviceId);
      }
    } catch (err) {
      setError("Lỗi khi tải danh sách device: " + err.message);
    }
  }, [authFetch, token, selectedDeviceId]);

  useEffect(() => {
    if (token) {
      loadDevices();
    }
  }, [token, loadDevices]);

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);

  // Đồng bộ pumpMode từ backend config (autoApplyAI)
  useEffect(() => {
    if (selectedDevice && selectedDevice.config) {
      setPumpMode(selectedDevice.config.autoApplyAI ? "AUTO" : "MANUAL");
    }
  }, [selectedDevice]);

  // Load telemetry + alerts + AI + forecast cho 1 device
  const loadDeviceData = useCallback(
    async (deviceId) => {
      if (!deviceId || !token) return;
      try {
        setError("");
        // latest telemetry
        const latestRes = await authFetch(
          `${API_BASE}/telemetry/${encodeURIComponent(deviceId)}/latest`
        );
        const latestJson = await latestRes.json();
        if (!latestJson.success) {
          throw new Error(latestJson.message || "Không lấy được telemetry");
        }
        const latest = latestJson.data;

        const mappedCurrent = {
          ph: latest.ph,
          turbidity: latest.turbidity,
          temp: latest.temperature,
          pumpState: latest.pumpState ? "ON" : "OFF",
          timestamp: latest.timestamp,
        };
        setCurrent(mappedCurrent);
        setConnected(true);
        setLastUpdate(
          latest.timestamp
            ? new Date(latest.timestamp).toLocaleTimeString()
            : ""
        );

        // history
        const histRes = await authFetch(
          `${API_BASE}/telemetry/${encodeURIComponent(deviceId)}?limit=200`
        );
        const histJson = await histRes.json();
        if (histJson.success) {
          const rawList = histJson.data || [];

          // SẮP XẾP: mới nhất (timestamp lớn nhất) lên TRÊN
          const sorted = rawList
            .slice()
            .sort(
              (a, b) =>
                new Date(b.timestamp || 0).getTime() -
                new Date(a.timestamp || 0).getTime()
            );

          const rows = sorted.map((item) => {
            const t = item.timestamp ? new Date(item.timestamp) : new Date();
            return {
              time: t.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              ph: item.ph,
              turbidity: item.turbidity,
              temp: item.temperature,
              pumpStatus: item.pumpState ? "ON" : "OFF",
            };
          });

          setHistory(rows);
        }

        // alerts
        const alertRes = await authFetch(
          `${API_BASE}/alerts/active?deviceId=${encodeURIComponent(deviceId)}`
        );
        const alertJson = await alertRes.json();
        if (alertJson.success) {
          setAlerts(alertJson.data || []);
        }

        // AI classify (Node -> FastAPI)
        try {
          const aiRes = await authFetch(`${API_BASE}/ai/predict`, {
            method: "POST",
            body: JSON.stringify({
              ph: mappedCurrent.ph,
              turbidity: mappedCurrent.turbidity,
              temperature: mappedCurrent.temp,
            }),
          });
          const aiJson = await aiRes.json();
          if (aiJson.success) {
            const d = aiJson.data;
            setAiInfo({
              water_quality_label: d.water_quality_label,
              water_quality_class: d.water_quality_class,
              confidence: d.confidence,
              recommend: d.recommend,
              duration: d.duration,
              message: d.message,
            });
          }
        } catch (err) {
          console.warn("AI predict error:", err);
        }

        // Forecast (NodeJS -> AI model)
        try {
          const fcRes = await authFetch(`${API_BASE}/ai/forecast`, {
            method: "POST",
            body: JSON.stringify({
              ph: mappedCurrent.ph,
              turbidity: mappedCurrent.turbidity,
              temperature: mappedCurrent.temp,
            }),
          });

          const fcJson = await fcRes.json();
          console.log("DEBUG forecast response:", fcJson);

          if (fcJson.success && fcJson.data) {
            const d = fcJson.data;

            // FastAPI trả: ph, turbidity, temperature
            const ph = typeof d.ph === "number" ? d.ph : null;
            const turb = typeof d.turbidity === "number" ? d.turbidity : null;
            const temp = typeof d.temperature === "number"
              ? d.temperature
              : typeof d.temp === "number"
              ? d.temp
              : null;

            if (ph != null && turb != null && temp != null) {
              setForecast({
                horizon_minutes: d.horizon_minutes || 30,
                ph,
                turbidity: turb,
                temp,
              });
            } else {
              // Nếu thiếu field nào thì coi như chưa có forecast hợp lệ
              console.warn("Forecast data missing fields:", d);
              setForecast(null);
            }
          } else {
            setForecast(null);
          }
        } catch (err) {
          console.warn("Forecast error:", err);
          setForecast(null);
        }

      } catch (err) {
        setError("Lỗi khi tải dữ liệu device: " + err.message);
        setConnected(false);
      }
    },
    [authFetch, token]
  );

  // Poll every 10s
  useEffect(() => {
    if (!token || !selectedDeviceId) return;
    loadDeviceData(selectedDeviceId);
    const id = setInterval(() => {
      loadDeviceData(selectedDeviceId);
    }, 10000);
    return () => clearInterval(id);
  }, [token, selectedDeviceId, loadDeviceData]);

  const handleUpdateThresholds = async (thresholds) => {
    if (!selectedDeviceId) return;
    setSavingThresholds(true);
    try {
      const res = await authFetch(
        `${API_BASE}/devices/${encodeURIComponent(selectedDeviceId)}`,
        {
          method: "PUT",
          body: JSON.stringify({ thresholds }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Lỗi lưu ngưỡng");
      // cập nhật devices local
      setDevices((prev) =>
        prev.map((d) => (d.deviceId === selectedDeviceId ? json.data : d))
      );
    } catch (err) {
      setError("Lỗi lưu ngưỡng: " + err.message);
    } finally {
      setSavingThresholds(false);
    }
  };

  // thay đổi mode -> gọi backend /devices/:id/config
  const handlePumpModeChange = async (mode) => {
    if (!selectedDeviceId) return;
    setPumpMode(mode); // update UI ngay cho mượt

    const autoApplyAI = mode === "AUTO";

    try {
      const res = await authFetch(
        `${API_BASE}/devices/${encodeURIComponent(selectedDeviceId)}/config`,
        {
          method: "PUT",
          body: JSON.stringify({
            autoApplyAI,
          }),
        }
      );
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Lỗi cập nhật config AI");
      }

      // cập nhật devices local với config mới
      const newConfig = json.data?.config || {
        autoApplyAI,
      };

      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === selectedDeviceId
            ? {
                ...d,
                config: {
                  ...(d.config || {}),
                  ...newConfig,
                },
              }
            : d
        )
      );
    } catch (err) {
      setError("Lỗi cập nhật chế độ bơm: " + err.message);
      // nếu fail thì revert UI về trạng thái trước
      setPumpMode((old) => (autoApplyAI ? "MANUAL" : "AUTO"));
    }
  };

  const handlePumpCommand = async (action, duration) => {
    if (!selectedDeviceId) return;
    setSendingPump(true);
    try {
      const res = await authFetch(
        `${API_BASE}/commands/${encodeURIComponent(selectedDeviceId)}/pump`,
        {
          method: "POST",
          body: JSON.stringify({ action, duration }),
        }
      );
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Gửi lệnh thất bại");
      }
    } catch (err) {
      setError("Lỗi gửi lệnh bơm: " + err.message);
    } finally {
      setSendingPump(false);
    }
  };

  const currentDisplay = {
    ph: current?.ph ?? 0,
    turbidity: current?.turbidity ?? 0,
    temp: current?.temp ?? 0,
    pumpMode,
    pumpStatus: current?.pumpState || "OFF",
  };

  // Chưa login -> màn hình login
  if (!user || !token) {
    return (
      <div className="app">
        <LoginScreen
          onLogin={handleLogin}
          loggingIn={loggingIn}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar
        lastUpdate={lastUpdate}
        connected={connected}
        user={user}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
        onLogout={handleLogout}
      />

      <main className="main">
        {error && <div className="error-banner">Lỗi: {error}</div>}

        <section id="dashboard" className="summary-grid">
          <StatCard
            label="pH hiện tại"
            value={currentDisplay.ph.toFixed(2)}
            badgeText={
              currentDisplay.ph >= 6.5 && currentDisplay.ph <= 8.5
                ? "OK"
                : "OUT"
            }
            badgeType={
              currentDisplay.ph >= 6.5 && currentDisplay.ph <= 8.5
                ? "ok"
                : "warn"
            }
          />
          <StatCard
            label="Độ đục (NTU)"
            value={`${currentDisplay.turbidity.toFixed(1)} NTU`}
          />
          <StatCard
            label="Nhiệt độ nước"
            value={`${currentDisplay.temp.toFixed(1)}°C`}
          />
          <PumpCard
            status={currentDisplay.pumpStatus}
            mode={currentDisplay.pumpMode}
          />
        </section>

        <section className="ai-forecast-grid">
          <AiStatusCard ai={aiInfo} />
          <ForecastCard forecast={forecast} />
        </section>

        <section className="chart-section">
          <ChartPanel historyData={history} />
        </section>

        <section className="bottom-grid">
          <div id="history" className="bottom-left">
            <HistoryTable rows={history} />
            <div className="card alerts-card">
              <div className="card-title">Cảnh báo ngưỡng</div>
              <AlertsList alerts={alerts} />
            </div>
          </div>
          <div id="settings" className="bottom-right">
            <ThresholdCard
              currentThresholds={selectedDevice?.thresholds}
              onSave={handleUpdateThresholds}
              saving={savingThresholds}
            />
            <PumpControlCard
              mode={pumpMode}
              onModeChange={handlePumpModeChange}
              onCommand={handlePumpCommand}
              sending={sendingPump}
            />
          </div>
        </section>

        {user.role === "admin" && (
          <AdminPanel
            token={token}
            devices={devices}
            setDevices={setDevices}
            selectedDeviceId={selectedDeviceId}
            setSelectedDeviceId={setSelectedDeviceId}
            authFetch={authFetch}
          />
        )}

        <section id="about" className="about-section">
          <h2>Giới thiệu hệ thống</h2>
          <p>
            Hệ thống IoT giám sát chất lượng nước ao nuôi với 3 cảm biến pH, độ
            đục và nhiệt độ. Dữ liệu được gửi từ ESP32 lên backend qua MQTT, lưu
            MongoDB, mô hình AI (FastAPI) đánh giá chất lượng nước hiện tại và
            dự đoán trạng thái sau 30 phút, từ đó hỗ trợ quyết định bật/tắt bơm
            tự động hoặc cho phép người dùng thao tác thủ công.
          </p>
          <p>
            Frontend này kết nối trực tiếp với backend NodeJS qua JWT, phân
            quyền user/admin, quản lý thiết bị, firmware OTA và toàn bộ dòng dữ
            liệu sensor/AI theo đúng kiến trúc đồ án của bạn.
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
