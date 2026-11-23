import Employee from '../models/Employee.js';
import TeamAssignment from '../models/TeamAssignment.js';

export async function canAccessEmployee(req, employeeId) {
  if (req.user.role === 'super_admin') return true;
  if (req.user.role === 'employee') return String(req.user.employeeId) === String(employeeId);
  const employee = await Employee.findById(employeeId).select('teamId');
  if (!employee) return false;
  const today = new Date();
  const assigned = await TeamAssignment.exists({
    employeeId: employee._id,
    supervisorId: req.user.id,
    effectiveFrom: { $lte: today },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today } }],
  }) || await TeamAssignment.exists({
    teamId: employee.teamId,
    supervisorId: req.user.id,
    effectiveFrom: { $lte: today },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: today } }],
  });
  return Boolean(assigned);
}
