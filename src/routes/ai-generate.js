const express = require('express');
const router = express.Router();
const { generateAI } = require('../controllers/aiController');

router.post('/api/ai-generate', generateAI);

module.exports = router;
