// routes/ai.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiService = require('../services/ai-service');

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

// GET /api/v1/ai/health
router.get('/health', protect, async (req, res) => {
  try {
    const health = await aiService.checkHealth();
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(503).json({ success: false, message: 'AI Service unavailable', error: error.message });
  }
});

// POST /api/v1/ai/predict
// Body: { ph, turbidity, temperature }
router.post('/predict', protect, async (req, res) => {
  try {
    const { ph, turbidity, temperature } = req.body;

    if (ph === undefined || turbidity === undefined || temperature === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing parameters: ph, turbidity, temperature'
      });
    }

    const aiResult = await aiService.classifyWaterQuality(ph, turbidity, temperature);

    // Thêm message tiếng Việt để show lên UI
    const message = generateRecommendMessage(aiResult);

    res.json({
      success: true,
      data: {
        ...aiResult,
        message
      }
    });
  } catch (error) {
    console.error('AI /predict error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/ai/forecast
// Body: { ph, turbidity, temperature }
router.post('/forecast', protect, async (req, res) => {
  try {
    const { ph, turbidity, temperature } = req.body;

    if (ph === undefined || turbidity === undefined || temperature === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing parameters: ph, turbidity, temperature'
      });
    }

    const forecast = await aiService.forecastSensors(ph, turbidity, temperature);

    // Không cần message phức tạp, chỉ trả raw forecast để frontend render
    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('AI /forecast error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
