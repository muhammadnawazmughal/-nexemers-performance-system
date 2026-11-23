import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { canAccessEmployee } from '../middleware/scope.js';
import SalesRecord from '../models/SalesRecord.js';
import Employee from '../models/Employee.js';
import AuditLog from '../models/AuditLog.js';
import CompanySetting from '../models/CompanySetting.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const filter = {};
    if (req.query.fromDate || req.query.toDate) {
      filter.transactionDate = {};
      if (req.query.fromDate) filter.transactionDate.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) filter.transactionDate.$lte = new Date(`${req.query.toDate}T23:59:59.999Z`);
    }
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    if (req.user.role === 'employee') filter.employeeId = req.user.employeeId;
    if (req.user.role === 'supervisor') filter['supervisorSnapshot.id'] = req.user.id;
    const totalItems = await SalesRecord.countDocuments(filter);
    const items = await SalesRecord.find(filter).populate('employeeId', 'fullName employeeCode').sort({ transactionDate: -1 }).skip((page - 1) * limit).limit(limit);
    res.json({ success: true, items, page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) });
  } catch (error) { next(error); }
});

router.post('/', requireRole('super_admin', 'supervisor'), async (req, res, next) => {
  try {
    const { employeeId, transactionDate, amount, saleCount, reference, notes } = req.body;
    if (!employeeId || !transactionDate || amount == null) return res.status(400).json({ success: false, message: 'Employee, transaction date and amount are required' });
    const date = new Date(`${String(transactionDate).slice(0, 10)}T00:00:00.000Z`);
    const numericAmount = Number(amount);
    if (Number.isNaN(date.getTime()) || !Number.isFinite(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ success: false, message: 'Transaction date and amount are invalid' });
    }
    if (!await canAccessEmployee(req, employeeId)) return res.status(403).json({ success: false, message: 'Employee is outside your scope' });
    const employee = await Employee.findById(employeeId).populate('teamId', 'name').populate('supervisorId', 'name');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const settings = await CompanySetting.findOne({ key: 'company' });
    const item = await SalesRecord.create({
      employeeId, transactionDate: date, amount: numericAmount, saleCount: Number.isInteger(Number(saleCount)) ? Number(saleCount) : 0,
      currency: settings?.currency || 'PKR', reference: reference || '', notes: notes || '', enteredBy: req.user.id,
      teamSnapshot: employee.teamId ? { id: employee.teamId.id, name: employee.teamId.name } : null,
      supervisorSnapshot: employee.supervisorId ? { id: employee.supervisorId.id, name: employee.supervisorId.name } : null,
    });
    await AuditLog.create({ actorId: req.user.id, action: 'create', entityType: 'salesRecord', entityId: item.id, after: item.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.status(201).json({ success: true, item });
  } catch (error) { next(error); }
});

router.patch('/:id', requireRole('super_admin', 'supervisor'), async (req, res, next) => {
  try {
    const item = await SalesRecord.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Sales record not found' });
    if (!await canAccessEmployee(req, item.employeeId)) return res.status(403).json({ success: false, message: 'Record outside your scope' });
    const before = item.toObject();
    if (req.body.amount != null) {
      const amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ success: false, message: 'Amount must be zero or greater' });
      item.amount = amount;
    }
    if (req.body.saleCount != null) {
      const saleCount = Number(req.body.saleCount);
      if (!Number.isInteger(saleCount) || saleCount < 0) return res.status(400).json({ success: false, message: 'Sale count must be a non-negative whole number' });
      item.saleCount = saleCount;
    }
    if (req.body.reference != null) item.reference = String(req.body.reference).slice(0, 500);
    if (req.body.notes != null) item.notes = String(req.body.notes).slice(0, 1000);
    await item.save();
    await AuditLog.create({ actorId: req.user.id, action: 'update', entityType: 'salesRecord', entityId: item.id, before, after: item.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, item });
  } catch (error) { next(error); }
});

router.delete('/:id', requireRole('super_admin', 'supervisor'), async (req, res, next) => {
  try {
    const item = await SalesRecord.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Sales record not found' });
    if (!await canAccessEmployee(req, item.employeeId)) return res.status(403).json({ success: false, message: 'Record outside your scope' });
    await item.deleteOne();
    await AuditLog.create({ actorId: req.user.id, action: 'delete', entityType: 'salesRecord', entityId: item.id, before: item.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, message: 'Sales record deleted' });
  } catch (error) { next(error); }
});

export default router;
