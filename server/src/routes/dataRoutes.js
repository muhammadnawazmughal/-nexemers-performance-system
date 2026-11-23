import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { authenticate, requireRole } from '../middleware/auth.js';
import Employee from '../models/Employee.js';
import SalesRecord from '../models/SalesRecord.js';
import ImportJob from '../models/ImportJob.js';
import AuditLog from '../models/AuditLog.js';
import DailyRecord from '../models/DailyRecord.js';
import LocationBreakdown from '../models/LocationBreakdown.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /\.(xlsx|xls|csv)$/i.test(file.originalname)),
});
router.get('/templates/:type', authenticate, requireRole('super_admin'), (_req, res) => {
  const type = _req.params.type;
  const headers = type === 'sales'
    ? ['employeeCode', 'transactionDate', 'amount', 'saleCount', 'reference', 'notes']
    : ['employeeCode', 'workDate', 'totalIds', 'city', 'state', 'locationCount', 'notes'];
  res.setHeader('Content-Disposition', `attachment; filename="${type}-import-template.csv"`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(`${headers.join(',')}\n`);
});

router.post('/imports/daily-records', authenticate, requireRole('super_admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'An XLS/XLSX/CSV file is required' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    const required = ['employeeCode', 'workDate', 'totalIds', 'city', 'state', 'locationCount'];
    const previewErrors = rows.flatMap((row, index) => {
      const missing = required.filter((key) => row[key] === '' || row[key] == null);
      const errors = missing.map((field) => ({ row: index + 2, field, message: 'Required value is missing' }));
      if (row.totalIds !== '' && (!Number.isInteger(Number(row.totalIds)) || Number(row.totalIds) < 0)) errors.push({ row: index + 2, field: 'totalIds', message: 'Must be a non-negative whole number' });
      if (row.locationCount !== '' && (!Number.isInteger(Number(row.locationCount)) || Number(row.locationCount) < 0)) errors.push({ row: index + 2, field: 'locationCount', message: 'Must be a non-negative whole number' });
      if (row.workDate && Number.isNaN(new Date(row.workDate).getTime())) errors.push({ row: index + 2, field: 'workDate', message: 'Date is invalid' });
      if (row.city && !String(row.city).trim()) errors.push({ row: index + 2, field: 'city', message: 'City cannot be blank' });
      if (row.state && !String(row.state).trim()) errors.push({ row: index + 2, field: 'state', message: 'State cannot be blank' });
      return errors;
    });
    const employeeCodes = [...new Set(rows.map((row) => String(row.employeeCode || '').trim()).filter(Boolean))];
    const employees = await Employee.find({ employeeCode: { $in: employeeCodes } }).select('_id employeeCode');
    const employeeIds = new Set(employees.map((employee) => employee.employeeCode));
    rows.forEach((row, index) => {
      if (row.employeeCode && !employeeIds.has(String(row.employeeCode).trim())) previewErrors.push({ row: index + 2, field: 'employeeCode', message: 'Employee code was not found' });
    });
    const groups = new Map();
    rows.forEach((row, index) => {
      const date = new Date(row.workDate);
      if (Number.isNaN(date.getTime()) || !row.employeeCode) return;
      const key = `${String(row.employeeCode).trim()}|${date.toISOString().slice(0, 10)}`;
      if (!groups.has(key)) groups.set(key, { totalIds: Number(row.totalIds), locationTotal: 0, rows: [] });
      const group = groups.get(key);
      group.locationTotal += Number(row.locationCount);
      group.rows.push(index + 2);
      if (group.totalIds !== Number(row.totalIds)) previewErrors.push({ row: index + 2, field: 'totalIds', message: 'Rows for the same employee/date must use the same totalIds value' });
    });
    groups.forEach((group) => {
      if (group.locationTotal !== group.totalIds) group.rows.forEach((row) => previewErrors.push({ row, field: 'locationCount', message: 'Location counts for the employee/date must sum to totalIds' }));
    });
    const job = await ImportJob.create({
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      status: 'validating',
      counts: { total: rows.length, imported: 0, skipped: 0, failed: previewErrors.length },
      validationErrors: previewErrors,
      previewRows: rows,
    });
    await AuditLog.create({ actorId: req.user.id, action: 'import-preview', entityType: 'importJob', entityId: job.id, after: { fileName: req.file.originalname, total: rows.length }, ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, jobId: job.id, preview: rows.slice(0, 100), errors: previewErrors, counts: job.counts });
  } catch (error) { next(error); }
});

router.post('/imports/:jobId/commit', authenticate, requireRole('super_admin'), async (req, res, next) => {
  const createdIds = [];
  try {
    const job = await ImportJob.findById(req.params.jobId).select('+previewRows');
    if (!job) return res.status(404).json({ success: false, message: 'Import job not found' });
    if (job.status !== 'validating') return res.status(409).json({ success: false, message: 'This import job has already been processed' });
    if (job.validationErrors.length) return res.status(400).json({ success: false, message: 'Fix all preview errors before importing', errors: job.validationErrors });

    const rows = job.previewRows;
    const employeeCodes = [...new Set(rows.map((row) => String(row.employeeCode).trim()))];
    const employees = await Employee.find({ employeeCode: { $in: employeeCodes } }).populate('teamId', 'name').populate('supervisorId', 'name');
    const byCode = new Map(employees.map((employee) => [employee.employeeCode, employee]));
    const groups = new Map();
    rows.forEach((row) => {
      const employee = byCode.get(String(row.employeeCode).trim());
      const workDate = new Date(row.workDate);
      workDate.setUTCHours(0, 0, 0, 0);
      const key = `${employee.id}|${workDate.toISOString().slice(0, 10)}`;
      if (!groups.has(key)) groups.set(key, { employee, workDate, totalIds: Number(row.totalIds), notes: String(row.notes || ''), locations: [] });
      groups.get(key).locations.push({ city: String(row.city).trim(), state: String(row.state).trim(), count: Number(row.locationCount) });
    });

    let imported = 0;
    let skipped = 0;
    for (const group of groups.values()) {
      const exists = await DailyRecord.exists({ employeeId: group.employee.id, workDate: group.workDate });
      if (exists) { skipped += group.locations.length; continue; }
      const record = await DailyRecord.create({
        employeeId: group.employee.id,
        workDate: group.workDate,
        totalIds: group.totalIds,
        notes: group.notes,
        enteredBy: req.user.id,
        teamSnapshot: group.employee.teamId ? { id: group.employee.teamId.id, name: group.employee.teamId.name } : null,
        supervisorSnapshot: group.employee.supervisorId ? { id: group.employee.supervisorId.id, name: group.employee.supervisorId.name } : null,
      });
      createdIds.push(record.id);
      await LocationBreakdown.insertMany(group.locations.map((location) => ({ ...location, dailyRecordId: record.id })));
      imported += group.locations.length;
    }

    job.status = 'completed';
    job.counts = { total: rows.length, imported, skipped, failed: 0 };
    job.previewRows = [];
    job.completedAt = new Date();
    await job.save();
    await AuditLog.create({ actorId: req.user.id, action: 'import-commit', entityType: 'importJob', entityId: job.id, after: { counts: job.counts }, ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ success: true, jobId: job.id, counts: job.counts });
  } catch (error) {
    if (createdIds.length) {
      await LocationBreakdown.deleteMany({ dailyRecordId: { $in: createdIds } });
      await DailyRecord.deleteMany({ _id: { $in: createdIds } });
    }
    next(error);
  }
});

router.get('/exports/daily-records', authenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.fromDate || req.query.toDate) {
      filter.workDate = {};
      if (req.query.fromDate) filter.workDate.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) filter.workDate.$lte = new Date(`${req.query.toDate}T23:59:59.999Z`);
    }
    if (req.user.role === 'employee') filter.employeeId = req.user.employeeId;
    if (req.user.role === 'supervisor') filter['supervisorSnapshot.id'] = req.user.id;
    const records = await DailyRecord.find(filter).populate('employeeId', 'fullName employeeCode');
    const rows = records.map((r) => ({
      employeeCode: r.employeeId?.employeeCode || '',
      employeeName: r.employeeId?.fullName || '',
      workDate: r.workDate.toISOString().slice(0, 10),
      totalIds: r.totalIds,
      status: r.totalIds === 0 ? 'Submitted: 0' : 'Submitted',
      notes: r.notes,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Daily Records');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="daily-records.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) { next(error); }
});

router.get('/exports/sales', authenticate, async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'employee') filter = { employeeId: req.user.employeeId };
    if (req.user.role === 'supervisor') filter = { 'supervisorSnapshot.id': req.user.id };
    const records = await SalesRecord.find(filter).populate('employeeId', 'fullName employeeCode');
    const rows = records.map((r) => ({
      employeeCode: r.employeeId?.employeeCode || '',
      employeeName: r.employeeId?.fullName || '',
      transactionDate: r.transactionDate.toISOString().slice(0, 10),
      amount: r.amount,
      currency: r.currency,
      saleCount: r.saleCount,
      reference: r.reference,
      notes: r.notes,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sales');
    res.setHeader('Content-Disposition', 'attachment; filename="sales.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  } catch (error) { next(error); }
});

export default router;
