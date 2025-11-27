import React, { useState, useEffect } from 'react';
import { 
  getFirmwareInfo, 
  uploadFirmware, 
  triggerOTAUpdate,
  deleteFirmware 
} from './api';
import toast from 'react-hot-toast';
import './OTAUpdateModal.css';

function OTAUpdateModal({ device, onClose }) {
  const [firmwareInfo, setFirmwareInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [newVersion, setNewVersion] = useState('');

  useEffect(() => {
    loadFirmwareInfo();
    
    // Auto refresh every 3 seconds nếu đang update
    const interval = setInterval(() => {
      if (firmwareInfo?.updateStatus === 'downloading' || 
          firmwareInfo?.updateStatus === 'updating') {
        loadFirmwareInfo();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [device.deviceId, firmwareInfo?.updateStatus]);

  const loadFirmwareInfo = async () => {
    try {
      const result = await getFirmwareInfo(device.deviceId);
      setFirmwareInfo(result.data);
    } catch (error) {
      toast.error('Không thể tải thông tin firmware');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File quá lớn! Tối đa 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Vui lòng chọn file firmware');
      return;
    }

    if (!newVersion) {
      toast.error('Vui lòng nhập version');
      return;
    }

    setUploading(true);

    try {
      await uploadFirmware(device.deviceId, selectedFile, newVersion);
      toast.success('Upload firmware thành công!');
      setSelectedFile(null);
      setNewVersion('');
      loadFirmwareInfo();
    } catch (error) {
      toast.error('Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleTriggerUpdate = async (version) => {
    if (!window.confirm(`Xác nhận update lên version ${version}?`)) return;

    try {
      await triggerOTAUpdate(device.deviceId, version);
      toast.success('Đã gửi lệnh update!');
      loadFirmwareInfo();
    } catch (error) {
      toast.error('Không thể gửi lệnh update');
    }
  };

  const handleDeleteFirmware = async (version) => {
    if (!window.confirm(`Xác nhận xóa firmware v${version}?`)) return;

    try {
      await deleteFirmware(device.deviceId, version);
      toast.success('Xóa firmware thành công!');
      loadFirmwareInfo();
    } catch (error) {
      toast.error('Không thể xóa firmware');
    }
  };

  if (loading) {
    return (
      <div className="ota-modal">
        <div className="ota-modal-content">
          <div className="ota-loading">Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ota-modal" onClick={onClose}>
      <div className="ota-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="ota-header">
          <h2>📡 OTA Firmware Update</h2>
          <button onClick={onClose} className="ota-close-btn">✕</button>
        </div>

        <div className="ota-body">
          {/* Current Info */}
          <div className="ota-section">
            <h3>📱 {device.name} ({device.deviceId})</h3>
            <div className="ota-info-grid">
              <div className="ota-info-item">
                <span>Version hiện tại:</span>
                <strong>{firmwareInfo.currentVersion}</strong>
              </div>
              <div className="ota-info-item">
                <span>Trạng thái:</span>
                <span className={`ota-status ota-status-${firmwareInfo.updateStatus}`}>
                  {getStatusText(firmwareInfo.updateStatus)}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {(firmwareInfo.updateStatus === 'downloading' || 
            firmwareInfo.updateStatus === 'updating') && (
            <div className="ota-section">
              <div className="ota-progress-bar">
                <div 
                  className="ota-progress-fill"
                  style={{ width: `${firmwareInfo.updateProgress}%` }}
                />
              </div>
              <p className="ota-progress-text">
                {firmwareInfo.updateProgress}% - {getStatusText(firmwareInfo.updateStatus)}
              </p>
            </div>
          )}

          {/* Error */}
          {firmwareInfo.updateError && (
            <div className="ota-error">
              <strong>❌ Lỗi:</strong> {firmwareInfo.updateError}
            </div>
          )}

          {/* Upload Form */}
          <div className="ota-section">
            <h3>📤 Upload Firmware Mới</h3>
            <form onSubmit={handleUpload} className="ota-upload-form">
              <div className="ota-form-group">
                <label>Version:</label>
                <input
                  type="text"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="1.0.1"
                  className="ota-input"
                  required
                />
              </div>

              <div className="ota-form-group">
                <label>File Firmware (.bin):</label>
                <input
                  type="file"
                  accept=".bin,.hex,.elf"
                  onChange={handleFileSelect}
                  className="ota-file-input"
                  required
                />
                {selectedFile && (
                  <p className="ota-file-info">
                    📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <button 
                type="submit" 
                disabled={uploading}
                className="ota-btn ota-btn-primary"
              >
                {uploading ? 'Đang upload...' : '📤 Upload'}
              </button>
            </form>
          </div>

          {/* Available Firmware */}
          <div className="ota-section">
            <h3>💾 Firmware khả dụng ({firmwareInfo.availableFiles.length})</h3>
            {firmwareInfo.availableFiles.length > 0 ? (
              <div className="ota-firmware-list">
                {firmwareInfo.availableFiles.map((file, index) => (
                  <div key={index} className="ota-firmware-item">
                    <div className="ota-firmware-info">
                      <strong>v{file.version}</strong>
                      <span className="ota-firmware-size">
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                      <span className="ota-firmware-date">
                        {new Date(file.uploadedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="ota-firmware-actions">
                      {device.status === 'online' && 
                       file.version !== firmwareInfo.currentVersion && (
                        <button
                          onClick={() => handleTriggerUpdate(file.version)}
                          className="ota-btn ota-btn-success ota-btn-sm"
                          disabled={firmwareInfo.updateStatus !== 'idle' && 
                                    firmwareInfo.updateStatus !== 'success' &&
                                    firmwareInfo.updateStatus !== 'failed'}
                        >
                          🚀 Update
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteFirmware(file.version)}
                        className="ota-btn ota-btn-danger ota-btn-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ota-empty">Chưa có firmware nào được upload</p>
            )}
          </div>

          {/* Update History */}
          {firmwareInfo.updateHistory && firmwareInfo.updateHistory.length > 0 && (
            <div className="ota-section">
              <h3>📜 Lịch sử Update</h3>
              <div className="ota-history-list">
                {firmwareInfo.updateHistory.slice(-5).reverse().map((history, index) => (
                  <div key={index} className="ota-history-item">
                    <span className={history.success ? 'ota-success' : 'ota-failed'}>
                      {history.success ? '✅' : '❌'}
                    </span>
                    <span>v{history.version}</span>
                    <span>{new Date(history.updatedAt).toLocaleString('vi-VN')}</span>
                    {history.error && (
                      <span className="ota-history-error">{history.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusText(status) {
  const statusMap = {
    'idle': 'Sẵn sàng',
    'pending': 'Đang chờ...',
    'downloading': 'Đang tải xuống',
    'updating': 'Đang cập nhật',
    'success': 'Thành công',
    'failed': 'Thất bại'
  };
  return statusMap[status] || status;
}

export default OTAUpdateModal;

