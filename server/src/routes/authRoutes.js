import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();
const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  maxAge: 15 * 60 * 1000,
};

router.post('/login', async (req, res, next) => {
  try {
    const identity = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!identity || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });
    const user = await User.findOne({ $or: [{ email: identity }, { username: identity }] }).select('+passwordHash');
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const access = jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret, { expiresIn: '15m' });
    const refresh = jwt.sign({ sub: user.id }, env.jwtRefreshSecret, { expiresIn: '7d' });
    user.refreshTokenHash = await bcrypt.hash(refresh, 10);
    user.lastLoginAt = new Date();
    await user.save();
    res.cookie('nexemers_access', access, cookieOptions);
    res.cookie('nexemers_refresh', refresh, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId } });
  } catch (error) { next(error); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refresh = req.cookies?.nexemers_refresh;
    if (!refresh) return res.status(401).json({ success: false, message: 'Refresh session is missing' });
    const payload = jwt.verify(refresh, env.jwtRefreshSecret);
    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    if (!user || !user.isActive || !user.refreshTokenHash || !(await bcrypt.compare(refresh, user.refreshTokenHash))) {
      return res.status(401).json({ success: false, message: 'Refresh session is no longer valid' });
    }
    const access = jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret, { expiresIn: '15m' });
    const rotated = jwt.sign({ sub: user.id }, env.jwtRefreshSecret, { expiresIn: '7d' });
    user.refreshTokenHash = await bcrypt.hash(rotated, 10);
    await user.save();
    res.cookie('nexemers_access', access, cookieOptions);
    res.cookie('nexemers_refresh', rotated, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true });
  } catch {
    res.status(401).json({ success: false, message: 'Refresh session is invalid or expired' });
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const refresh = req.cookies?.nexemers_refresh;
    if (refresh) {
      try {
        const payload = jwt.verify(refresh, env.jwtRefreshSecret);
        await User.updateOne({ _id: payload.sub }, { $unset: { refreshTokenHash: 1 } });
      } catch {
        // An invalid or expired token is already unusable.
      }
    }
    const clearOptions = { httpOnly: true, secure: env.nodeEnv === 'production', sameSite: env.nodeEnv === 'production' ? 'none' : 'lax' };
    res.clearCookie('nexemers_access', clearOptions);
    res.clearCookie('nexemers_refresh', clearOptions);
    res.json({ success: true, message: 'Logged out' });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = email ? await User.findOne({ email }).select('+passwordResetHash +passwordResetExpires') : null;
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.passwordResetHash = await bcrypt.hash(token, 10);
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      if (env.nodeEnv !== 'production') {
        return res.json({ success: true, message: 'If the account exists, a reset request was accepted.', resetToken: token });
      }
    }
    if (user && env.nodeEnv === 'production') {
      return res.status(503).json({ success: false, message: 'Password reset email delivery is not configured. Contact your system administrator.' });
    }
    res.json({ success: true, message: 'If the account exists, a reset request was accepted.' });
  } catch (error) { next(error); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (!token || password.length < 8) return res.status(400).json({ success: false, message: 'A valid reset token and 8-character password are required' });
    const users = await User.find({
      passwordResetExpires: { $gt: new Date() },
      passwordResetHash: { $exists: true },
    }).select('+passwordResetHash +passwordResetExpires');
    let matched = null;
    for (const user of users) {
      if (await bcrypt.compare(token, user.passwordResetHash)) { matched = user; break; }
    }
    if (!matched) return res.status(400).json({ success: false, message: 'Reset token is invalid or expired' });
    matched.passwordHash = await bcrypt.hash(password, 12);
    matched.passwordResetHash = undefined;
    matched.passwordResetExpires = undefined;
    matched.refreshTokenHash = undefined;
    await matched.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) { next(error); }
});

export default router;
