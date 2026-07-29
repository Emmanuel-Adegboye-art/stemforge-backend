const { canUserUse } = require('../services/authService');

/**
 * Middleware: blocks the request unless the user can use the given feature.
 *
 * Example: router.post('/api/lessons/export', authenticate, requireFeature('exportPdf'), handler);
 */
exports.requireFeature = (feature) => {
  return async (req, res, next) => {
    const allowed = await canUserUse(req.user.uid, feature);
    if (!allowed) {
      return res
        .status(403)
        .json({ error: { message: `Feature "${feature}" not available on your plan` } });
    }
    next();
  };
};
