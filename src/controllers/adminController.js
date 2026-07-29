const { admin } = require('../config/firebase');

/**
 * POST /api/admin/promo
 * Body: { description?: string, uses?: number (default 1), days?: number (default 3), expiresAt?: ISO string }
 * Returns: { code: "<generated promo code>" }
 */
exports.createPromo = async (req, res, next) => {
  try {
    const { description = '', uses = 1, days = 3, expiresAt } = req.body;

    // Basic validation
    if (uses < 1) uses = 1;
    if (days < 1) days = 1;

    // Generate a random, URL‑safe code (8 chars)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const promoDoc = {
      description,
      uses: Number(uses),
      days: Number(days),
      usedBy: [],
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null   // store as ISO string or null
    };

    // Add to Firestore
    await admin.firestore().collection('promoCodes').doc(code).set(promoDoc);

    res.json({ data: { code } });
  } catch (error) {
    console.error('Create promo error:', error);
    next(error);
  }
};

module.exports = { createPromo };
