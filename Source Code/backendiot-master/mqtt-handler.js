const mqtt = require('mqtt');
const Telemetry = require('./models/Telemetry');
const Device = require('./models/Device');
const aiService = require('./services/ai-service');

let mqttClient = null;

function generateRecommendMessage(aiResult) {
  const { water_quality_label, confidence, recommend, duration } = aiResult;
  if (water_quality_label === 'POOR') {
    return `Chất lượng nước KÉM (${(confidence * 100).toFixed(1)}% confidence). Khuyến nghị bơm nước ${duration}s ngay.`;
  } else if (water_quality_label === 'GOOD') {
    return `Chất lượng nước TỐT (${(confidence * 100).toFixed(1)}% confidence). Tiếp tục theo dõi.`;
  } else {
    return `Chất lượng nước XUẤT SẮC (${(confidence * 100).toFixed(1)}% confidence). Không cần can thiệp.`;
  }
}

async function init() {
  const mqttBroker = process.env.MQTT_BROKER;

  if (!mqttBroker) {
    console.error('MQTT_BROKER is not set in .env');
    return null;
  }

  mqttClient = mqtt.connect(mqttBroker);

  mqttClient.on('connect', () => {
    console.log('MQTT connected');
    mqttClient.subscribe('agrosense/+/telemetry', (err) => {
      if (err) {
        console.error('MQTT subscribe error:', err);
      } else {
        console.log('Subscribed to agrosense/+/telemetry');
      }
    });
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

      if (messageType === 'telemetry') {
        // 1. Save telemetry
        const telemetry = await Telemetry.create({
          deviceId,
          ph: payload.ph,
          turbidity: payload.turbidity,
          temperature: payload.temperature,
          pumpState: payload.pump_state || false
        });

        // 2. Update device status
        await Device.findOneAndUpdate(
          { deviceId },
          { status: 'online', lastSeen: new Date() },
          { upsert: true, setDefaultsOnInsert: true }
        );

        console.log(`[${deviceId}] Telemetry saved: pH=${payload.ph}, turb=${payload.turbidity}, Temp=${payload.temperature}`);

        // 3. Call AI service to classify
        try {
          const aiResult = await aiService.classifyWaterQuality(
            payload.ph,
            payload.turbidity,
            payload.temperature
          );

          console.log(`[${deviceId}] AI Classification:`, {
            label: aiResult.water_quality_label,
            confidence: `${(aiResult.confidence * 100).toFixed(1)}%`,
            recommend: aiResult.recommend
          });

          // Publish AI result to frontend via MQTT
          mqttClient.publish(
            `agrosense/${deviceId}/ai-result`,
            JSON.stringify({
              deviceId,
              timestamp: new Date().toISOString(),
              waterQuality: {
                class: aiResult.water_quality_class,
                label: aiResult.water_quality_label,
                confidence: aiResult.confidence
              },
              recommend: {
                action: aiResult.recommend,
                duration: aiResult.duration,
                message: generateRecommendMessage(aiResult)
              },
              sensorData: {
                ph: payload.ph,
                turbidity: payload.turbidity,
                temperature: payload.temperature
              }
            })
          );

          // 4. Auto-apply if device config allows
          const device = await Device.findOne({ deviceId });
          if (device?.config?.autoApplyAI && aiResult.recommend === 'PUMP_ON' && aiResult.confidence > (device.config.aiConfidenceThreshold || 0.7)) {
                  console.log(`[${deviceId}] Auto-applying AI recommendation...`);

            const cmdId = `AI_${Date.now()}`;
            const command = {
              cmd_id: cmdId,
              action: 'PUMP_ON',
              dur_s: aiResult.duration
            };

            mqttClient.publish(
              `agrosense/${deviceId}/cmd`,
              JSON.stringify(command)
            );

            console.log(`[${deviceId}] Auto command sent: PUMP_ON ${aiResult.duration}s`);
          }

        } catch (aiError) {
          console.error(`[${deviceId}] AI Error:`, aiError.message);
        }
      }

      // Handle OTA progress
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
          console.log(`[${deviceId}] OTA Progress: ${payload.status} ${payload.progress}%`);
        }
      }

    } catch (error) {
      console.error('MQTT message error:', error);
    }
  });

  return mqttClient;
}

function getClient() {
  return mqttClient;
}

module.exports = { init, getClient };
