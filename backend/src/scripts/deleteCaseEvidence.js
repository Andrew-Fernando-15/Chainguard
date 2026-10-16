import mongoose from 'mongoose';
import Evidence from '../models/Evidence.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard';

async function undo() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  // Find all evidence in CASE-10239
  const evidences = await Evidence.find({ caseId: 'CASE-10239' });
  console.log('Found', evidences.length, 'evidence items in CASE-10239');

  // Delete all evidence in CASE-10239 created during testing
  const res = await Evidence.deleteMany({ caseId: 'CASE-10239' });
  console.log('Deleted evidence items result:', res);

  await mongoose.disconnect();
}

undo().catch(err => {
  console.error('Failed to delete evidence:', err);
  process.exit(1);
});
