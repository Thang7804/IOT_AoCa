const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

// Helper function để gọi API
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Có lỗi xảy ra');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Auth APIs
export async function login(email, password) {
  return apiCall('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
}

export async function register(userData) {
  return apiCall('/auth/register', {
    method: 'POST',
    body: userData
  });
}

export async function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Device APIs
export async function getDevices() {
  return apiCall('/devices');
}

export async function getDevice(deviceId) {
  return apiCall(`/devices/${deviceId}`);
}

export async function createDevice(deviceData) {
  return apiCall('/devices', {
    method: 'POST',
    body: deviceData
  });
}

export async function updateDevice(deviceId, updates) {
  return apiCall(`/devices/${deviceId}`, {
    method: 'PUT',
    body: updates
  });
}

export async function deleteDevice(deviceId) {
  return apiCall(`/devices/${deviceId}`, {
    method: 'DELETE'
  });
}

export async function assignDeviceToUser(deviceId, userId) {
  return apiCall(`/devices/${deviceId}/assign`, {
    method: 'POST',
    body: { userId }
  });
}

export async function unassignDeviceFromUser(deviceId, userId) {
  return apiCall(`/devices/${deviceId}/assign/${userId}`, {
    method: 'DELETE'
  });
}

// Telemetry APIs
export async function getLatestTelemetry(deviceId) {
  return apiCall(`/telemetry/${deviceId}/latest`);
}

export async function getTelemetryData(deviceId, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return apiCall(`/telemetry/${deviceId}${queryString ? `?${queryString}` : ''}`);
}

export async function getTelemetryStats(deviceId) {
  return apiCall(`/telemetry/${deviceId}/stats`);
}

// Command APIs
export async function sendPumpCommand(deviceId, duration) {
  return apiCall(`/commands/${deviceId}/pump`, {
    method: 'POST',
    body: { duration }
  });
}

export async function getCommandHistory(deviceId) {
  return apiCall(`/commands/${deviceId}/history`);
}

// Alert APIs
export async function getActiveAlerts(deviceId = null) {
  const endpoint = deviceId 
    ? `/alerts?deviceId=${deviceId}&status=active`
    : '/alerts/active';
  return apiCall(endpoint);
}

export async function getAllAlerts(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return apiCall(`/alerts${queryString ? `?${queryString}` : ''}`);
}

export async function acknowledgeAlert(alertId) {
  return apiCall(`/alerts/${alertId}/acknowledge`, {
    method: 'PUT'
  });
}

export async function resolveAlert(alertId, note) {
  return apiCall(`/alerts/${alertId}/resolve`, {
    method: 'PUT',
    body: { note }
  });
}

// User management
export async function getUsers() {
  return apiCall('/users');
}

export async function updateUserRole(userId, role) {
  return apiCall(`/users/${userId}/role`, {
    method: 'PUT',
    body: { role }
  });
}

