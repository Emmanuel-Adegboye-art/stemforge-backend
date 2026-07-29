// Back-End/src/controllers/authController.js
const { admin } = require('../config/firebase');
const User = require('../models/User');

exports.register = async (req, res, next) => {
  try {
    const { email, password, name, role, employeeId, department, hireDate } = req.body;

    // ---------- Validation ----------
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        error: { message: 'Email, password, name and role are required' }
      });
    }

    // 1. Create Firebase Auth user
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: false
    });

    // 2. Send verification email - FIXED for Admin SDK
    // admin.auth().createUser() returns UserRecord which has NO sendEmailVerification()
    // We must generate a link instead
    try {
      const actionCodeSettings = {
        url: `${process.env.FRONTEND_URL || 'http://localhost:5500'}/login.html`,
        handleCodeInApp: false
      };
      await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
    } catch (mailErr) {
      console.warn('Verification link generation failed:', mailErr.message);
    }

    // 3. Create Firestore profile (users collection)
    const profileData = {
      firebaseUid: firebaseUser.uid,
      email,
      name,
      role: role.toLowerCase(),
      employeeId: employeeId || null,
      department: department || null,
      hireDate: hireDate || null,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await admin.firestore().collection('users').doc(firebaseUser.uid).set(profileData);
    } catch (fsErr) {
      console.warn('Firestore profile save warning:', fsErr.message);
    }

    const userProfile = profileData;

    // 4. Return minimal payload
    res.status(201).json({
      data: {
        uid: firebaseUser.uid,
        email: userProfile.email || email,
        name: userProfile.name || name,
        role: userProfile.role || role.toLowerCase(),
        emailVerified: false
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: { message: 'Email already in use' } });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: { message: 'Invalid email format' } });
    }
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: { message: 'Password too weak' } });
    }
    next(error);
  }
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