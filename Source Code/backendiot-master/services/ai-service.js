// services/ai-service.js
const axios = require('axios');

// DÙNG 127.0.0.1 cho chắc IPv4
const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000')
  .replace(/\/+$/, '');

console.log('[AI SERVICE] Base URL =', AI_SERVICE_URL);

class AIService {
  constructor() {
    this.baseURL = AI_SERVICE_URL;
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      console.error('AI Service health check failed:', error.message);
      return { status: 'unavailable', error: error.message };
    }
  }

  async classifyWaterQuality(ph, turbidity, temperature) {
    try {
      const response = await axios.post(
        `${this.baseURL}/predict`,
        { ph, turbidity, temperature },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const data = response.data;
      if (data && data.success) {
        return data;
      }
      throw new Error('AI prediction failed (success=false)');
    } catch (error) {
      if (error.response) {
        throw new Error(
          `AI Service error: ${error.response.data.detail || error.message}`,
        );
      } else if (error.request) {
        throw new Error(
          'Cannot connect to AI Service. Please check if it is running.',
        );
      }
      throw new Error(`AI Service error: ${error.message}`);
    }
  }

  async forecastSensors(ph, turbidity, temperature) {
    try {
      const response = await axios.post(
        `${this.baseURL}/forecast`,
        { ph, turbidity, temperature },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const data = response.data;
      if (data && data.success) {
        return data;
      }
      throw new Error('AI forecast failed (success=false)');
    } catch (error) {
      if (error.response) {
        throw new Error(
          `AI Service forecast error: ${error.response.data.detail || error.message}`,
        );
      } else if (error.request) {
        throw new Error(
          'Cannot connect to AI Service. Please check if it is running.',
        );
      }
      throw new Error(`AI Service forecast error: ${error.message}`);
    }
  }

  async batchPredict(dataList) {
    try {
      const response = await axios.post(
        `${this.baseURL}/batch-predict`,
        dataList,
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Batch prediction error: ${error.message}`);
    }
  }
}

module.exports = new AIService();
