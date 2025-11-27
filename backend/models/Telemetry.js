const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true, uppercase: true },
  timestamp: { type: Date, default: Date.now, index: true },
  ph: Number,
  turbidity: Number,
  temperature: Number,
  pumpState: { type: Boolean, default: false }
}, { timestamps: true });

telemetrySchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Telemetry', telemetrySchema);

