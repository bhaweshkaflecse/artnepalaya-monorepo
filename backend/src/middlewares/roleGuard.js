export const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user || !requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permission denied' } });
    }
    next();
  };
};