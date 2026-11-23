import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('super_admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const filter = {};
    if (req.query.entityType) filter.entityType = req.query.entityType;
    if (req.query.actorId) filter.actorId = req.query.actorId;
    const totalItems = await AuditLog.countDocuments(filter);
    const items = await AuditLog.find(filter).populate('actorId', 'name email').sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit);
    res.json({ success: true, items, page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) });
  } catch (error) { next(error); }
});

export default router;
