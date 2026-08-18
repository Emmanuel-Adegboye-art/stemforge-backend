// Back-End/src/controllers/authController.js
const { admin } = require('../config/firebase');
const User = require('../models/User');
const { sendEmail, sendPasswordResetEmail } = require('../services/mailer');

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

// â”€â”€â”€ Save / upsert profile (called from frontend after client-SDK registration) â”€â”€â”€â”€â”€â”€
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
// ====================================================================
//  PASSWORD RESET
// ====================================================================

exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: { message: 'Email is required' } });

        // Generate a secure token + expiry (1 hour)
        const crypto = require('crypto');
        const token  = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // Look up the user
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        } catch (err) {
            // Don’t leak whether the email exists – return success anyway
            return res.json({ message: 'If that email exists, a reset link has been sent.' });
        }

        // Store token in Firestore
        await admin.firestore().collection('passwordResets').doc(token).set({
            uid: userRecord.uid,
            email,
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            used: false
        });

        // Build the reset link (your front-end URL)
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:8000'}/reset-password.html?token=${token}`;
        const html = `
            <p>Hello,</p>
            <p>Someone (hopefully you) requested a password reset for your STEM Forge account.</p>
            <p>Click the link below to set a new password. The link expires in <strong>1 hour</strong>.</p>
            <p><a href="${resetLink}" style="background:#F59E0B;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Reset Password</a></p>
            <p>If you didn’t request this, you can safely ignore the email.</p>
            <p>— STEM Forge Team</p>`;
        await sendEmail({
            to: email,
            from: process.env.MAIL_FROM_RESET || 'stemforgetechnical@gmail.com',
            subject: '?? Reset your STEM Forge password',
            html
        });

        res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
        console.error('forgotPassword error:', err);
        next(err);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: { message: 'Token and new password are required' } });
        if (newPassword.length < 6) return res.status(400).json({ error: { message: 'Password must be at least 6 characters' } });

        const docRef = admin.firestore().collection('passwordResets').doc(token);
        const snap   = await docRef.get();
        if (!snap.exists) return res.status(400).json({ error: { message: 'Invalid or expired token' } });

        const data = snap.data();
        if (data.used) return res.status(400).json({ error: { message: 'This reset link has already been used' } });
        if (data.expiresAt.toDate() < new Date()) return res.status(400).json({ error: { message: 'Reset link has expired' } });

        // Update password in Firebase Auth
        await admin.auth().updateUser(data.uid, { password: newPassword });

        // Mark token as used
        await docRef.update({ used: true });

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('resetPassword error:', err);
        next(err);
    }
};

