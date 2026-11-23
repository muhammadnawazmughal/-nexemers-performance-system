import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import Attendance from '../models/Attendance.js';
import AuditLog from '../models/AuditLog.js';
import { canAccessEmployee } from '../middleware/scope.js';
import TeamAssignment from '../models/TeamAssignment.js';
import Employee from '../models/Employee.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const filter = req.query.employeeId ? { employeeId: req.query.employeeId } : {};
    if (req.query.fromDate || req.query.toDate) {
      filter.workDate = {};
      if (req.query.fromDate) filter.workDate.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) filter.workDate.$lte = new Date(`${req.query.toDate}T23:59:59.999Z`);
    }
    if (req.user.role === 'employee') filter.employeeId = req.user.employeeId;
    if (req.user.role === 'supervisor') {
      const today = new Date();
      const assignments = await TeamAssignment.find({
        supervisorId: req.user.id,
        effectiveFrom: { $lte: today },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today } }],
      }).select('employeeId');
      filter.employeeId = { $in: assignments.map((assignment) => assignment.employeeId) };
    }
    res.json({ success: true, items: await Attendance.find(filter).populate('employeeId', 'fullName employeeCode').sort({ workDate: -1 }) });
  } catch (error) { next(error); }
});

router.post('/', requireRole('super_admin', 'supervisor'), async (req, res, next) => {
  try {
    const { employeeId, workDate, attendanceStatus } = req.body;
    if (!employeeId || !workDate || !['present', 'absent', 'leave', 'off'].includes(attendanceStatus)) {
      return res.status(400).json({ success: false, message: 'Employee, valid work date and attendance status are required' });
    }
    if (!await canAccessEmployee(req, employeeId)) return res.status(403).json({ success: false, message: 'Employee is outside your scope' });
    const employee = await Employee.findById(employeeId).select('_id');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const date = new Date(workDate);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: 'Work date is invalid' });
    date.setUTCHours(0, 0, 0, 0);
    const item = await Attendance.findOneAndUpdate(
      { employeeId, workDate: date },
      { employeeId, workDate: date, attendanceStatus, notes: String(req.body.notes || '').slice(0, 1000), markedBy: req.user.id },
      { upsert: true, new: true, runValidators: true },
    );
    await AuditLog.create({ actorId: req.user.id, action: 'save', entityType: 'attendance', entityId: item.id, after: item.toObject(), ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.status(201).json({ success: true, item });
  } catch (error) { next(error); }
});

export default router;
