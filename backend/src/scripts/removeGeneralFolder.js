import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getContract } from '../services/blockchain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard';

async function removeGeneralFolder() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  const Evidence = mongoose.model('Evidence', new mongoose.Schema({}, { strict: false }));
  const Case = mongoose.model('Case', new mongoose.Schema({}, { strict: false }));

  // 1. Find all evidence items in folder 'General'
  const generalEvidence = await Evidence.find({ folder: 'General' }).lean();
  console.log(`Found ${generalEvidence.length} evidence records in folder "General".`);

  // 2. Connect to blockchain to log official custody removal events
  let contract = null;
  try {
    contract = await getContract();
    if (contract) {
      console.log('✅ Connected to blockchain contract at:', await contract.getAddress());
    } else {
      console.log('⚠️ Blockchain contract not reachable, skipping on-chain custody log.');
    }
  } catch (err) {
    console.warn('⚠️ Could not connect to blockchain contract:', err.message);
  }

  for (const item of generalEvidence) {
    console.log(`\nProcessing Evidence [${item._id}] - "${item.fileName}" (Case: ${item.caseId})`);

    // On-chain custody record
    if (contract && item.blockchainEvidenceId) {
      try {
        console.log(`  Writing custody removal event on-chain for evidenceId #${item.blockchainEvidenceId}...`);
        const tx = await contract.logCustodyEvent(
          item.blockchainEvidenceId,
          `DEPRECATED: Evidence deleted - General folder removed from case ${item.caseId}`
        );
        const receipt = await tx.wait();
        console.log(`  ✅ On-chain custody event mined! TxHash: ${receipt.hash}`);
      } catch (chainErr) {
        console.error(`  ❌ Failed to log custody on-chain for #${item.blockchainEvidenceId}:`, chainErr.message);
      }
    }

    // Delete physical file if present
    if (item.filePath && fs.existsSync(item.filePath)) {
      try {
        fs.unlinkSync(item.filePath);
        console.log(`  🗑️ Deleted physical file: ${item.filePath}`);
      } catch (fileErr) {
        console.warn(`  Could not delete file ${item.filePath}:`, fileErr.message);
      }
    }
  }

  // 3. Delete evidence from MongoDB
  const deleteResult = await Evidence.deleteMany({ folder: 'General' });
  console.log(`\n✅ Deleted ${deleteResult.deletedCount} Evidence records from MongoDB.`);

  // 4. Clean up any Cases that have 'General' in their folders array
  const casesWithGeneral = await Case.find({ folders: 'General' });
  console.log(`Found ${casesWithGeneral.length} cases with "General" in their folders array.`);
  for (const c of casesWithGeneral) {
    c.folders = (c.folders || []).filter((f) => f !== 'General');
    await c.save();
    console.log(`  Removed "General" from case ${c.caseId}`);
  }

  // Also remove from any case directories if existing
  const demoEvidenceDir = path.join(__dirname, '..', '..', 'Demo_Evidence');
  if (fs.existsSync(demoEvidenceDir)) {
    const caseDirs = fs.readdirSync(demoEvidenceDir);
    for (const cDir of caseDirs) {
      const genPath = path.join(demoEvidenceDir, cDir, 'General');
      if (fs.existsSync(genPath)) {
        try {
          fs.rmSync(genPath, { recursive: true, force: true });
          console.log(`  🗑️ Deleted folder directory: ${genPath}`);
        } catch (e) {
          console.warn(`  Could not remove directory ${genPath}:`, e.message);
        }
      }
    }
  }

  console.log('\n🎉 SUCCESS: All "General" folders and their files have been removed, with official audit logs committed on the blockchain.');
  process.exit(0);
}

removeGeneralFolder().catch((err) => {
  console.error('Fatal error in removeGeneralFolder:', err);
  process.exit(1);
});
