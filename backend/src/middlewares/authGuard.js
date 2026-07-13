import jwt from 'jsonwebtoken';
import { User } from '../modules/users/user.model.js';
import { env } from '../config/env.js';

export const authGuard = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    
    const user = await User.findById(decoded.id).select('_id role status').lean();
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not found' } });
    }
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: `Account is ${user.status}` } });
    }

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message } });
  }
};