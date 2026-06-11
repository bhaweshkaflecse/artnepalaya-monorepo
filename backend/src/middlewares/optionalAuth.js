import jwt from 'jsonwebtoken';
import { User } from '../modules/users/user.model.js';
import { env } from '../config/env.js';

/**
 * Optional auth middleware - attaches user to req if valid token present,
 * but does not reject the request if no token is provided.
 * If a token IS provided but is invalid/expired, returns 401 instead of
 * silently falling through to guest mode.
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // No authorization header at all - proceed as guest
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  // Token is present - it MUST be valid; reject if not
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id).select('_id role status username email').lean();
    if (user && user.status !== 'banned' && user.status !== 'suspended') {
      req.user = { id: user._id.toString(), role: user.role, username: user.username, email: user.email };
    } else {
      req.user = null;
    }
    next();
  } catch (err) {
    // Token was provided but is invalid or expired - reject with 401
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' }
    });
  }
};
