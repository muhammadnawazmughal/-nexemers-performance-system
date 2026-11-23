import DailyRecord from '../models/DailyRecord.js';
import SalesRecord from '../models/SalesRecord.js';
import Employee from '../models/Employee.js';
import TargetSetting from '../models/TargetSetting.js';
import WorkSchedule from '../models/WorkSchedule.js';

export function startOfWeek(date) {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d;
}

export async function getEffectiveTargets(employeeId, date) {
  const employee = await Employee.findById(employeeId);
  let target = await TargetSetting.findOne({
    employeeId,
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
  }).sort({ effectiveFrom: -1 });
  if (!target && employee?.teamId) {
    target = await TargetSetting.findOne({
      teamId: employee.teamId,
      effectiveFrom: { $lte: date },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
    }).sort({ effectiveFrom: -1 });
  }
  return {
    idDailyTarget: target?.idDailyTarget || 0,
    salesDailyTarget: target?.salesDailyTarget || 0,
  };
}

export async function scheduledWorkingDay(employeeId, date) {
  const employee = await Employee.findById(employeeId);
  if (!employee || (employee.status === 'inactive' && employee.inactiveFrom && date >= employee.inactiveFrom)) return 'Inactive';
  const schedule = await WorkSchedule.findOne({
    employeeId,
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
  }).sort({ effectiveFrom: -1 });
  if (!schedule) return 'Working';
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getUTCDay()];
  return schedule.weekdaySchedule.get(weekday) === false ? 'Off Day' : 'Working';
}

export async function buildPerformanceRows(employees, start, end) {
  const employeeIds = employees.map((employee) => employee._id);
  const [idTotals, salesTotals] = await Promise.all([
    DailyRecord.aggregate([
      { $match: { employeeId: { $in: employeeIds }, workDate: { $gte: start, $lt: end } } },
      { $group: { _id: '$employeeId', actualIds: { $sum: '$totalIds' } } },
    ]),
    SalesRecord.aggregate([
      { $match: { employeeId: { $in: employeeIds }, transactionDate: { $gte: start, $lt: end } } },
      { $group: { _id: '$employeeId', actualSales: { $sum: '$amount' } } },
    ]),
  ]);
  const idsByEmployee = new Map(idTotals.map((row) => [String(row._id), row.actualIds]));
  const salesByEmployee = new Map(salesTotals.map((row) => [String(row._id), row.actualSales]));
  const days = Math.ceil((end - start) / 86400000);

  return Promise.all(employees.map(async (employee) => {
    const targetQuery = {
      $and: [
        { $or: [{ employeeId: employee._id }, ...(employee.teamId ? [{ teamId: employee.teamId }] : [])] },
        { effectiveFrom: { $lt: end } },
        { $or: [{ effectiveTo: null }, { effectiveTo: { $gte: start } }] },
      ],
    };
    const [targets, schedules] = await Promise.all([
      TargetSetting.find(targetQuery).sort({ effectiveFrom: -1 }).lean(),
      WorkSchedule.find({
        employeeId: employee._id,
        effectiveFrom: { $lt: end },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: start } }],
      }).sort({ effectiveFrom: -1 }).lean(),
    ]);
    let workingDays = 0;
    let idTarget = 0;
    let salesTarget = 0;
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(start.getTime() + offset * 86400000);
      if (employee.status === 'inactive' && employee.inactiveFrom && date >= employee.inactiveFrom) continue;
      const schedule = schedules.find((item) => item.effectiveFrom <= date && (!item.effectiveTo || item.effectiveTo >= date));
      const weekday = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getUTCDay()];
      if (schedule?.weekdaySchedule?.get?.(weekday) === false || schedule?.weekdaySchedule?.[weekday] === false) continue;
      workingDays += 1;
      const activeTargets = targets.filter((item) => item.effectiveFrom <= date && (!item.effectiveTo || item.effectiveTo >= date));
      const target = activeTargets.find((item) => String(item.employeeId) === String(employee._id))
        || activeTargets.find((item) => employee.teamId && String(item.teamId) === String(employee.teamId));
      idTarget += target?.idDailyTarget || 0;
      salesTarget += target?.salesDailyTarget || 0;
    }
    const actualIds = idsByEmployee.get(String(employee._id)) || 0;
    const actualSales = salesByEmployee.get(String(employee._id)) || 0;
    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      workingDays,
      actualIds,
      idTarget,
      idAchievement: idTarget ? Math.round((actualIds / idTarget) * 10000) / 100 : null,
      actualSales,
      salesTarget,
      salesAchievement: salesTarget ? Math.round((actualSales / salesTarget) * 10000) / 100 : null,
    };
  }));
}
