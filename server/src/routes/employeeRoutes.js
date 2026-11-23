import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import Employee from '../models/Employee.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import TeamAssignment from '../models/TeamAssignment.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const search = String(req.query.search || '').trim();
    const filter = {};
    if (search) filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { employeeCode: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
    ];
    if (req.query.status) filter.status = req.query.status;
    if (req.query.teamId) filter.teamId = req.query.teamId;
    if (req.user.role === 'employee') filter._id = req.user.employeeId;
    if (req.user.role === 'supervisor') {
      const today = new Date();
      const assignments = await TeamAssignment.find({
        supervisorId: req.user.id,
        effectiveFrom: { $lte: today },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today } }],
      }).select('employeeId teamId');
      const employeeIds = assignments.map((assignment) => assignment.employeeId).filter(Boolean);
      const teamIds = assignments.map((assignment) => assignment.teamId).filter(Boolean);
      filter.$and = [
        filter.$and || {},
        { $or: [{ _id: { $in: employeeIds } }, ...(teamIds.length ? [{ teamId: { $in: teamIds } }] : [])] },
      ];
    }
    const totalItems = await Employee.countDocuments(filter);
    const items = await Employee.find(filter).populate('teamId', 'name code').populate('supervisorId', 'name').sort({ fullName: 1 }).skip((page - 1) * limit).limit(limit);
    res.json({ success: true, items, page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) });
  } catch (error) { next(error); }
});

router.post('/', requireRole('super_admin'), async (req, res, next) => {
  let employee;
  let user;
  try {
    const { fullName, username, email, employeeCode, teamId, supervisorId, joiningDate, password } = req.body;
    if (!fullName || !username || !email || !employeeCode || !password || password.length < 12) {
      return res.status(400).json({ success: false, message: 'Required employee fields are missing or password is shorter than 12 characters' });
    }
    const team = teamId ? await Team.findById(teamId).populate('supervisorId') : null;
    if (teamId && !team) return res.status(400).json({ success: false, message: 'Selected team does not exist' });
    const assignedSupervisorId = supervisorId || team?.supervisorId?.id || null;
    if (assignedSupervisorId && !await User.exists({ _id: assignedSupervisorId, role: 'supervisor', isActive: true })) {
      return res.status(400).json({ success: false, message: 'Selected supervisor is not active' });
    }
    employee = await Employee.create({ fullName, username, email: email.trim().toLowerCase(), employeeCode, teamId: teamId || null, supervisorId: assignedSupervisorId, joiningDate: joiningDate || new Date() });
    user = await User.create({ name: fullName, username: username.trim().toLowerCase(), email: email.trim().toLowerCase(), employeeId: employee.id, passwordHash: await bcrypt.hash(password, 12), role: 'employee' });
    if (teamId && assignedSupervisorId) {
      await TeamAssignment.create({ employeeId: employee.id, teamId, supervisorId: assignedSupervisorId, effectiveFrom: new Date() });
    }
    await AuditLog.create({ actorId: req.user.id, action: 'create', entityType: 'employee', entityId: employee.id, after: employee.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.status(201).json({ success: true, item: employee, userId: user.id });
  } catch (error) {
    if (user) await User.deleteOne({ _id: user.id });
    if (employee) {
      await TeamAssignment.deleteMany({ employeeId: employee.id });
      await Employee.deleteOne({ _id: employee.id });
    }
    next(error);
  }
});

router.patch('/:id', requireRole('super_admin'), async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const before = employee.toObject();
    const allowed = ['fullName', 'username', 'email', 'employeeCode', 'teamId', 'supervisorId', 'joiningDate', 'timezone'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) employee[field] = req.body[field];
    }
    await employee.save();
    await User.updateOne(
      { employeeId: employee.id },
      {
        name: employee.fullName,
        username: String(employee.username).trim().toLowerCase(),
        email: String(employee.email).trim().toLowerCase(),
      },
    );
    await AuditLog.create({ actorId: req.user.id, action: 'update', entityType: 'employee', entityId: employee.id, before, after: employee.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, item: employee });
  } catch (error) { next(error); }
});

router.patch('/:id/status', requireRole('super_admin'), async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const before = employee.toObject();
    employee.status = req.body.status;
    if (req.body.status === 'inactive') employee.inactiveFrom = req.body.inactiveFrom ? new Date(req.body.inactiveFrom) : new Date();
    await employee.save();
    await User.updateOne({ employeeId: employee.id }, { isActive: req.body.status === 'active' });
    await AuditLog.create({ actorId: req.user.id, action: 'status-change', entityType: 'employee', entityId: employee.id, before, after: employee.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, item: employee });
  } catch (error) { next(error); }
});

export default router;
