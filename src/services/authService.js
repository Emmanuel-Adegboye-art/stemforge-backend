const { admin } = require('../config/firebase');

/**
 * Returns true if the user has an active promo (promoExpiresAt > now)
 * OR if their role/plan grants the requested feature.
 * featureKey is a string you define, e.g. 'exportPdf', 'unlimitedPlans', 'premiumTemplates'.
 */
exports.canUserUse = async (uid, featureKey) => {
  try {
    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    if (!userSnap.exists) return false;
    const data = userSnap.data() || {};

    // 1️⃣ Check promo first – if active, grant everything
    const promoExpires = data.promoExpiresAt ? new Date(data.promoExpiresAt) : null;
    if (promoExpires && promoExpires > new Date()) {
      return true;
    }

    // 2️⃣ Fallback to role/plan based permissions
    const role = data.role || 'student'; // default to student if missing
    const plan = data.plan || 'free';    // you could store a plan field when they upgrade

    // Define what each role/plan can do – adjust to match your actual limits
    const permissions = {
      // Free plan / student role
      student: {
        exportPdf: false,
        premiumTemplates: false,
        unlimitedPlans: false,
        applyPromo: true   // they can still try to redeem a promo
      },
      // Teacher role (or Pro plan)
      teacher: {
        exportPdf: true,
        premiumTemplates: true,
        unlimitedPlans: true,
        applyPromo: true
      },
      // Org admin role (or Enterprise plan)
      org_admin: {
        exportPdf: true,
        premiumTemplates: true,
        unlimitedPlans: true,
        applyPromo: true,
        manageUsers: true,
        viewAnalytics: true
      }
    };

    const rolePerms = permissions[role] || permissions.student;
    return !!rolePerms[featureKey];
  } catch (error) {
    console.error('canUserUse error:', error);
    return false; // fail safe
  }
};
