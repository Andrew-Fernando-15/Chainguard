/**
 * seed.js — Create demo users, sample cases, and allot cases by Name.
 *
 * Run with:  node src/scripts/seed.js
 *
 * This script is idempotent — it checks for existing records before inserting.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import User from '../models/User.js';
import Case from '../models/Case.js';
import Evidence from '../models/Evidence.js';
import AccessLog from '../models/AccessLog.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard';

const DEMO_USERS = [
  {
    name: "Rahul Sharma",
    email: "rahul@chainguard.in",
    password: "Rahul@123",
    position: "Police",
    role: "Investigating Officer"
  },
  {
    name: "Priya Nair",
    email: "priya@chainguard.in",
    password: "Priya@123",
    position: "Police",
    role: "Normal Officer"
  },
  {
    name: "Aisha Khan",
    email: "aisha@chainguard.in",
    password: "Aisha@123",
    position: "Forensic",
    role: "Forensic Expert"
  },
  {
    name: "Suresh Verma",
    email: "verma@chainguard.in",
    password: "Suresh@123",
    position: "Judge",
    role: "Judge"
  },
  {
    name: "Vikram Singh",
    email: "cbi@chainguard.in",
    password: "Vikram@123",
    position: "CBI",
    role: "CBI Officer"
  }
];

// Seed cases with allottedTo array containing the names
const DEMO_CASES = [
  // 3 Cases for Rahul
  { 
    caseId: 'CASE-2026-001', 
    name: 'MG Road Robbery', 
    status: 'Active',
    allottedTo: ['Rahul Sharma']
  },
  { 
    caseId: 'CASE-2026-002', 
    name: 'Cyber Fraud Investigation', 
    status: 'Active',
    allottedTo: ['Rahul Sharma']
  },
  { 
    caseId: 'CASE-2026-003', 
    name: 'Narcotics Seizure', 
    status: 'Closed',
    allottedTo: ['Rahul Sharma']
  },
  // 3 Cases for Priya
  { 
    caseId: 'CASE-2026-004', 
    name: 'Downtown Hit and Run', 
    status: 'Active',
    allottedTo: ['Priya Nair']
  },
  { 
    caseId: 'CASE-2026-005', 
    name: 'Corporate Embezzlement', 
    status: 'Pending',
    allottedTo: ['Priya Nair']
  },
  { 
    caseId: 'CASE-2026-006', 
    name: 'Illegal Arms Trade', 
    status: 'Active',
    allottedTo: ['Priya Nair']
  },
  // 1 Case for Aisha
  { 
    caseId: 'CASE-2026-007', 
    name: 'Forensic Ballistics Trace', 
    status: 'Active',
    allottedTo: ['Aisha Khan']
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  console.log('🧹 Wiping existing data...');
  await User.deleteMany({});
  await Case.deleteMany({});
  await Evidence.deleteMany({});
  await AccessLog.deleteMany({});
  console.log('✅ Database collections wiped.');

  // Empty the uploads directory
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const files = await fs.readdir(uploadDir);
    let deletedCount = 0;
    for (const file of files) {
      if (file !== '.gitkeep' && file !== '.gitignore') {
        await fs.unlink(path.join(uploadDir, file));
        deletedCount++;
      }
    }
    console.log(`✅ Deleted ${deletedCount} files from uploads directory.`);
  } catch (err) {
    console.log('⚠️ Could not clear uploads folder:', err.message);
  }

  // --- Users ---
  for (const u of DEMO_USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, password: hashed });
    console.log(`  ✅ Created user: ${u.name} (${u.position})`);
  }

  // --- Cases ---
  for (const c of DEMO_CASES) {
    await Case.create(c);
    console.log(`  ✅ Created case: ${c.caseId} — ${c.name}`);
  }

  console.log('\n🎉 Seed complete! Demo credentials:');
  console.log('─────────────────────────────────────────');
  for (const u of DEMO_USERS) {
    console.log(`  ${u.position.padEnd(10)} | ${u.name.padEnd(22)} | ${u.email} | ${u.password}`);
  }
  console.log('─────────────────────────────────────────');
  console.log('\nSample cases and allotments:');
  for (const c of DEMO_CASES) {
    console.log(`  ${c.caseId} | ${c.name} (${c.status})`);
    console.log(`      Allotted To: ${c.allottedTo.join(', ')}`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
