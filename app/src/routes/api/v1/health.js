const express = require('express');
const router = express.Router();

// Health check endpoint - NO authentication middleware
router.get('/healthz', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ai-interviewer-gateway'
  });
});

module.exports = router;
