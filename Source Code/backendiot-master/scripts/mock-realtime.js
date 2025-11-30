require('dotenv').config();
const mqtt = require('mqtt');

const broker = process.env.MQTT_BROKER;

if (!broker) {
  console.error('MQTT_BROKER is not set in .env');
  process.exit(1);
}

const client = mqtt.connect(broker);

client.on('connect', () => {
  console.log('Connected to MQTT');
  console.log('Publishing mock data every 5 seconds...\n');

  setInterval(() => {
    const payload = {
      ph: 7 + (Math.random() - 0.5),
      turbidity: 25 + (Math.random() - 0.5) * 20,
      temperature: 26 + (Math.random() - 0.5) * 4,
      pump_state: Math.random() < 0.2,
      timestamp: Math.floor(Date.now() / 1000)
    };

    client.publish('agrosense/ESP32_001/telemetry', JSON.stringify(payload));

    console.log(`[${new Date().toLocaleTimeString()}] pH=${payload.ph.toFixed(2)} | turb=${payload.turbidity.toFixed(1)} | temp=${payload.temperature.toFixed(1)}`);
  }, 5000);
});

client.on('error', (err) => {
  console.error('MQTT error:', err);
});

