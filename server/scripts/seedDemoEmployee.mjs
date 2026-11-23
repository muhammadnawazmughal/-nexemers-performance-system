import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Employee from '../src/models/Employee.js';
import User from '../src/models/User.js';

dotenv.config();

const [,, emailInput, password] = process.argv;
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
if (!emailInput || !password) {
  console.error('Usage: npm run seed-demo-employee -- <email> <password>');
  process.exit(1);
}
if (password.length < 12) throw new Error('Use a password with at least 12 characters.');

const email = emailInput.trim().toLowerCase();
const username = email.split('@')[0];
const employeeCode = 'DEMO-001';

try {
  await mongoose.connect(process.env.MONGODB_URI);

  let employee = await Employee.findOne({ employeeCode });
  if (employee && (employee.email !== email || employee.username !== username)) {
    throw new Error(`${employeeCode} is already assigned to another employee.`);
  }
  if (!employee) {
    const conflictingEmployee = await Employee.findOne({ $or: [{ email }, { username }] });
    if (conflictingEmployee) throw new Error('The requested demo email or username is already assigned.');
    employee = await Employee.create({
      employeeCode,
      fullName: 'Demo Employee',
      username,
      email,
      joiningDate: new Date(),
      status: 'active',
    });
  }

  let user = await User.findOne({ $or: [{ email }, { username }] });
  if (user && (user.role !== 'employee' || String(user.employeeId) !== String(employee.id))) {
    throw new Error('The requested email or username belongs to a different account.');
  }
  if (!user) {
    user = new User({
      name: employee.fullName,
      email,
      username,
      role: 'employee',
      employeeId: employee.id,
    });
  }
  user.passwordHash = await bcrypt.hash(password, 12);
  user.isActive = true;
  user.refreshTokenHash = undefined;
  await user.save();

  console.log(`Read-only demo employee account is ready: ${email}`);
} finally {
  await mongoose.disconnect();
}
