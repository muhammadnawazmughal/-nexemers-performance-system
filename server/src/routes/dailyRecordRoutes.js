import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { canAccessEmployee } from '../middleware/scope.js';
import DailyRecord from '../models/DailyRecord.js';
import LocationBreakdown from '../models/LocationBreakdown.js';
import Employee from '../models/Employee.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const filter = {};
    if (req.query.fromDate || req.query.toDate) {
      filter.workDate = {};
      if (req.query.fromDate) filter.workDate.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) filter.workDate.$lte = new Date(`${req.query.toDate}T23:59:59.999Z`);
    }
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    if (req.user.role === 'employee') filter.employeeId = req.user.employeeId;
    if (req.user.role === 'supervisor') filter['supervisorSnapshot.id'] = req.user.id;
    if (req.query.teamId) filter['teamSnapshot.id'] = req.query.teamId;
    const totalItems = await DailyRecord.countDocuments(filter);
    const items = await DailyRecord.find(filter).populate('employeeId', 'fullName employeeCode').sort({ workDate: -1 }).skip((page - 1) * limit).limit(limit);
    res.json({ success: true, items, page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) });
  } catch (error) { next(error); }
});

router.post('/', requireRole('super_admin', 'supervisor'), async (req, res, next) => {
  try {
    const { employeeId, workDate, totalIds, locations, notes } = req.body;
    if (!employeeId || !workDate || totalIds == null) return res.status(400).json({ success: false, message: 'Employee, work date and ID total are required' });
    if (!await canAccessEmployee(req, employeeId)) return res.status(403).json({ success: false, message: 'Employee is outside your scope' });
    const employee = await Employee.findById(employeeId).populate('teamId', 'name').populate('supervisorId', 'name');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const locationRows = Array.isArray(locations) ? locations : [];
    const locationTotal = locationRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
    if (locationRows.length === 0 || locationTotal !== Number(totalIds)) {
      return res.status(400).json({ success: false, errors: [{ field: 'locations', message: 'Location counts must sum to the daily ID total' }] });
    }
    const date = new Date(`${String(workDate).slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || !Number.isInteger(Number(totalIds)) || Number(totalIds) < 0) {
      return res.status(400).json({ success: false, message: 'Work date and ID total are invalid' });
    }
    if (locationRows.some((row) => !String(row.city || '').trim() || !String(row.state || '').trim() || !Number.isInteger(Number(row.count)) || Number(row.count) < 0)) {
      return res.status(400).json({ success: false, message: 'Each location needs a city, state and non-negative whole-number count' });
    }
    const record = await DailyRecord.create({
      employeeId,
      workDate: date,
      totalIds: Number(totalIds),
      notes: notes || '',
      enteredBy: req.user.id,
      teamSnapshot: employee.teamId ? { id: employee.teamId.id, name: employee.teamId.name } : null,
      supervisorSnapshot: employee.supervisorId ? { id: employee.supervisorId.id, name: employee.supervisorId.name } : null,
    });
    await LocationBreakdown.insertMany(locationRows.map((row) => ({ dailyRecordId: record.id, city: row.city, state: row.state, count: Number(row.count) })));
    await AuditLog.create({ actorId: req.user.id, action: 'create', entityType: 'dailyRecord', entityId: record.id, after: record.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.status(201).json({ success: true, item: record });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: 'A daily record already exists for this employee and date' });
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const record = await DailyRecord.findById(req.params.id).populate('employeeId', 'fullName employeeCode');
    if (!record) return res.status(404).json({ success: false, message: 'Daily record not found' });
    if (!await canAccessEmployee(req, record.employeeId.id)) return res.status(403).json({ success: false, message: 'Record outside your scope' });
    const locations = await LocationBreakdown.find({ dailyRecordId: record.id });
    res.json({ success: true, item: record, locations });
  } catch (error) { next(error); }
});

router.patch('/:id', requireRole('super_admin', 'supervisor'), async (req, res, next) => {
  try {
    const record = await DailyRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Daily record not found' });
    if (!await canAccessEmployee(req, record.employeeId)) return res.status(403).json({ success: false, message: 'Record outside your scope' });
    const totalIds = req.body.totalIds == null ? record.totalIds : Number(req.body.totalIds);
    const locationRows = Array.isArray(req.body.locations) ? req.body.locations : await LocationBreakdown.find({ dailyRecordId: record.id }).lean();
    if (!Number.isInteger(totalIds) || totalIds < 0) return res.status(400).json({ success: false, message: 'ID total must be a non-negative whole number' });
    if (!locationRows.length || locationRows.reduce((sum, row) => sum + Number(row.count || 0), 0) !== totalIds) {
      return res.status(400).json({ success: false, message: 'Location counts must sum to the daily ID total' });
    }
    if (locationRows.some((row) => !String(row.city || '').trim() || !String(row.state || '').trim() || !Number.isInteger(Number(row.count)) || Number(row.count) < 0)) {
      return res.status(400).json({ success: false, message: 'Each location needs valid city, state and count values' });
    }
    record.totalIds = totalIds;
    record.notes = req.body.notes == null ? record.notes : String(req.body.notes).slice(0, 1000);
    const before = record.toObject();
    await record.save();
    if (Array.isArray(req.body.locations)) {
      await LocationBreakdown.deleteMany({ dailyRecordId: record.id });
      await LocationBreakdown.insertMany(locationRows.map((row) => ({
        dailyRecordId: record.id,
        city: String(row.city).trim(),
        state: String(row.state).trim(),
        count: Number(row.count),
      })));
    }
    await AuditLog.create({ actorId: req.user.id, action: 'update', entityType: 'dailyRecord', entityId: record.id, before, after: record.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, item: record });
  } catch (error) { next(error); }
});

router.delete('/:id', requireRole('super_admin', 'supervisor'), async (req, res, next) => {
  try {
    const record = await DailyRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Daily record not found' });
    if (!await canAccessEmployee(req, record.employeeId)) return res.status(403).json({ success: false, message: 'Record outside your scope' });
    await LocationBreakdown.deleteMany({ dailyRecordId: record.id });
    await record.deleteOne();
    await AuditLog.create({ actorId: req.user.id, action: 'delete', entityType: 'dailyRecord', entityId: record.id, before: record.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, message: 'Daily record deleted' });
  } catch (error) { next(error); }
});

export default router;
