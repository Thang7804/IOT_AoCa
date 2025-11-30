const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  location: { type: String, default: 'Unknown' },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
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
  ,
  config: {
    autoApplyAI: { type: Boolean, default: false },
    aiConfidenceThreshold: { type: Number, default: 0.7 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);

