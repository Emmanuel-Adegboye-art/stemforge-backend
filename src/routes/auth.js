const express = require('express');
const router  = express.Router();
const {
    register,
    login,
    getMe,
    redeemPromo,
    saveProfile,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// ── Public ─────────────────────────────────────────
router.post('/api/auth/register', register);
router.post('/api/auth/login',    login);

// ── Password reset (public – no auth needed) ────────
router.post('/api/auth/forgot-password', forgotPassword);
router.post('/api/auth/reset-password',  resetPassword);

// ── Protected ──────────────────────────────────────
router.get( '/api/auth/me',           authenticate, getMe);
router.post('/api/auth/profile',      authenticate, saveProfile);
router.post('/api/auth/promo/redeem', authenticate, redeemPromo);

module.exports = router;