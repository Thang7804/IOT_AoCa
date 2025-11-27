# 📖 HƯỚNG DẪN CODE TỪ ĐẦU - AGROSENSE IOT SYSTEM

## 📋 MỤC LỤC

1. [Cài đặt Node.js và Tools](#1-cài-đặt-nodejs-và-tools)
2. [Node.js Cơ bản](#2-nodejs-cơ-bản)
3. [Tạo Backend từ đầu](#3-tạo-backend-từ-đầu)
4. [Tạo Frontend từ đầu](#4-tạo-frontend-từ-đầu)
5. [Kết nối Backend và Frontend](#5-kết-nối-backend-và-frontend)
6. [Thêm tính năng từng bước](#6-thêm-tính-năng-từng-bước)

---

## 1. CÀI ĐẶT NODE.JS VÀ TOOLS

### 1.1. Cài đặt Node.js

**Windows:**
1. Vào https://nodejs.org/
2. Download bản LTS (Long Term Support)
3. Chạy installer, chọn "Add to PATH"
4. Mở PowerShell/CMD, kiểm tra:
   ```bash
   node --version
   npm --version
   ```

**Mac:**
```bash
# Dùng Homebrew
brew install node
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 1.2. Cài đặt MongoDB

**Windows:**
1. Download từ https://www.mongodb.com/try/download/community
2. Chạy installer
3. Chọn "Install as a Service"

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Hoặc dùng MongoDB Atlas (Cloud - Miễn phí):**
1. Vào https://www.mongodb.com/cloud/atlas
2. Tạo account miễn phí
3. Tạo cluster
4. Lấy connection string

### 1.3. Cài đặt MQTT Broker

**Option 1: Mosquitto (Local)**
```bash
# Windows: Download từ https://mosquitto.org/download/
# Mac:
brew install mosquitto
brew services start mosquitto

# Linux:
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
```

**Option 2: Cloud MQTT (Miễn phí)**
- https://www.cloudmqtt.com/ (Free tier)
- https://www.hivemq.com/mqtt-cloud-broker/ (Free tier)

### 1.4. Cài đặt Code Editor

- **VS Code** (Khuyên dùng): https://code.visualstudio.com/
- Cài extensions:
  - ESLint
  - Prettier
  - MongoDB for VS Code
  - REST Client

---

## 2. NODE.JS CƠ BẢN

### 2.1. Node.js là gì?

Node.js là runtime JavaScript chạy trên server, cho phép chạy JavaScript ngoài browser.

### 2.2. NPM (Node Package Manager)

**Khái niệm:**
- `npm` là công cụ quản lý packages (thư viện) cho Node.js
- `package.json` là file mô tả project và dependencies

**Các lệnh cơ bản:**
```bash
# Tạo project mới
npm init                    # Tạo package.json
npm init -y                 # Tạo với giá trị mặc định

# Cài đặt package
npm install express         # Cài express
npm install express --save  # Cài và thêm vào dependencies
npm install express -g      # Cài global

# Xem packages đã cài
npm list

# Xóa package
npm uninstall express

# Cài tất cả dependencies từ package.json
npm install
```

### 2.3. Modules trong Node.js

**Export module:**
```javascript
// math.js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

// Export
module.exports = {
  add,
  subtract
};

// Hoặc
exports.add = add;
exports.subtract = subtract;
```

**Import module:**
```javascript
// app.js
const math = require('./math');

console.log(math.add(5, 3));        // 8
console.log(math.subtract(5, 3));  // 2

// Hoặc destructure
const { add, subtract } = require('./math');
```

### 2.4. File System (fs)

```javascript
const fs = require('fs');

// Đọc file
const data = fs.readFileSync('file.txt', 'utf8');
console.log(data);

// Ghi file
fs.writeFileSync('output.txt', 'Hello World');

// Đọc file async
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(data);
});

// Kiểm tra file tồn tại
if (fs.existsSync('file.txt')) {
  console.log('File exists');
}
```

### 2.5. HTTP Server cơ bản

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World!');
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### 2.6. Express.js cơ bản

**Cài đặt:**
```bash
npm install express
```

**Code cơ bản:**
```javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json());  // Parse JSON body

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ userId });
});

app.post('/users', (req, res) => {
  const userData = req.body;
  res.json({ success: true, data: userData });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### 2.7. Async/Await

```javascript
// Promise
function fetchData() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('Data received');
    }, 1000);
  });
}

fetchData()
  .then(data => console.log(data))
  .catch(err => console.error(err));

// Async/Await
async function getData() {
  try {
    const data = await fetchData();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

getData();
```

### 2.8. MongoDB với Mongoose

**Cài đặt:**
```bash
npm install mongoose
```

**Kết nối:**
```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/mydb')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Connection error:', err));
```

**Tạo Schema và Model:**
```javascript
const mongoose = require('mongoose');

// Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: Number
}, { timestamps: true });

// Model
const User = mongoose.model('User', userSchema);

// Sử dụng
async function createUser() {
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  });
  console.log(user);
}

async function getUsers() {
  const users = await User.find();
  console.log(users);
}

async function updateUser() {
  const user = await User.findOneAndUpdate(
    { email: 'john@example.com' },
    { age: 31 },
    { new: true }
  );
  console.log(user);
}

async function deleteUser() {
  await User.findOneAndDelete({ email: 'john@example.com' });
}
```

---

## 3. TẠO BACKEND TỪ ĐẦU

### 3.1. Bước 1: Tạo Project

```bash
# Tạo thư mục
mkdir agrosense-backend
cd agrosense-backend

# Khởi tạo npm
npm init -y

# Cài đặt dependencies
npm install express mongoose cors dotenv jsonwebtoken bcryptjs mqtt multer
npm install --save-dev nodemon
```

### 3.2. Bước 2: Cấu trúc thư mục

```
agrosense-backend/
├── models/
│   ├── User.js
│   ├── Device.js
│   └── Telemetry.js
├── middleware/
│   └── auth.js
├── uploads/
│   └── firmware/
├── .env
├── .gitignore
├── package.json
└── server.js
```

### 3.3. Bước 3: Tạo package.json

```json
{
  "name": "agrosense-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "setup": "node scripts/setup.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.6.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "mqtt": "^5.1.3",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 3.4. Bước 4: Tạo .env

```env
MONGODB_URI=mongodb://localhost:27017/agrosense
MQTT_BROKER=mqtt://localhost:1883
JWT_SECRET=your-super-secret-key-change-this-in-production
PORT=5000
```

### 3.5. Bước 5: Tạo Models

**models/User.js:**
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true, 
    minlength: 6 
  },
  fullName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  role: { 
    type: String, 
    enum: ['admin', 'user'], 
    default: 'user' 
  },
  devices: [{ 
    type: String, 
    uppercase: true 
  }]
}, { timestamps: true });

// Hash password trước khi save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method để so sánh password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

**models/Device.js:**
```javascript
const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  location: { 
    type: String, 
    default: 'Unknown' 
  },
  status: { 
    type: String, 
    enum: ['online', 'offline'], 
    default: 'offline' 
  },
  lastSeen: Date,
  thresholds: {
    ph: {
      min: { type: Number, default: 6.5 },
      max: { type: Number, default: 8.5 }
    },
    turbidity: {
      max: { type: Number, default: 50 }
    },
    temperature: {
      min: { type: Number, default: 20 },
      max: { type: Number, default: 32 }
    }
  },
  firmware: {
    currentVersion: { type: String, default: '1.0.0' },
    availableVersion: String,
    lastUpdateCheck: Date,
    updateStatus: { 
      type: String, 
      enum: ['idle', 'pending', 'downloading', 'updating', 'success', 'failed'],
      default: 'idle'
    },
    updateProgress: { type: Number, default: 0 },
    updateError: String,
    updateHistory: [{
      version: String,
      updatedAt: Date,
      success: Boolean,
      error: String
    }]
  }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
```

**models/Telemetry.js:**
```javascript
const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  deviceId: { 
    type: String, 
    required: true, 
    index: true, 
    uppercase: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  ph: Number,
  turbidity: Number,
  temperature: Number,
  pumpState: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

// Compound index để query nhanh hơn
telemetrySchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Telemetry', telemetrySchema);
```

### 3.6. Bước 6: Tạo Auth Middleware

**middleware/auth.js:**
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Lấy token từ header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Kiểm tra có token không
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Tìm user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    // Gán user vào request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
};
```

### 3.7. Bước 7: Tạo Server.js - Phần 1 (Setup cơ bản)

**server.js:**
```javascript
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// ==================== DATABASE ====================
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => {
    console.error('MongoDB error:', err);
    process.exit(1);
  });

// ==================== ROUTES ====================
app.get('/', (req, res) => {
  res.json({ message: 'AgroSense API is running!' });
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 BACKEND STARTED!');
  console.log('='.repeat(50));
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log('='.repeat(50) + '\n');
});
```

**Test:**
```bash
npm run dev
# Mở browser: http://localhost:5000
```

### 3.8. Bước 8: Thêm Auth Routes

**Thêm vào server.js:**
```javascript
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { protect } = require('./middleware/auth');

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Validation
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập đầy đủ thông tin' 
      });
    }

    // Kiểm tra email đã tồn tại
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email đã tồn tại' 
      });
    }

    // Tạo user
    const user = await User.create({ email, password, fullName });
    
    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          devices: user.devices
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập email và mật khẩu' 
      });
    }

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không đúng' 
      });
    }

    // So sánh password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không đúng' 
      });
    }

    // Tạo token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          devices: user.devices
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user
app.get('/api/v1/auth/me', protect, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role,
      devices: req.user.devices
    }
  });
});
```

**Test với Postman hoặc curl:**
```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","fullName":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

### 3.9. Bước 9: Thêm Device Routes

**Thêm vào server.js:**
```javascript
const Device = require('./models/Device');
const Telemetry = require('./models/Telemetry');

// ==================== DEVICE ROUTES ====================

// Get all devices
app.get('/api/v1/devices', protect, async (req, res) => {
  try {
    // Admin thấy tất cả, User chỉ thấy devices được assign
    const query = req.user.role === 'admin'
      ? {}
      : { deviceId: { $in: req.user.devices || [] } };

    const devices = await Device.find(query).sort({ lastSeen: -1 });

    res.json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single device
app.get('/api/v1/devices/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Kiểm tra quyền
    if (req.user.role !== 'admin' && !req.user.devices.includes(deviceId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Không có quyền truy cập' 
      });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy device' 
      });
    }

    const latestTelemetry = await Telemetry.findOne({ deviceId })
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      data: { device, latestTelemetry }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create device (Admin only)
app.post('/api/v1/devices', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới tạo được device' 
      });
    }

    const device = await Device.create(req.body);
    res.status(201).json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update device (Admin only)
app.put('/api/v1/devices/:deviceId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới cập nhật được device' 
      });
    }

    const { deviceId } = req.params;
    const device = await Device.findOne({ deviceId });
    
    if (!device) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy device' 
      });
    }

    // Update fields
    if (req.body.name) device.name = req.body.name;
    if (req.body.location) device.location = req.body.location;
    if (req.body.thresholds) {
      device.thresholds = { ...device.thresholds, ...req.body.thresholds };
    }

    await device.save();

    res.json({
      success: true,
      message: 'Cập nhật device thành công',
      data: device
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete device (Admin only)
app.delete('/api/v1/devices/:deviceId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới xóa được device' 
      });
    }

    const device = await Device.findOneAndDelete({ deviceId: req.params.deviceId });
    if (!device) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy device' 
      });
    }

    // Xóa telemetry data
    await Telemetry.deleteMany({ deviceId: req.params.deviceId });

    res.json({
      success: true,
      message: 'Xóa device thành công'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### 3.10. Bước 10: Thêm MQTT

**Thêm vào server.js:**
```javascript
const mqtt = require('mqtt');

// ==================== MQTT ====================
const mqttBroker = process.env.MQTT_BROKER;

if (!mqttBroker) {
  console.error('❌ MQTT_BROKER is not set in .env');
  process.exit(1);
}

const mqttClient = mqtt.connect(mqttBroker);

mqttClient.on('connect', () => {
  console.log('✓ MQTT connected');
  
  // Subscribe telemetry
  mqttClient.subscribe('agrosense/+/telemetry', (err) => {
    if (err) {
      console.error('MQTT subscribe error:', err);
    } else {
      console.log('Subscribed to agrosense/+/telemetry');
    }
  });
  
  // Subscribe OTA progress
  mqttClient.subscribe('agrosense/+/ota_progress', (err) => {
    if (err) {
      console.error('MQTT subscribe error:', err);
    } else {
      console.log('Subscribed to agrosense/+/ota_progress');
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const parts = topic.split('/');
    const deviceId = parts[1];
    const messageType = parts[2] || 'telemetry';
    const payload = JSON.parse(message.toString());

    // Xử lý telemetry
    if (messageType === 'telemetry') {
      await Telemetry.create({
        deviceId,
        ph: payload.ph,
        turbidity: payload.turbidity,
        temperature: payload.temperature,
        pumpState: payload.pump_state || false
      });

      await Device.findOneAndUpdate(
        { deviceId },
        { status: 'online', lastSeen: new Date() },
        { upsert: true, setDefaultsOnInsert: true }
      );

      console.log(`[${deviceId}] Data saved: pH=${payload.ph}`);
    }

    // Xử lý OTA progress
    if (messageType === 'ota_progress') {
      const device = await Device.findOne({ deviceId });
      if (device) {
        device.firmware.updateStatus = payload.status || 'downloading';
        device.firmware.updateProgress = payload.progress || 0;
        
        if (payload.status === 'success') {
          device.firmware.currentVersion = payload.version;
          device.firmware.updateHistory.push({
            version: payload.version,
            updatedAt: new Date(),
            success: true
          });
        } else if (payload.status === 'failed') {
          device.firmware.updateError = payload.error || 'Unknown error';
          device.firmware.updateHistory.push({
            version: payload.version,
            updatedAt: new Date(),
            success: false,
            error: payload.error
          });
        }
        
        await device.save();
      }
    }
  } catch (error) {
    console.error('MQTT message error:', error);
  }
});
```

### 3.11. Bước 11: Thêm Telemetry Routes

**Thêm vào server.js:**
```javascript
// ==================== TELEMETRY ROUTES ====================

// Get telemetry data
app.get('/api/v1/telemetry/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit || '50', 10);

    // Kiểm tra quyền
    if (req.user.role !== 'admin' && !req.user.devices.includes(deviceId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Không có quyền truy cập' 
      });
    }

    const data = await Telemetry.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: data.length,
      data: data.reverse()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get latest telemetry
app.get('/api/v1/telemetry/:deviceId/latest', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (req.user.role !== 'admin' && !req.user.devices.includes(deviceId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Không có quyền truy cập' 
      });
    }

    const data = await Telemetry.findOne({ deviceId })
      .sort({ timestamp: -1 });

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chưa có dữ liệu' 
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### 3.12. Bước 12: Thêm Command Routes

**Thêm vào server.js:**
```javascript
// ==================== COMMAND ROUTES ====================

// Send pump command
app.post('/api/v1/commands/:deviceId/pump', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { action, duration = 0 } = req.body;

    // Kiểm tra quyền
    if (req.user.role !== 'admin' && !req.user.devices.includes(deviceId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Không có quyền điều khiển' 
      });
    }

    const cmdId = `CMD_${Date.now()}`;
    const command = { 
      cmd_id: cmdId, 
      action, 
      dur_s: duration 
    };

    // Gửi qua MQTT
    mqttClient.publish(
      `agrosense/${deviceId}/cmd`, 
      JSON.stringify(command)
    );

    res.json({
      success: true,
      message: 'Lệnh đã được gửi',
      data: { cmdId, deviceId, action, duration }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### 3.13. Bước 13: Thêm OTA Routes

Xem file `OTA_UPDATE_GUIDE.md` để biết chi tiết về OTA implementation.

### 3.14. Bước 14: Thêm User Management Routes

**Thêm vào server.js:**

```javascript
// ==================== USER MANAGEMENT ====================

// Get all users (Admin only)
app.get('/api/v1/users', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới xem được danh sách users' 
      });
    }

    const users = await User.find().select('-password');
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin tạo tài khoản cho user
app.post('/api/v1/users/create', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới tạo tài khoản được' 
      });
    }

    const { email, password, fullName, role, devices } = req.body;

    // Validate
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password và fullName là bắt buộc' 
      });
    }

    // Check email đã tồn tại
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email đã tồn tại' 
      });
    }

    // Tạo user
    const user = await User.create({
      email,
      password,
      fullName,
      role: role || 'user',
      devices: devices || []
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        devices: user.devices
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cập nhật thông tin user (Admin only)
app.put('/api/v1/users/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, email, role, devices } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới sửa user được' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại' 
      });
    }

    // Cập nhật
    if (fullName) user.fullName = fullName;
    if (email && email !== user.email) {
      // Kiểm tra email mới có trùng không
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email đã tồn tại' 
        });
      }
      user.email = email;
    }
    if (role) user.role = role;
    if (devices) user.devices = devices;

    await user.save();

    res.json({
      success: true,
      message: 'Cập nhật user thành công',
      data: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        devices: user.devices
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Xóa user (Admin only)
app.delete('/api/v1/users/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới xóa user được' 
      });
    }

    // Không cho xóa chính mình
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa chính mình' 
      });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại' 
      });
    }

    res.json({
      success: true,
      message: `Đã xóa user ${user.email}`
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset password user (Admin only)
app.post('/api/v1/users/:userId/reset-password', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới reset password được' 
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password phải ít nhất 6 ký tự' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại' 
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: `Đã reset password cho ${user.email}`
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Đổi role của user (Admin only)
app.put('/api/v1/users/:userId/role', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ admin mới đổi role được' 
      });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Role không hợp lệ' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại' 
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `Đã đổi role của ${user.email} thành ${role}`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

**Giải thích:**
- `GET /users`: Lấy danh sách users (Admin only)
- `POST /users/create`: Admin tạo tài khoản mới
- `PUT /users/:userId`: Cập nhật thông tin user
- `DELETE /users/:userId`: Xóa user (không cho xóa chính mình)
- `POST /users/:userId/reset-password`: Reset password
- `PUT /users/:userId/role`: Đổi role

---

## 4. TẠO FRONTEND TỪ ĐẦU

### 4.1. Bước 1: Tạo React App

```bash
# Cài đặt create-react-app (nếu chưa có)
npm install -g create-react-app

# Tạo project
npx create-react-app agrosense-frontend
cd agrosense-frontend

# Cài thêm packages
npm install react-hot-toast
```

### 4.2. Bước 2: Cấu trúc thư mục

```
agrosense-frontend/
├── public/
│   └── index.html
├── src/
│   ├── api.js
│   ├── App.js
│   ├── App.css
│   ├── LoginPage.js
│   ├── LoginPage.css
│   ├── DashboardPage.js
│   ├── DashboardPage.css
│   ├── DeviceManagementPage.js
│   ├── DeviceManagementPage.css
│   ├── OTAUpdateModal.js
│   ├── OTAUpdateModal.css
│   ├── index.js
│   └── index.css
└── package.json
```

### 4.3. Bước 3: Tạo API Helper

**src/api.js:**
```javascript
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

// Telemetry APIs
export async function getLatestTelemetry(deviceId) {
  return apiCall(`/telemetry/${deviceId}/latest`);
}

export async function getTelemetryData(deviceId, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return apiCall(`/telemetry/${deviceId}${queryString ? `?${queryString}` : ''}`);
}

// Command APIs
export async function sendPumpCommand(deviceId, duration) {
  return apiCall(`/commands/${deviceId}/pump`, {
    method: 'POST',
    body: { action: 'ON', duration }
  });
}

// Alert APIs
export async function getActiveAlerts(deviceId) {
  return apiCall(`/alerts/active?deviceId=${deviceId}`);
}
```

### 4.4. Bước 4: Tạo LoginPage

**src/LoginPage.js:**
```javascript
import React, { useState } from 'react';
import { login, register } from './api';
import toast from 'react-hot-toast';
import './LoginPage.css';

function LoginPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData);
      }

      // Lưu token và user
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      
      toast.success(isLogin ? 'Đăng nhập thành công!' : 'Đăng ký thành công!');
      onLoginSuccess(result.data.user);
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🌊 AgroSense</h1>
        <h2>{isLogin ? 'Đăng nhập' : 'Đăng ký'}</h2>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              name="fullName"
              placeholder="Họ và tên"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
          </button>
        </form>

        <p>
          {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            className="link-btn"
          >
            {isLogin ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
```

### 4.5. Bước 5: Tạo DashboardPage

**src/DashboardPage.js:**
```javascript
import React, { useState, useEffect } from 'react';
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
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadDeviceData();
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

  const loadDeviceData = async () => {
    if (!selectedDevice) return;

    try {
      const [latest, alertsRes] = await Promise.all([
        getLatestTelemetry(selectedDevice),
        getActiveAlerts(selectedDevice)
      ]);

      setLatestData(latest.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handlePumpControl = async () => {
    if (!selectedDevice) return;

    try {
      await sendPumpCommand(selectedDevice, 120);
      toast.success('Đã gửi lệnh bơm 120s');
      loadDeviceData();
    } catch (error) {
      toast.error('Không thể gửi lệnh bơm');
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Đang tải...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>🌊 Water Quality Dashboard</h1>
        <div>
          {user.role === 'admin' && (
            <>
              <button onClick={onManageDevices}>🛠️ Quản lý thiết bị</button>
              <button onClick={onManageUsers}>👥 Quản lý User</button>
            </>
          )}
          <button onClick={onLogout}>Đăng xuất</button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="dashboard-empty">
          <h2>Chưa có thiết bị nào</h2>
        </div>
      ) : (
        <>
          <div className="device-selector">
            <label>Chọn thiết bị:</label>
            <select 
              value={selectedDevice} 
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.name} ({device.deviceId})
                </option>
              ))}
            </select>
          </div>

          {latestData && (
            <div className="data-display">
              <div className="data-card">
                <h3>pH</h3>
                <p className="value">{latestData.ph?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="data-card">
                <h3>Độ đục</h3>
                <p className="value">{latestData.turbidity?.toFixed(1) || 'N/A'} NTU</p>
              </div>
              <div className="data-card">
                <h3>Nhiệt độ</h3>
                <p className="value">{latestData.temperature?.toFixed(1) || 'N/A'}°C</p>
              </div>
            </div>
          )}

          <div className="controls">
            <button onClick={handlePumpControl}>Bật bơm (120s)</button>
          </div>

          {alerts.length > 0 && (
            <div className="alerts">
              <h3>⚠️ Cảnh báo</h3>
              {alerts.map((alert, index) => (
                <div key={index} className="alert-item">
                  {alert.message}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DashboardPage;
```

### 4.6. Bước 6: Thêm API Functions cho User Management

**Cập nhật src/api.js:**

```javascript
// User management
export async function getUsers() {
  return apiCall('/users');
}

export async function createUser(userData) {
  return apiCall('/users/create', {
    method: 'POST',
    body: userData
  });
}

export async function updateUser(userId, userData) {
  return apiCall(`/users/${userId}`, {
    method: 'PUT',
    body: userData
  });
}

export async function deleteUser(userId) {
  return apiCall(`/users/${userId}`, {
    method: 'DELETE'
  });
}

export async function resetUserPassword(userId, newPassword) {
  return apiCall(`/users/${userId}/reset-password`, {
    method: 'POST',
    body: { newPassword }
  });
}
```

### 4.7. Bước 7: Tạo UserManagementPage

**src/UserManagementPage.js:**

```javascript
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
    if (!formData.email || !formData.password || !formData.fullName) {
      toast.error('Vui lòng điền đầy đủ thông tin');
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
      password: '',
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
      <div className="um-header">
        <div>
          <h1 className="um-title">👥 Quản lý Người dùng</h1>
          <p className="um-subtitle">Tạo và quản lý tài khoản người dùng</p>
        </div>
        <button onClick={onBack} className="um-back-btn">
          ← Quay lại
        </button>
      </div>

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

      {/* Create/Edit Form Modal */}
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
      </div>
    </div>
  );
}

export default UserManagementPage;
```

**Tạo CSS file: src/UserManagementPage.css**

Xem code trong project hiện tại hoặc tham khảo `UserManagementPage.css` đã có.

### 4.8. Bước 8: Tạo App.js
```javascript
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import DeviceManagementPage from './DeviceManagementPage';
import UserManagementPage from './UserManagementPage';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setActiveView('dashboard');
  };

  if (loading) {
    return <div>Đang tải...</div>;
  }

  return (
    <>
      <Toaster position="top-right" />
      
      {user ? (
        activeView === 'deviceManagement' ? (
          <DeviceManagementPage
            user={user}
            onBack={() => setActiveView('dashboard')}
          />
        ) : activeView === 'userManagement' ? (
          <UserManagementPage
            user={user}
            onBack={() => setActiveView('dashboard')}
          />
        ) : (
          <DashboardPage
            user={user}
            onLogout={handleLogout}
            onManageDevices={() => setActiveView('deviceManagement')}
            onManageUsers={() => setActiveView('userManagement')}
          />
        )
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
```

---

## 5. KẾT NỐI BACKEND VÀ FRONTEND

### 5.1. CORS Configuration

Backend đã có CORS enabled:
```javascript
app.use(cors());
```

### 5.2. Environment Variables

**Frontend .env:**
```env
REACT_APP_API_URL=http://localhost:5000/api/v1
```

### 5.3. Test Connection

1. Chạy backend: `npm run dev` (port 5000)
2. Chạy frontend: `npm start` (port 3000)
3. Mở browser: http://localhost:3000
4. Đăng ký/đăng nhập
5. Kiểm tra API calls trong Network tab

---

## 6. THÊM TÍNH NĂNG TỪNG BƯỚC

### 6.1. Thêm Device Management

Xem code trong `DeviceManagementPage.js` từ project hiện tại.

### 6.2. Thêm OTA Update

Xem `OTA_UPDATE_GUIDE.md` để biết chi tiết.

### 6.3. Thêm User Management

**Backend:** Đã thêm ở Bước 14 (3.14)

**Frontend:** Đã thêm ở Bước 7 (4.7)

**Tích hợp vào Dashboard:**

Cập nhật `DashboardPage.js`:

```javascript
function DashboardPage({ user, onLogout, onManageDevices, onManageUsers }) {
  // ... existing code ...

  return (
    <div>
      {/* ... */}
      {user.role === 'admin' && (
        <>
          <button onClick={onManageDevices}>
            🛠️ Quản lý thiết bị
          </button>
          <button onClick={onManageUsers}>
            👥 Quản lý User
          </button>
        </>
      )}
      {/* ... */}
    </div>
  );
}
```

### 6.4. Thêm Charts

```bash
npm install recharts
```

```javascript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function Chart({ data }) {
  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="timestamp" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="ph" stroke="#8884d8" />
      <Line type="monotone" dataKey="temperature" stroke="#82ca9d" />
    </LineChart>
  );
}
```

---

## 7. TIPS & BEST PRACTICES

### 7.1. Error Handling

```javascript
try {
  const result = await apiCall('/endpoint');
} catch (error) {
  // Log error
  console.error('Error:', error);
  // Show user-friendly message
  toast.error(error.message || 'Có lỗi xảy ra');
}
```

### 7.2. Loading States

```javascript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await doSomething();
  } finally {
    setLoading(false);
  }
};
```

### 7.3. Environment Variables

- Backend: `.env` (không commit vào git)
- Frontend: `.env` với prefix `REACT_APP_`

### 7.4. Code Organization

- Tách logic ra custom hooks
- Tách components nhỏ
- Sử dụng constants cho magic numbers
- Comment code phức tạp

---

## 8. DEBUGGING

### 8.1. Backend

```javascript
// Thêm console.log
console.log('Request:', req.body);
console.log('User:', req.user);

// Sử dụng debugger
debugger; // Dừng tại đây khi chạy với --inspect
```

### 8.2. Frontend

```javascript
// React DevTools
// Console logs
console.log('State:', state);

// Network tab để xem API calls
```

### 8.3. MongoDB

```javascript
// Xem data trong MongoDB
// Dùng MongoDB Compass hoặc mongo shell
db.devices.find()
db.users.find()
```

---

## 9. NEXT STEPS

1. ✅ Hoàn thành backend API
2. ✅ Hoàn thành frontend UI
3. ✅ Thêm User Management
4. ⬜ Thêm validation
5. ⬜ Thêm error boundaries
6. ⬜ Thêm tests
7. ⬜ Optimize performance
8. ⬜ Deploy to production

---

**Chúc bạn code thành công! 🚀**

Nếu gặp vấn đề, xem lại từng bước hoặc tham khảo code trong project hiện tại.

