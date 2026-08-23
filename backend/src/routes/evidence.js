import express from 'express';
import Evidence from '../models/Evidence.js';
import { verifyToken } from '../middleware/auth.js';
import { addEvidenceOnChain } from '../services/blockchain.js';

const router = express.Router();

// All evidence routes require a logged-in user
router.use(verifyToken);

// POST /api/evidence/upload
// NOTE: the frontend already computes the SHA-256 hash client-side
// (see src/utils/hash.js -> sha256File). This endpoint just receives
// { caseId, fileName, fileHash } and saves the record.
router.post('/upload', async (req, res) => {
  try {
    const { caseId, fileName, fileHash } = req.body;
    if (!caseId || !fileName || !fileHash) {
      return res.status(400).json({ error: 'caseId, fileName, and fileHash are required' });
    }

    const evidence = await Evidence.create({
      caseId,
      fileName,
      fileHash,
      uploadedBy: req.user.id,
    });

    // Try to commit the hash to the blockchain too. If the contract hasn't
    // been deployed yet (Step 4 not done), this returns null and we just
    // skip it — evidence is still safely saved in MongoDB either way.
    let chainInfo = null;
    try {
      chainInfo = await addEvidenceOnChain(caseId, fileHash);
      if (chainInfo) {
        evidence.blockchainTxId = chainInfo.txHash;
        evidence.status = 'verified';
        await evidence.save();
      }
    } catch (chainErr) {
      console.error('Blockchain commit failed (evidence still saved in DB):', chainErr.message);
    }

    res.status(201).json({ message: 'Evidence recorded', evidence, chainInfo });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// GET /api/evidence  -> list all evidence (for the Dashboard page)
router.get('/', async (req, res) => {
  try {
    const items = await Evidence.find().populate('uploadedBy', 'name role').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evidence', details: err.message });
  }
});

// GET /api/evidence/:id  -> single record (for BlockchainVerification page)
router.get('/:id', async (req, res) => {
  try {
    const item = await Evidence.findById(req.params.id).populate('uploadedBy', 'name role');
    if (!item) return res.status(404).json({ error: 'Evidence not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evidence', details: err.message });
  }
});

export default router;
