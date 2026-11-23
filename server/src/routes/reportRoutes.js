import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import Employee from '../models/Employee.js';
import Team from '../models/Team.js';
import DailyRecord from '../models/DailyRecord.js';
import SalesRecord from '../models/SalesRecord.js';
import { buildPerformanceRows, startOfWeek } from '../services/reportService.js';
import { canAccessEmployee } from '../middleware/scope.js';

const router = Router();
router.use(authenticate);

function periodBounds(period, date) {
  const anchor = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(anchor.getTime())) return null;
  const start = new Date(anchor);
  if (period === 'day') {
    // Keep the UTC calendar date as the report interval.
  } else if (period === 'week') {
    start.setTime(startOfWeek(date).getTime());
  } else if (period === 'month') {
    start.setUTCDate(1);
  } else if (period === 'year') {
    start.setUTCMonth(0, 1);
  } else {
    return null;
  }
  const end = new Date(start);
  if (period === 'day') end.setUTCDate(end.getUTCDate() + 1);
  if (period === 'week') end.setUTCDate(end.getUTCDate() + 7);
  if (period === 'month') end.setUTCMonth(end.getUTCMonth() + 1);
  if (period === 'year') end.setUTCFullYear(end.getUTCFullYear() + 1);
  return { start, end, days: Math.round((end - start) / 86400000) };
}

router.get('/dashboard', requireRole('super_admin'), async (req, res, next) => {
  try {
    const today = req.query.date ? new Date(`${req.query.date}T23:59:59.999Z`) : new Date();
    const dayStart = new Date(today); dayStart.setUTCHours(0, 0, 0, 0);
    const weekStart = startOfWeek(today.toISOString().slice(0, 10));
    const chartStart = new Date(weekStart);
    const [employees, activeEmployees, teams, todayIds, todaySales, weekIds, weekSales, dailyIds, dailySales] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Team.find().lean(),
      DailyRecord.aggregate([{ $match: { workDate: { $gte: dayStart, $lte: today } } }, { $group: { _id: null, value: { $sum: '$totalIds' } } }]),
      SalesRecord.aggregate([{ $match: { transactionDate: { $gte: dayStart, $lte: today } } }, { $group: { _id: null, value: { $sum: '$amount' } } }]),
      DailyRecord.aggregate([{ $match: { workDate: { $gte: weekStart, $lte: today } } }, { $group: { _id: null, value: { $sum: '$totalIds' } } }]),
      SalesRecord.aggregate([{ $match: { transactionDate: { $gte: weekStart, $lte: today } } }, { $group: { _id: null, value: { $sum: '$amount' } } }]),
      DailyRecord.aggregate([
        { $match: { workDate: { $gte: chartStart, $lte: today } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$workDate', timezone: 'Asia/Karachi' } }, value: { $sum: '$totalIds' } } },
        { $sort: { _id: 1 } },
      ]),
      SalesRecord.aggregate([
        { $match: { transactionDate: { $gte: chartStart, $lte: today } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate', timezone: 'Asia/Karachi' } }, value: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    res.json({
      success: true,
      kpis: {
        totalEmployees: employees,
        activeEmployees,
        teamCount: teams.length,
        todayIds: todayIds[0]?.value || 0,
        todaySales: todaySales[0]?.value || 0,
        weekIds: weekIds[0]?.value || 0,
        weekSales: weekSales[0]?.value || 0,
      },
      chartData: {
        dailyIds: dailyIds.map((row) => ({ date: row._id, value: row.value })),
        dailySales: dailySales.map((row) => ({ date: row._id, value: row.value })),
      },
    });
  } catch (error) { next(error); }
});

router.get('/daily', async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(`${req.query.date}T00:00:00Z`) : new Date();
    const filter = { workDate: { $gte: date, $lt: new Date(date.getTime() + 86400000) } };
    if (req.user.role === 'employee') filter.employeeId = req.user.employeeId;
    if (req.user.role === 'supervisor') filter['supervisorSnapshot.id'] = req.user.id;
    const records = await DailyRecord.find(filter).populate('employeeId', 'fullName employeeCode');
    res.json({ success: true, date: date.toISOString().slice(0, 10), items: records });
  } catch (error) { next(error); }
});

router.get('/period', async (req, res, next) => {
  try {
    const period = String(req.query.period || 'day');
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const bounds = periodBounds(period, date);
    if (!bounds) return res.status(400).json({ success: false, message: 'Choose a valid date and period (day, week, month or year)' });
    const employeeFilter = { status: 'active' };
    if (req.user.role === 'employee') employeeFilter._id = req.user.employeeId;
    if (req.user.role === 'supervisor') employeeFilter.supervisorId = req.user.id;
    const employees = await Employee.find(employeeFilter).select('fullName employeeCode teamId supervisorId');
    const items = await buildPerformanceRows(employees, bounds.start, bounds.end);
    res.json({ success: true, period, startDate: bounds.start.toISOString().slice(0, 10), endDate: new Date(bounds.end.getTime() - 86400000).toISOString().slice(0, 10), items });
  } catch (error) { next(error); }
});

router.get('/weekly', async (req, res, next) => {
  try {
    const weekDate = req.query.date || new Date().toISOString().slice(0, 10);
    const { start: weekStart, end: weekEnd } = periodBounds('week', weekDate);
    const employeeFilter = { status: 'active' };
    if (req.user.role === 'employee') employeeFilter._id = req.user.employeeId;
    if (req.user.role === 'supervisor') employeeFilter.supervisorId = req.user.id;
    const employees = await Employee.find(employeeFilter).select('fullName employeeCode teamId supervisorId');

    const items = await buildPerformanceRows(employees, weekStart, weekEnd);
    res.json({ success: true, weekStart: weekStart.toISOString().slice(0, 10), weekEnd: weekEnd.toISOString().slice(0, 10), items });
  } catch (error) { next(error); }
});

router.get('/employees/:id', async (req, res, next) => {
  try {
    if (req.user.role === 'employee' && String(req.user.employeeId) !== req.params.id) return res.status(403).json({ success: false, message: 'Permission denied' });
    if (req.user.role === 'supervisor' && !await canAccessEmployee(req, req.params.id)) return res.status(403).json({ success: false, message: 'Permission denied' });
    const records = await DailyRecord.find({ employeeId: req.params.id }).populate('employeeId', 'fullName employeeCode').sort({ workDate: -1 });
    const sales = await SalesRecord.find({ employeeId: req.params.id }).sort({ transactionDate: -1 });
    res.json({ success: true, records, sales });
  } catch (error) { next(error); }
});

export default router;
