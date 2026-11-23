import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import CompanySetting from '../models/CompanySetting.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const item = await CompanySetting.findOneAndUpdate(
      { key: 'company' },
      { $setOnInsert: { key: 'company' } },
      { upsert: true, new: true },
    );
    res.json({ success: true, item });
  } catch (error) { next(error); }
});

router.patch('/', requireRole('super_admin'), async (req, res, next) => {
  try {
    const before = await CompanySetting.findOne({ key: 'company' });
    const item = await CompanySetting.findOneAndUpdate(
      { key: 'company' },
      { ...req.body, key: 'company', updatedBy: req.user.id },
      { upsert: true, new: true, runValidators: true },
    );
    await AuditLog.create({ actorId: req.user.id, action: 'update', entityType: 'companySettings', entityId: item.id, before: before?.toObject(), after: item.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, item });
  } catch (error) { next(error); }
});

export default router;
