const express = require('express');
const router = express.Router();
const aiService = require('../../../services/aiService');

// System health check
router.get('/healthz', async (req, res) => {
  try {
    const aiHealth = await aiService.healthCheck();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        ai: aiHealth.status
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
