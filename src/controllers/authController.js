// Back-End/src/controllers/authController.js
const { admin } = require('../config/firebase');
const User = require('../models/User');

exports.register = async (req, res, next) => {
  return res.status(410).json({
    error: {
      message: 'Account creation is now handled directly by the Firebase Client SDK on the frontend.'
    }
  });
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                error: { message: 'Email and password are required' } 
            });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                error: { message: 'Invalid credentials' } 
            });
        }
        
        if (user.password) {
            const bcrypt = require('bcryptjs');
            const jwt = require('jsonwebtoken');
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ 
                    error: { message: 'Invalid credentials' } 
                });
            }
            const token = jwt.sign(
                { id: user._id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            return res.json({
                data: {
                    user: { id: user._id, email: user.email, name: user.name },
                    token
                }
            });
        }

        return res.status(400).json({
            error: { message: 'Please login using Firebase Authentication' }
        });

    } catch (error) {
        next(error);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        const identifier = req.user.id || req.user.uid;
        
        let user;
        if (req.user.uid || req.user.firebaseUid) {
             user = await User.findOne({ firebaseUid: req.user.uid || req.user.firebaseUid });
        } else {
             user = await User.findById(identifier).select('-password');
        }

        res.json({ data: user });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/promo/redeem
 * Body: { code: "ABC123" }
 * Returns: { expiresAt: "<ISO timestamp>" }
 */
exports.redeemPromo = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: { message: 'Promo code is required' } });
    }

    const uid = req.user.uid;
    const promoRef = admin.firestore().collection('promoCodes').doc(code.toUpperCase().trim());
    const promoSnap = await promoRef.get();

    if (!promoSnap.exists) {
      return res.status(400).json({ error: { message: 'Invalid promo code' } });
    }

    const promo = promoSnap.data();
    const now = new Date();

    if (promo.expiresAt && new Date(promo.expiresAt) < now) {
      return res.status(400).json({ error: { message: 'Promo code has expired' } });
    }

    const usedCount = promo.usedBy?.length ?? 0;
    if (usedCount >= promo.uses) {
      return res.status(400).json({ error: { message: 'Promo code has reached its usage limit' } });
    }

    if (promo.usedBy?.includes(uid)) {
      return res.status(400).json({ error: { message: 'You have already used this promo code' } });
    }

    const promoExpires = new Date();
    promoExpires.setDate(promoExpires.getDate() + promo.days);

    await admin.firestore().runTransaction(async (t) => {
      const fresh = await t.get(promoRef);
      if (!fresh.exists) throw new Error('Promo disappeared');

      const freshData = fresh.data();
      if (freshData.usedBy?.length >= freshData.uses) {
        throw new Error('Promo usage limit reached');
      }
      if (freshData.expiresAt && new Date(freshData.expiresAt) < new Date()) {
        throw new Error('Promo expired');
      }
      if (freshData.usedBy?.includes(uid)) {
        throw new Error('Already used');
      }

      t.update(promoRef, {
        usedBy: admin.firestore.FieldValue.arrayUnion(uid)
      });

      const userRef = admin.firestore().collection('users').doc(uid);
      t.update(userRef, {
        promoExpiresAt: promoExpires.toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    res.json({ data: { expiresAt: promoExpires.toISOString() } });
  } catch (error) {
    console.error('Redeem promo error:', error);
    next(error);
  }
};

// ─── Save / upsert profile (called from frontend after client-SDK registration) ──────
exports.saveProfile = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: { message: 'Unauthorized' } });

    const { name, role, employeeId, department, hireDate } = req.body;

    const db = admin.firestore();
    await db.collection('users').doc(uid).set({
      uid,
      name: name || null,
      role: role || 'teacher',
      employeeId: employeeId || null,
      department: department || null,
      hireDate: hireDate || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('saveProfile error:', err);
    next(err);
  }
};