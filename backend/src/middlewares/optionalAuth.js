import jwt from 'jsonwebtoken';
import { User } from '../modules/users/user.model.js';
import { env } from '../config/env.js';

/**
 * Optional auth middleware - attaches user to req if valid token present,
 * but does not reject the request if no token is provided.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id).select('_id role status username email').lean();
    if (user && user.status !== 'banned' && user.status !== 'suspended') {
      req.user = { id: user._id.toString(), role: user.role, username: user.username, email: user.email };
    } else {
      req.user = null;
    }
    next();
  } catch {
    // Invalid token - proceed as guest
    req.user = null;
    next();
  }
};
