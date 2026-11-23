import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import Team from '../models/Team.js';
import TeamAssignment from '../models/TeamAssignment.js';
import Employee from '../models/Employee.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try { res.json({ success: true, items: await Team.find().populate('supervisorId', 'name email').sort({ name: 1 }) }); } catch (error) { next(error); }
});

router.post('/', requireRole('super_admin'), async (req, res, next) => {
  try {
    const before = null;
    const item = await Team.create(req.body);
    await AuditLog.create({ actorId: req.user.id, action: 'create', entityType: 'team', entityId: item.id, before, after: item.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.status(201).json({ success: true, item });
  } catch (error) { next(error); }
});

router.post('/:id/assignments', requireRole('super_admin'), async (req, res, next) => {
  try {
    const { employeeId, supervisorId, effectiveFrom, effectiveTo } = req.body;
    if (!employeeId || !supervisorId || !effectiveFrom) return res.status(400).json({ success: false, message: 'Employee, supervisor and effective date are required' });
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    const assignment = await TeamAssignment.create({ employeeId, teamId: team.id, supervisorId, effectiveFrom, effectiveTo: effectiveTo || null });
    await Employee.findByIdAndUpdate(employeeId, { teamId: team.id, supervisorId });
    await AuditLog.create({ actorId: req.user.id, action: 'assignment-change', entityType: 'teamAssignment', entityId: assignment.id, after: assignment.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.status(201).json({ success: true, item: assignment });
  } catch (error) { next(error); }
});

router.get('/supervisors/list', requireRole('super_admin'), async (req, res, next) => {
  try {
    res.json({ success: true, items: await User.find({ role: 'supervisor', isActive: true }).select('name email username') });
  } catch (error) { next(error); }
});

router.post('/supervisors', requireRole('super_admin'), async (req, res, next) => {
  try {
    const { name, email, username, password } = req.body;
    if (!name || !email || !username || !password || password.length < 12) {
      return res.status(400).json({ success: false, message: 'Name, email, username and a 12-character password are required' });
    }
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      username: username.trim().toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      role: 'supervisor',
    });
    await AuditLog.create({ actorId: req.user.id, action: 'create', entityType: 'supervisor', entityId: user.id, after: { id: user.id, name: user.name, email: user.email }, ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.status(201).json({ success: true, item: { id: user.id, name: user.name, email: user.email } });
  } catch (error) { next(error); }
});

router.patch('/:id/supervisor', requireRole('super_admin'), async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    const supervisor = await User.findOne({ _id: req.body.supervisorId, role: 'supervisor', isActive: true });
    if (!supervisor) return res.status(400).json({ success: false, message: 'Choose an active supervisor account' });
    const members = await Employee.find({ teamId: team.id });
    const effectiveFrom = req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : new Date();
    await TeamAssignment.updateMany(
      { teamId: team.id, effectiveTo: null },
      { effectiveTo: new Date(effectiveFrom.getTime() - 1) },
    );
    if (members.length) {
      await TeamAssignment.insertMany(members.map((employee) => ({
        employeeId: employee.id,
        teamId: team.id,
        supervisorId: supervisor.id,
        effectiveFrom,
      })));
      await Employee.updateMany({ teamId: team.id }, { supervisorId: supervisor.id });
    }
    const before = team.toObject();
    team.supervisorId = supervisor.id;
    await team.save();
    await AuditLog.create({ actorId: req.user.id, action: 'assign-supervisor', entityType: 'team', entityId: team.id, before, after: team.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, item: await team.populate('supervisorId', 'name email') });
  } catch (error) { next(error); }
});

export default router;
