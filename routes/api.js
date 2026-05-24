const express = require('express');
const router = express.Router();
const { apiLimiter } = require('../middleware/rateLimiter');

// Placeholder — GTimes is the publisher, not the receiver
// This file exists for future inbound webhooks (e.g. from Greenwood notifying GTimes)
router.get('/health', apiLimiter, (req, res) => {
  res.json({ status: 'ok', app: 'gtimes', ts: new Date().toISOString() });
});

module.exports = router;
