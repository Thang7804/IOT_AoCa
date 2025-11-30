require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mqttHandler = require('./mqtt-handler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const User = require('./models/User');
const Device = require('./models/Device');
const Telemetry = require('./models/Telemetry');
const { protect } = require('./middleware/auth');
const aiService = require('./services/ai-service');

const app = express();
app.use(cors());
app.use(express.json());
const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB error:', err);
    process.exit(1);
  });
const authRoutes = require('./routes/auth');
app.use('/api/v1/auth', authRoutes);

const deviceRoutes = require('./routes/devices');
app.use('/api/v1/devices', deviceRoutes);

const telemetryRoutes = require('./routes/telemetry');
app.use('/api/v1/telemetry', telemetryRoutes);

const commandRoutes = require('./routes/commands');
app.use('/api/v1/commands', commandRoutes);

const firmwareRoutes = require('./routes/firmware');
app.use('/api/v1/firmware', firmwareRoutes);

const alertsRoutes = require('./routes/alerts');
app.use('/api/v1/alerts', alertsRoutes);

const usersRoutes = require('./routes/users');
app.use('/api/v1/users', usersRoutes);

const aiRoutes = require('./routes/ai');
app.use('/api/v1/ai', aiRoutes);
app.use('/uploads', express.static('uploads'));
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    mqtt: (mqttHandler.getClient() && mqttHandler.getClient().connected) ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

mqttHandler.init().then(() => {
  console.log('MQTT handler initialized');
}).catch(err => {
  console.error('MQTT handler failed to start:', err.message || err);
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('BACKEND SIMPLE STARTED!');
  console.log('='.repeat(50));
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/v1`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log('='.repeat(50) + '\n');
});

