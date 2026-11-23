import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Team from '../src/models/Team.js';
import CompanySetting from '../src/models/CompanySetting.js';

dotenv.config();

const [,, email, password] = process.argv;
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
if (!email || !password) {
  console.error('Usage: npm run seed-admin -- <email> <password>');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const normalizedEmail = email.trim().toLowerCase();
if (password.length < 12) {
  await mongoose.disconnect();
  throw new Error('Use a password with at least 12 characters.');
}
const existing = await User.findOne({ email: normalizedEmail });
if (existing) {
  existing.passwordHash = await bcrypt.hash(password, 12);
  existing.isActive = true;
  await existing.save();
  existing.refreshTokenHash = undefined;
  await existing.save();
  console.log(`Existing demo account password reset: ${email}`);
} else {
  await User.create({
    name: 'Nexemers Demo Super Admin',
    email: normalizedEmail,
    username: normalizedEmail.split('@')[0],
    passwordHash: await bcrypt.hash(password, 12),
    role: 'super_admin',
    isActive: true,
  });
  console.log(`Demo super admin created: ${email}`);
}

await Team.findOneAndUpdate({ code: 'TEAM-A' }, { name: 'Team A', code: 'TEAM-A', description: 'Demo team A', isActive: true }, { upsert: true, returnDocument: 'after' });
await Team.findOneAndUpdate({ code: 'TEAM-B' }, { name: 'Team B', code: 'TEAM-B', description: 'Demo team B', isActive: true }, { upsert: true, returnDocument: 'after' });
await CompanySetting.findOneAndUpdate({ key: 'company' }, {
  key: 'company',
  companyName: 'Nexemers International',
  timezone: 'Asia/Karachi',
  currency: 'PKR',
  defaultIdDailyTarget: 5,
  defaultSalesDailyTarget: 0,
}, { upsert: true, returnDocument: 'after' });
console.log('Demo-safe company settings and Team A/Team B created.');
await mongoose.disconnect();
