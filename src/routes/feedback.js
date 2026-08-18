const express = require('express');
const router = express.Router();
const { submitFeedback } = require('../controllers/feedbackController');

router.post('/api/feedback', submitFeedback);

module.exports = router;
