import mongoose from 'mongoose';
import AccessLog from '../models/AccessLog.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard';

async function dedupe() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const logs = await AccessLog.find({}).sort({ createdAt: -1 });
  const seen = new Set();
  const toDelete = [];

  for (const log of logs) {
    const timeBucket = Math.floor(new Date(log.createdAt).getTime() / (5 * 60 * 1000));
    const key = [
      log.userId?.toString() || log.userName || '',
      log.action || '',
      log.caseId || '',
      log.details || '',
      (log.triggeredRules || []).join(','),
      timeBucket
    ].join(':');

    if (seen.has(key)) {
      toDelete.push(log._id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    const result = await AccessLog.deleteMany({ _id: { $in: toDelete } });
    console.log(`Deleted ${result.deletedCount} duplicate logs.`);
  } else {
    console.log('No duplicate logs found.');
  }

  await mongoose.disconnect();
}

dedupe().catch(err => {
  console.error('Deduplication failed:', err);
  process.exit(1);
});
