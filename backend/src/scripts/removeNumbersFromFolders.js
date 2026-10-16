import mongoose from 'mongoose';
import Case from '../models/Case.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard';

async function renameFolders() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const res = await Case.updateOne(
    { caseId: 'CASE-10239' },
    { $set: { folders: ['Crime_Scene', 'Forensic_Reports', 'Statements'] } }
  );

  console.log('Update result for CASE-10239 folders:', res);
  await mongoose.disconnect();
}

renameFolders().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
