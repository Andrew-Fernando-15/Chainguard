import mongoose from 'mongoose';
import Evidence from '../models/Evidence.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard';

async function clearAllUploads() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  // 1. Delete all records from the Evidence collection
  const countBefore = await Evidence.countDocuments({});
  console.log(`Found ${countBefore} total evidence documents.`);

  const res = await Evidence.deleteMany({});
  console.log(`Deleted all evidence records:`, res);

  // Clear upload-related access logs
  try {
    const AccessLog = (await import('../models/AccessLog.js')).default;
    const logRes = await AccessLog.deleteMany({ action: 'UPLOAD' });
    console.log(`Cleared upload access logs:`, logRes);
  } catch (logErr) {
    console.log('Access log clear skipped:', logErr.message);
  }

  // 2. Clear physical files in uploads directory
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      let removedFiles = 0;
      for (const file of files) {
        if (file !== '.gitkeep' && file !== '.gitignore' && file !== 'temp') {
          const filePath = path.join(uploadDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            removedFiles++;
          }
        }
      }
      console.log(`Deleted ${removedFiles} physical files from uploads/`);
    }

    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (fs.existsSync(tempDir)) {
      const tempFiles = fs.readdirSync(tempDir);
      for (const tf of tempFiles) {
        if (tf !== '.gitkeep') {
          try { fs.unlinkSync(path.join(tempDir, tf)); } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.error('Error clearing uploads folder:', err.message);
  }

  await mongoose.disconnect();
  console.log('Done! All uploads are completely cleared.');
}

clearAllUploads().catch(err => {
  console.error('Failed to clear uploads:', err);
  process.exit(1);
});
