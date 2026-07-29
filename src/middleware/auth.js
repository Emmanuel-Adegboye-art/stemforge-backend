const jwt = require('jsonwebtoken');
const { admin } = require('../config/firebase');

/**
 * Authenticate middleware - supports both Firebase ID tokens and legacy JWT
 */
const authenticate = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: { message: 'No token provided' } });
    }

    try {
        // Try Firebase ID token first
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                firebaseUid: decodedToken.uid,
                id: decodedToken.uid
            };
            return next();
        } catch (firebaseError) {
            // Fallback to legacy JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = {
                id: decoded.id,
                email: decoded.email,
                uid: decoded.id
            };
            return next();
        }
    } catch (error) {
        return res.status(401).json({ error: { message: 'Invalid token' } });
    }
};

/**
 * Middleware: ensure the authenticated user has at least one of the allowed roles.
 * Usage: router.get('/...', authenticate, requireRole('teacher','org_admin'), handler);
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const uid = req.user.uid || req.user.id; // set by authenticate middleware
      const userDoc = await admin.firestore().collection('users').doc(uid).get();

      if (!userDoc.exists) {
        // Try querying by firebaseUid field if doc ID is different
        const snapshot = await admin.firestore().collection('users').where('firebaseUid', '==', uid).limit(1).get();
        if (snapshot.empty) {
          return res.status(403).json({ error: { message: 'User profile not found' } });
        }
        const userRole = snapshot.docs[0].data().role;
        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({ error: { message: 'Insufficient permissions' } });
        }
        return next();
      }

      const userRole = userDoc.data().role; // e.g. "teacher", "org_admin", "student"
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: { message: 'Insufficient permissions' } });
      }
      next();
    } catch (err) {
      console.error('Role check error:', err);
      next(err);
    }
  };
};

module.exports = { authenticate, requireRole };