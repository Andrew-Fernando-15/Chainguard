import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import Evidence from '../models/Evidence.js';
import User from '../models/User.js';
import { verifyToken, checkCaseAllotment } from '../middleware/auth.js';
import { addEvidenceOnChain, verifyEvidenceOnChain, getEvidenceInfoOnChain } from '../services/blockchain.js';
import { getEncryptStream, getDecryptStream } from '../utils/crypto.js';
import { logAndAnalyze } from '../services/aiEngine.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

router.use(verifyToken);

router.post('/upload', upload.single('file'), checkCaseAllotment, async (req, res) => {
  try {
    const { caseId, category, fileName, fileHash } = req.body;
    if (!caseId || !category || !fileName || !fileHash || !req.file) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'caseId, category, fileName, fileHash, and file are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.position === 'Forensic') {
      const forensicCats = [
        'Blood Sample', 'DNA Report', 'Fingerprint', 'Autopsy Report',
        'Toxicology Report', 'Ballistics Report', 'Medical Report'
      ];
      if (!forensicCats.includes(category)) {
        if (req.file) fs.unlinkSync(req.file.path);
        await logAndAnalyze(user._id, 'failed_access', { caseId, reason: 'Rule 9: Category not allowed for Position+Role' });
        return res.status(403).json({ error: 'Forensic users can only upload forensic category evidence' });
      }
    }

    const ivHex = crypto.randomBytes(16).toString('hex');
    const finalFilePath = path.join('uploads', `${Date.now()}_${ivHex}.enc`);
    const tempPath = req.file.path;

    const readStream = fs.createReadStream(tempPath);
    const encryptStream = getEncryptStream(ivHex);
    const writeStream = fs.createWriteStream(finalFilePath);

    readStream.pipe(encryptStream).pipe(writeStream);

    writeStream.on('finish', async () => {
      fs.unlinkSync(tempPath);

      try {
        const evidence = await Evidence.create({
          caseId,
          category,
          fileName,
          fileHash,
          uploadedBy: req.user.id,
          filePath: finalFilePath,
          fileSize: req.file.size,
          iv: ivHex
        });

        await logAndAnalyze(req.user.id, 'upload', {
          caseId,
          evidenceId: evidence._id,
          fileName,
          fileHash,
          fileSize: req.file.size
        });

        let chainInfo = null;
        try {
          chainInfo = await addEvidenceOnChain(caseId, fileHash);
          if (chainInfo) {
            evidence.blockchainTxId = chainInfo.txHash;
            evidence.blockchainEvidenceId = chainInfo.evidenceId;
            evidence.status = 'verified';
            await evidence.save();
          }
        } catch (chainErr) {
          console.error('Blockchain commit failed:', chainErr.message);
        }

        res.status(201).json({ message: 'Evidence recorded and encrypted', evidence, chainInfo });
      } catch (dbErr) {
        res.status(500).json({ error: 'Database save failed', details: dbErr.message });
      }
    });

    writeStream.on('error', (err) => {
      res.status(500).json({ error: 'File encryption failed', details: err.message });
    });

  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    let query = {};
    if (user.position !== 'CBI') {
      const allottedCaseIds = user.allottedCases.map(id => id.toString());
      query = { caseId: { $in: allottedCaseIds } };
    }

    const items = await Evidence.find(query).populate('uploadedBy', 'name role position').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evidence', details: err.message });
  }
});

// GET /api/evidence/:id  -> single record (for BlockchainVerification page)
router.get('/:id', async (req, res) => {
  try {
    const item = await Evidence.findById(req.params.id).populate('uploadedBy', 'name role position');
    if (!item) return res.status(404).json({ error: 'Evidence not found' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.position !== 'CBI') {
      const isAllotted = user.allottedCases.some(id => id.toString() === item.caseId.toString());
      if (!isAllotted) {
        return res.status(403).json({ error: 'You are not allowed to access any data in this case' });
      }
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evidence', details: err.message });
  }
});

// GET /api/evidence/download/:id
router.get('/download/:id', async (req, res) => {
  try {
    const item = await Evidence.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Evidence not found' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.position !== 'CBI') {
      const isAllotted = user.allottedCases.some(id => id.toString() === item.caseId.toString());
      if (!isAllotted) {
        await logAndAnalyze(user._id, 'failed_access', { caseId: item.caseId, evidenceId: item._id, reason: 'Rule 5: Access to non-allotted case' });
        return res.status(403).json({ error: 'You are not allowed to access any data in this case' });
      }
    }

    if (user.position === 'Forensic') {
      await logAndAnalyze(user._id, 'failed_access', { caseId: item.caseId, evidenceId: item._id, reason: 'Rule 9: Forensic users cannot download' });
      return res.status(403).json({ error: 'Forensic users are restricted to View only. Downloading is forbidden.' });
    }

    if (!fs.existsSync(item.filePath)) {
      return res.status(404).json({ error: 'Physical file not found on server' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${item.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    await logAndAnalyze(user._id, 'download', { caseId: item.caseId, evidenceId: item._id });

    const readStream = fs.createReadStream(item.filePath);
    const decryptStream = getDecryptStream(item.iv);

    readStream.pipe(decryptStream).pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download evidence', details: err.message });
  }
});

// GET /api/evidence/view/:id
router.get('/view/:id', async (req, res) => {
  try {
    const item = await Evidence.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Evidence not found' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.position !== 'CBI') {
      const isAllotted = user.allottedCases.some(id => id.toString() === item.caseId.toString());
      if (!isAllotted) {
        await logAndAnalyze(user._id, 'failed_access', { caseId: item.caseId, evidenceId: item._id, reason: 'Rule 5: Access to non-allotted case' });
        return res.status(403).json({ error: 'You are not allowed to access any data in this case' });
      }
    }

    if (!fs.existsSync(item.filePath)) {
      return res.status(404).json({ error: 'Physical file not found on server' });
    }

    // Use inline instead of attachment
    res.setHeader('Content-Disposition', `inline; filename="${item.fileName}"`);
    // Ideally we would sniff the exact mimetype, but octet-stream/pdf/jpeg works.
    // Let's rely on browser inference or set it generically.
    let mimeType = 'application/octet-stream';
    if (item.fileName.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
    if (item.fileName.toLowerCase().endsWith('.png')) mimeType = 'image/png';
    if (item.fileName.toLowerCase().endsWith('.jpg') || item.fileName.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
    if (item.fileName.toLowerCase().endsWith('.txt')) mimeType = 'text/plain';

    res.setHeader('Content-Type', mimeType);

    await logAndAnalyze(user._id, 'view', { caseId: item.caseId, evidenceId: item._id });

    const readStream = fs.createReadStream(item.filePath);
    const decryptStream = getDecryptStream(item.iv);

    readStream.pipe(decryptStream).pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to view evidence', details: err.message });
  }
});

// POST /api/evidence/verify
router.post('/verify', async (req, res) => {
  try {
    const { evidenceDbId, currentHash } = req.body;
    if (!evidenceDbId) {
      return res.status(400).json({ error: 'evidenceDbId is required' });
    }

    const evidence = await Evidence.findById(evidenceDbId);
    if (!evidence) return res.status(404).json({ error: 'Evidence record not found in database' });

    if (evidence.blockchainEvidenceId === undefined || evidence.blockchainEvidenceId === null) {
      return res.status(400).json({ error: 'This evidence was not recorded on the blockchain.' });
    }

    const hashToCheck = currentHash || evidence.fileHash;
    const match = await verifyEvidenceOnChain(evidence.blockchainEvidenceId, hashToCheck);
    const info = await getEvidenceInfoOnChain(evidence.blockchainEvidenceId);
    
    // Read contract address directly from JSON if needed, or just rely on the UI
    let contractAddr = 'See deployed-contract.json';
    try {
      const deployInfo = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'deployed-contract.json'), 'utf8'));
      contractAddr = deployInfo.address;
    } catch(e) {}

    res.json({
      match,
      originalHash: info ? info[1] : evidence.fileHash,
      currentHash: hashToCheck,
      txHash: evidence.blockchainTxId,
      timestamp: info ? new Date(Number(info[3]) * 1000).toLocaleString() : 'N/A',
      contract: contractAddr,
    });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed', details: err.message });
  }
});

export default router;
