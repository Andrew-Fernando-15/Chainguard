import mongoose from 'mongoose';
import Case from '../models/Case.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard';

async function updateShowcase() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const res = await Case.updateOne(
    { caseId: 'CASE-10239' },
    { $set: { folders: ['01_Crime_Scene', '02_Forensic_Reports', '03_Statements'] } }
  );

  console.log('Update result for CASE-10239:', res);
  await mongoose.disconnect();
}

updateShowcase().catch(err => {
  console.error('Failed to update showcase case:', err);
  process.exit(1);
});
