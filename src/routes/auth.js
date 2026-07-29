const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  redeemPromo
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/api/auth/register', register);
router.post('/api/auth/login', login);

// Protected routes
router.get('/api/auth/me', authenticate, getMe);

// 🔑 Promo code redemption (protected – user must be logged in)
router.post('/api/auth/promo/redeem', authenticate, redeemPromo);

module.exports = router;