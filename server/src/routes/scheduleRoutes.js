import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import WorkSchedule from '../models/WorkSchedule.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const filter = req.query.employeeId ? { employeeId: req.query.employeeId } : {};
    if (req.user.role === 'employee') filter.employeeId = req.user.employeeId;
    res.json({ success: true, items: await WorkSchedule.find(filter).populate('employeeId', 'fullName').sort({ effectiveFrom: -1 }) });
  } catch (error) { next(error); }
});

router.post('/', requireRole('super_admin'), async (req, res, next) => {
  try {
    const item = await WorkSchedule.create({ ...req.body, createdBy: req.user.id });
    await AuditLog.create({ actorId: req.user.id, action: 'create', entityType: 'schedule', entityId: item.id, after: item.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.status(201).json({ success: true, item });
  } catch (error) { next(error); }
});

router.patch('/:id', requireRole('super_admin'), async (req, res, next) => {
  try {
    const item = await WorkSchedule.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Work schedule not found' });
    const before = item.toObject();
    for (const field of ['employeeId', 'weekdaySchedule', 'effectiveFrom', 'effectiveTo']) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }
    await item.save();
    await AuditLog.create({ actorId: req.user.id, action: 'update', entityType: 'schedule', entityId: item.id, before, after: item.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, item });
  } catch (error) { next(error); }
});

export default router;
