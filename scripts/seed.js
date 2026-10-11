require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config/env');
const User = require('../src/models/User');
const PasswordHasher = require('../src/utils/passwordHasher');
const { ROLES } = require('../src/constants');

const DEMO_PASSWORD = 'Password@123';

const run = async () => {
  await mongoose.connect(config.mongoUri);
  const hasher = new PasswordHasher(config.bcryptSaltRounds);

  const upsertUser = async (details) => {
    const existing = await User.findOne({ email: details.email });
    if (existing) {
      return existing;
    }
    return User.create({ ...details, password: await hasher.hash(details.password) });
  };

  const admin = await upsertUser({
    name: process.env.SEED_ADMIN_NAME || 'System Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@crm.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    role: ROLES.ADMIN,
  });

  const manager = await upsertUser({
    name: 'Maya Manager',
    email: 'manager@crm.local',
    password: DEMO_PASSWORD,
    role: ROLES.SALES_MANAGER,
  });

  await upsertUser({
    name: 'Eli Executive',
    email: 'executive1@crm.local',
    password: DEMO_PASSWORD,
    role: ROLES.SALES_EXECUTIVE,
    manager: manager._id,
  });

  await upsertUser({
    name: 'Esha Executive',
    email: 'executive2@crm.local',
    password: DEMO_PASSWORD,
    role: ROLES.SALES_EXECUTIVE,
    manager: manager._id,
  });

  console.log(`Seed complete. Admin login: ${admin.email}`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
