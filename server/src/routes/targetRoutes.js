import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import TargetSetting from '../models/TargetSetting.js';
import AuditLog from '../models/AuditLog.js';
import TeamAssignment from '../models/TeamAssignment.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'employee') {
      filter = { employeeId: req.user.employeeId };
    } else if (req.user.role === 'supervisor') {
      const today = new Date();
      const assignments = await TeamAssignment.find({
        supervisorId: req.user.id,
        effectiveFrom: { $lte: today },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today } }],
      }).select('employeeId teamId');
      filter = {
        $or: [
          { employeeId: { $in: assignments.map((assignment) => assignment.employeeId) } },
          { teamId: { $in: assignments.map((assignment) => assignment.teamId).filter(Boolean) } },
        ],
      };
    }
    res.json({ success: true, items: await TargetSetting.find(filter).populate('employeeId', 'fullName').populate('teamId', 'name').sort({ effectiveFrom: -1 }) });
  } catch (error) { next(error); }
});

router.post('/', requireRole('super_admin'), async (req, res, next) => {
  try {
    const item = await TargetSetting.create({ ...req.body, createdBy: req.user.id });
    await AuditLog.create({ actorId: req.user.id, action: 'create', entityType: 'target', entityId: item.id, after: item.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.status(201).json({ success: true, item });
  } catch (error) { next(error); }
});

router.patch('/:id', requireRole('super_admin'), async (req, res, next) => {
  try {
    const item = await TargetSetting.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Target setting not found' });
    const before = item.toObject();
    for (const field of ['employeeId', 'teamId', 'idDailyTarget', 'salesDailyTarget', 'effectiveFrom', 'effectiveTo']) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }
    await item.save();
    await AuditLog.create({ actorId: req.user.id, action: 'update', entityType: 'target', entityId: item.id, before, after: item.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, item });
  } catch (error) { next(error); }
});

export default router;
