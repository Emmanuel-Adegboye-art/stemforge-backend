const express = require('express');
const router = express.Router();
const { createPromo } = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/auth');

// Only org_admin can create promo codes
router.post('/api/admin/promo', authenticate, requireRole('org_admin'), createPromo);

module.exports = router;