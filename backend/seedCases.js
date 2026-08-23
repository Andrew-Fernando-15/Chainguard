import mongoose from 'mongoose';
import Case from './src/models/Case.js';
import User from './src/models/User.js';
import 'dotenv/config';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard');
  
  const user = await User.findOne();
  if (!user) {
    console.log('No user found to assign cases to');
    process.exit(1);
  }

  const case1 = await Case.create({
    caseId: `CASE-2026-${Math.floor(Math.random() * 1000)}`,
    name: 'Operation Alpha',
    status: 'Active',
    currentInCharge: user._id
  });

  const case2 = await Case.create({
    caseId: `CASE-2026-${Math.floor(Math.random() * 1000)}`,
    name: 'Operation Beta',
    status: 'Pending'
  });

  user.allottedCases.push(case1._id);
  await user.save();

  console.log(`Cases seeded! Case ${case1.caseId} assigned to ${user.name}`);
  process.exit(0);
}

seed();
