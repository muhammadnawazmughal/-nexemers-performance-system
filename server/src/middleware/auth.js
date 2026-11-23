import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

export async function authenticate(req, res, next) {
  const token = req.cookies?.nexemers_access || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const user = await User.findById(payload.sub).select('-passwordHash -refreshTokenHash');
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Account unavailable' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }
    next();
  };
}
