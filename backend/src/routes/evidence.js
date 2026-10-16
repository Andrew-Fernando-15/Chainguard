import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import Evidence from '../models/Evidence.js';
import User from '../models/User.js';
import Case from '../models/Case.js';
import { verifyToken, checkCaseAllotment } from '../middleware/auth.js';
import { addEvidenceOnChain, verifyEvidenceOnChain, getEvidenceInfoOnChain, logCustodyOnChain } from '../services/blockchain.js';
import { getEncryptStream, getDecryptStream } from '../utils/crypto.js';
import { logActivity } from '../services/aiAnomalyEngine.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

router.use(verifyToken);

// Encrypt a single file and save it to uploads/
function encryptFileAsync(tempPath) {
  return new Promise((resolve, reject) => {
    const ivHex = crypto.randomBytes(16).toString('hex');
    const finalFilePath = path.join('uploads', `${Date.now()}_${ivHex}.enc`);
    const readStream = fs.createReadStream(tempPath);
    const encryptStream = getEncryptStream(ivHex);
    const writeStream = fs.createWriteStream(finalFilePath);

    readStream.pipe(encryptStream).pipe(writeStream);

    writeStream.on('finish', () => {
      try {
        fs.unlinkSync(tempPath);
      } catch (err) {}
      resolve({ finalFilePath, ivHex });
    });

    writeStream.on('error', (err) => {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {}
      reject(err);
    });
  });
}

router.post('/upload', upload.any(), checkCaseAllotment, async (req, res) => {
  const uploadedFiles = req.files || [];
  try {
    const { caseId, category, title, description, collectedDate, folder = 'Root' } = req.body;
    
    // Normalize files: can be multiple in req.files (e.g. from multiple upload mode)
    if (!caseId || !category || uploadedFiles.length === 0) {
      uploadedFiles.forEach(f => {
        try { fs.unlinkSync(f.path); } catch (e) {}
      });
      return res.status(400).json({ error: 'caseId, category, and at least one file are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      uploadedFiles.forEach(f => {
        try { fs.unlinkSync(f.path); } catch (e) {}
      });
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.position === 'Forensic') {
      const forensicCats = [
        'Blood Sample', 'DNA Report', 'Fingerprint', 'Autopsy Report',
        'Toxicology Report', 'Ballistics Report', 'Medical Report'
      ];
      if (!forensicCats.includes(category)) {
        uploadedFiles.forEach(f => {
          try { fs.unlinkSync(f.path); } catch (e) {}
        });
        await logActivity({ user, action: 'ACCESS_DENIED', caseId, details: 'Rule 9: Category not allowed for Position+Role', req });
        return res.status(403).json({ error: 'Forensic users can only upload forensic category evidence' });
      }
    }

    // Parse hashes and names if passed as arrays or JSON or single strings
    let fileHashes = [];
    if (Array.isArray(req.body.fileHash)) {
      fileHashes = req.body.fileHash;
    } else if (req.body.fileHashes) {
      try {
        fileHashes = JSON.parse(req.body.fileHashes);
      } catch {
        fileHashes = [req.body.fileHashes];
      }
    } else if (req.body.fileHash) {
      fileHashes = [req.body.fileHash];
    }

    let fileNames = [];
    if (Array.isArray(req.body.fileName)) {
      fileNames = req.body.fileName;
    } else if (req.body.fileNames) {
      try {
        fileNames = JSON.parse(req.body.fileNames);
      } catch {
        fileNames = [req.body.fileNames];
      }
    } else if (req.body.fileName) {
      fileNames = [req.body.fileName];
    }

    // Also ensure case folder list contains this folder if it's not 'Root'
    const targetFolder = (folder || 'Root').trim();
    if (targetFolder && targetFolder.toLowerCase() !== 'root') {
      try {
        const caseDoc = await Case.findOne({ caseId });
        if (caseDoc) {
          if (!caseDoc.folders) caseDoc.folders = [];
          if (!caseDoc.folders.includes(targetFolder)) {
            caseDoc.folders.push(targetFolder);
            await caseDoc.save();
          }
        }
      } catch (err) {
        console.error('Failed to update case folders:', err.message);
      }
    }

    const createdEvidences = [];
    const chainInfos = [];

    // Process each uploaded file
    for (let i = 0; i < uploadedFiles.length; i++) {
      const currentFile = uploadedFiles[i];
      const curFileName = fileNames[i] || currentFile.originalname || currentFile.filename;
      
      // If client didn't supply hash for each file, compute sha256 server-side as fallback
      let curFileHash = fileHashes[i];
      if (!curFileHash) {
        const fileBuffer = fs.readFileSync(currentFile.path);
        curFileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      }

      // Encrypt file
      const { finalFilePath, ivHex } = await encryptFileAsync(currentFile.path);

      // Create Evidence record
      const curTitle = uploadedFiles.length > 1 && title
        ? `${title} (${i + 1})`
        : (title || curFileName.split('.').slice(0, -1).join('.') || curFileName);

      const evidence = await Evidence.create({
        caseId,
        folder: targetFolder || 'Root',
        category,
        title: curTitle,
        description,
        collectedDate,
        fileName: curFileName,
        fileHash: curFileHash,
        uploadedBy: req.user.id,
        filePath: finalFilePath,
        fileSize: currentFile.size,
        iv: ivHex
      });

      await logActivity({
        user,
        action: 'UPLOAD',
        caseId,
        evidenceId: evidence._id,
        fileName: curFileName,
        fileHash: curFileHash,
        fileSize: currentFile.size,
        req
      });

      let chainInfo = null;
      try {
        chainInfo = await addEvidenceOnChain(caseId, curFileHash);
        if (chainInfo) {
          evidence.blockchainTxId = chainInfo.txHash;
          evidence.blockchainEvidenceId = chainInfo.evidenceId;
          evidence.status = 'verified';
          await evidence.save();
        }
      } catch (chainErr) {
        console.error('Blockchain commit failed for file:', curFileName, chainErr.message);
      }

      createdEvidences.push(evidence);
      chainInfos.push(chainInfo);
    }

    if (createdEvidences.length === 1) {
      return res.status(201).json({
        message: 'Evidence recorded and encrypted',
        evidence: createdEvidences[0],
        evidences: createdEvidences,
        chainInfo: chainInfos[0],
        chainInfos
      });
    }

    res.status(201).json({
      message: `${createdEvidences.length} evidence files recorded and encrypted`,
      evidence: createdEvidences[0],
      evidences: createdEvidences,
      chainInfo: chainInfos[0],
      chainInfos
    });

  } catch (err) {
    uploadedFiles.forEach(f => {
      try { fs.unlinkSync(f.path); } catch (e) {}
    });
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    let query = {};
    const isOversight = user.position === 'CBI' || user.position === 'Judge' || user.role === 'CBI' || user.role === 'Judge';
    if (!isOversight) {
      const allottedCases = await Case.find({ allottedTo: user.name });
      const allottedCaseIds = allottedCases.map(c => c.caseId);
      query = { caseId: { $in: allottedCaseIds } };
    }

    const items = await Evidence.find(query).populate('uploadedBy', 'name role position').sort({ createdAt: -1 }).lean();
    const caseIds = [...new Set(items.map((i) => i.caseId).filter(Boolean))];
    const caseDocs = await Case.find({ caseId: { $in: caseIds } }, 'caseId name').lean();
    const caseNameMap = Object.fromEntries(caseDocs.map((c) => [c.caseId, c.name]));
    const itemsWithCase = items.map((item) => ({
      ...item,
      caseName: caseNameMap[item.caseId] || item.caseId || '',
    }));
    res.json(itemsWithCase);
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

    const isOversight = user.position === 'CBI' || user.position === 'Judge' || user.role === 'CBI' || user.role === 'Judge';
    if (!isOversight) {
      const caseDoc = await Case.findOne({ caseId: item.caseId });
      const isAllotted = caseDoc && caseDoc.allottedTo.includes(user.name);
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

    const isOversight = user.position === 'CBI' || user.position === 'Judge' || user.role === 'CBI' || user.role === 'Judge';
    if (!isOversight) {
      const caseDoc = await Case.findOne({ caseId: item.caseId });
      const isAllotted = caseDoc && caseDoc.allottedTo.includes(user.name);
      if (!isAllotted) {
        await logActivity({ user, action: 'ACCESS_DENIED', caseId: item.caseId, evidenceId: item._id, details: 'Rule 5: Access to non-allotted case', req });
        return res.status(403).json({ error: 'You are not allowed to access any data in this case' });
      }
    }

    if (user.position === 'Forensic') {
      await logActivity({ user, action: 'ACCESS_DENIED', caseId: item.caseId, evidenceId: item._id, details: 'Rule 9: Forensic users cannot download', req });
      return res.status(403).json({ error: 'Forensic users are restricted to View only. Downloading is forbidden.' });
    }

    if (!fs.existsSync(item.filePath)) {
      return res.status(404).json({ error: 'Physical file not found on server' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${item.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    await logActivity({ user, action: 'DOWNLOAD', caseId: item.caseId, evidenceId: item._id, req });

    // Log custody event on blockchain if evidence has an on-chain record
    if (item.blockchainEvidenceId != null) {
      logCustodyOnChain(item.blockchainEvidenceId, `downloaded by ${user.name} (${user.position})`).catch(() => {});
    }

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

    const isOversight = user.position === 'CBI' || user.position === 'Judge' || user.role === 'CBI' || user.role === 'Judge';
    if (!isOversight) {
      const caseDoc = await Case.findOne({ caseId: item.caseId });
      const isAllotted = caseDoc && caseDoc.allottedTo.includes(user.name);
      if (!isAllotted) {
        await logActivity({ user, action: 'ACCESS_DENIED', caseId: item.caseId, evidenceId: item._id, details: 'Rule 5: Access to non-allotted case', req });
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

    await logActivity({ user, action: 'VIEW', caseId: item.caseId, evidenceId: item._id, req });

    // Log custody event on blockchain if evidence has an on-chain record
    if (item.blockchainEvidenceId != null) {
      logCustodyOnChain(item.blockchainEvidenceId, `viewed by ${user.name} (${user.position})`).catch(() => {});
    }

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

    let hashToCheck = currentHash;
    if (!hashToCheck) {
      if (fs.existsSync(evidence.filePath)) {
        try {
          hashToCheck = await new Promise((resolve, reject) => {
            const hashStream = crypto.createHash('sha256');
            const readStream = fs.createReadStream(evidence.filePath);
            const decryptStream = getDecryptStream(evidence.iv);
            
            readStream.pipe(decryptStream).pipe(hashStream)
              .on('finish', () => resolve(hashStream.read().toString('hex')))
              .on('error', reject);
          });
        } catch (err) {
          hashToCheck = 'ERROR_COMPUTING_HASH';
        }
      } else {
        hashToCheck = 'FILE_MISSING';
      }
    }
    const match = await verifyEvidenceOnChain(evidence.blockchainEvidenceId, hashToCheck);
    const info = await getEvidenceInfoOnChain(evidence.blockchainEvidenceId);
    
    // Fetch the full custody log from the blockchain
    const { getCustodyLogFromChain } = await import('../services/blockchain.js');
    const custodyLog = await getCustodyLogFromChain(evidence.blockchainEvidenceId) || [];

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
      custodyLog,
    });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed', details: err.message });
  }
});

export default router;
