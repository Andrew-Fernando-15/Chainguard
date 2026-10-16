import express from 'express';
import Case from '../models/Case.js';
import User from '../models/User.js';
import Evidence from '../models/Evidence.js';
import AccessLog from '../models/AccessLog.js';
import { verifyToken, checkCaseAllotment } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/cases
// Returns cases allotted to the current user (or all if CBI)
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.position === 'CBI' || user.position === 'Judge') {
      const allCases = await Case.find();
      return res.json(allCases);
    }
    
    // Check if the user's name is in the allottedTo array
    const allottedCases = await Case.find({ allottedTo: user.name });
    res.json(allottedCases);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cases', details: err.message });
  }
});

// POST /api/cases
// Create a new case. Restricted to Police.
router.post('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.position !== 'Police') {
      return res.status(403).json({ error: 'Only Police officers can create new cases.' });
    }

    const { caseId, name } = req.body;
    if (!caseId || !name) {
      return res.status(400).json({ error: 'caseId and name are required' });
    }

    const existing = await Case.findOne({ caseId });
    if (existing) {
      return res.status(409).json({ error: 'A case with this ID already exists' });
    }

    // Configurable case limit per person (set by Judge / CBI; default unlimited if null/0)
    if (user.position !== 'Judge' && user.position !== 'CBI') {
      const userDoc = await User.findById(user._id || user.id);
      if (userDoc && typeof userDoc.caseLimit === 'number' && userDoc.caseLimit > 0) {
        const activeCount = await Case.countDocuments({ allottedTo: user.name });
        if (activeCount >= userDoc.caseLimit) {
          return res.status(400).json({
            error: `Case limit reached. Your configured limit is ${userDoc.caseLimit} case(s).`
          });
        }
      }
    }

    const newCase = await Case.create({
      caseId,
      name,
      status: 'Active',
      allottedTo: [user.name] // Auto-allot to the creator
    });

    // Log the creation
    const { logActivity } = await import('../services/aiAnomalyEngine.js');
    await logActivity({
      user,
      action: 'CASE_OPENED',
      caseId: newCase.caseId,
      details: `Created by ${user.name}`,
      req
    });

    res.status(201).json({ message: 'Case created successfully', case: newCase });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create case', details: err.message });
  }
});

// GET /api/cases/:id
// Returns specific case details, protected by allotment check
router.get('/:id', checkCaseAllotment, async (req, res) => {
  try {
    const caseData = await Case.findById(req.params.id);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    res.json(caseData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch case details', details: err.message });
  }
});

// GET /api/cases/:caseId/folders
router.get('/:caseId/folders', checkCaseAllotment, async (req, res) => {
  try {
    let caseDoc;
    if (req.params.caseId.match(/^[0-9a-fA-F]{24}$/)) {
      caseDoc = await Case.findById(req.params.caseId);
    } else {
      caseDoc = await Case.findOne({ caseId: req.params.caseId });
    }

    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Return list of folders (always includes 'Root' if desired, but caseDoc.folders contains custom folders)
    const folders = caseDoc.folders || [];
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch folders', details: err.message });
  }
});

// POST /api/cases/:caseId/folders
router.post('/:caseId/folders', checkCaseAllotment, async (req, res) => {
  try {
    const { name, folderName } = req.body;
    const folder = (name || folderName || '').trim();

    if (!folder) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    if (folder.toLowerCase() === 'root') {
      return res.status(400).json({ error: 'Cannot create folder named "Root"' });
    }

    let caseDoc;
    if (req.params.caseId.match(/^[0-9a-fA-F]{24}$/)) {
      caseDoc = await Case.findById(req.params.caseId);
    } else {
      caseDoc = await Case.findOne({ caseId: req.params.caseId });
    }

    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (!caseDoc.folders) {
      caseDoc.folders = [];
    }

    if (caseDoc.folders.includes(folder)) {
      return res.status(409).json({ error: 'Folder already exists in this case' });
    }

    caseDoc.folders.push(folder);
    await caseDoc.save();

    res.status(201).json({ message: 'Folder created successfully', folder, folders: caseDoc.folders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder', details: err.message });
  }
});

// GET /api/cases/:id/evidence
router.get('/:id/evidence', checkCaseAllotment, async (req, res) => {
  try {
    let caseDoc;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      caseDoc = await Case.findById(req.params.id);
    } else {
      caseDoc = await Case.findOne({ caseId: req.params.id });
    }

    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const items = await Evidence.find({ caseId: caseDoc.caseId }).populate('uploadedBy', 'name role position').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch case evidence', details: err.message });
  }
});

// PUT /api/cases/:id/status
router.put('/:id/status', checkCaseAllotment, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Active', 'Closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.position !== 'Judge' && user.position !== 'CBI' && user.role !== 'Investigating Officer') {
      return res.status(403).json({ error: 'You are not authorized to change the case status' });
    }

    let caseDoc;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      caseDoc = await Case.findById(req.params.id);
    } else {
      caseDoc = await Case.findOne({ caseId: req.params.id });
    }

    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const previousStatus = caseDoc.status;
    caseDoc.status = status;
    await caseDoc.save();

    // Log this action in Access Logs and trigger AI Engine
    const { logActivity } = await import('../services/aiAnomalyEngine.js');
    await logActivity({
      user,
      action: status === 'Closed' ? 'CASE_CLOSED' : 'STATUS_CHANGED',
      caseId: caseDoc.caseId,
      details: status === 'Closed' 
        ? `Case closed by ${user.name} (${user.position})` 
        : `Status changed from ${previousStatus} to ${status} by ${user.name} (${user.position})`,
      req
    });

    // Log custody event on blockchain for all evidence in this case
    const { logCustodyOnChain } = await import('../services/blockchain.js');
    const caseEvidence = await Evidence.find({ caseId: caseDoc.caseId });
    for (const ev of caseEvidence) {
      if (ev.blockchainEvidenceId != null) {
        logCustodyOnChain(
          ev.blockchainEvidenceId,
          status === 'Closed'
            ? `case_closed by ${user.name} (${user.position})`
            : `status_changed to ${status} by ${user.name} (${user.position})`
        ).catch(() => {});
      }
    }

    res.json({ message: 'Case status updated', case: caseDoc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update case status', details: err.message });
  }
});

// PUT /api/cases/:id/reopen
// Reopen a closed case. Restricted to Judge and CBI roles.
router.put('/:id/reopen', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.position !== 'Judge' && user.position !== 'CBI') {
      return res.status(403).json({ error: 'Only a Judge or CBI can reopen a closed case.' });
    }

    let caseDoc;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      caseDoc = await Case.findById(req.params.id);
    } else {
      caseDoc = await Case.findOne({ caseId: req.params.id });
    }

    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (caseDoc.status !== 'Closed') {
      return res.status(400).json({ error: 'Case is not closed' });
    }

    caseDoc.status = 'Active';
    await caseDoc.save();

    // Log this critical action in Access Logs and trigger AI Engine
    const { logActivity } = await import('../services/aiAnomalyEngine.js');
    await logActivity({
      user,
      action: 'CASE_REOPENED',
      caseId: caseDoc.caseId,
      req
    });

    // Log custody event on blockchain for all evidence in this case
    const { logCustodyOnChain } = await import('../services/blockchain.js');
    const caseEvidence = await Evidence.find({ caseId: caseDoc.caseId });
    for (const ev of caseEvidence) {
      if (ev.blockchainEvidenceId != null) {
        logCustodyOnChain(ev.blockchainEvidenceId, `case_reopened by ${user.name} (${user.position})`).catch(() => {});
      }
    }

    res.json({ message: 'Case successfully reopened', case: caseDoc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reopen case', details: err.message });
  }
});

// PUT /api/cases/:id/assign
// Assign officers to a case. Restricted to CBI role.
router.put('/:id/assign', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.position !== 'CBI') {
      return res.status(403).json({ error: 'Only CBI can assign officers to a case.' });
    }

    const { allottedTo } = req.body;
    if (!Array.isArray(allottedTo)) {
      return res.status(400).json({ error: 'allottedTo must be an array of names' });
    }

    let caseDoc;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      caseDoc = await Case.findById(req.params.id);
    } else {
      caseDoc = await Case.findOne({ caseId: req.params.id });
    }

    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check individual case limits set by Judge / CBI (default unlimited if null or 0)
    for (const officerName of allottedTo) {
      const officerUser = await User.findOne({ name: officerName });
      if (officerUser && officerUser.position !== 'Judge' && officerUser.position !== 'CBI') {
        if (typeof officerUser.caseLimit === 'number' && officerUser.caseLimit > 0) {
          const count = await Case.countDocuments({
            _id: { $ne: caseDoc._id },
            allottedTo: officerName
          });
          if (count >= officerUser.caseLimit) {
            return res.status(400).json({
              error: `Cannot assign case: Officer ${officerName} has reached their configured limit of ${officerUser.caseLimit} case(s).`
            });
          }
        }
      }
    }

    caseDoc.allottedTo = allottedTo;
    await caseDoc.save();

    // Log this critical action in Access Logs
    const { logActivity } = await import('../services/aiAnomalyEngine.js');
    await logActivity({
      user,
      action: 'CASE_ASSIGNED',
      caseId: caseDoc.caseId,
      details: `Reassigned to: ${allottedTo.join(', ')} by ${user.name} (${user.position})`,
      req
    });

    // Log custody event on blockchain for all evidence in this case
    const { logCustodyOnChain } = await import('../services/blockchain.js');
    const caseEvidence = await Evidence.find({ caseId: caseDoc.caseId });
    for (const ev of caseEvidence) {
      if (ev.blockchainEvidenceId != null) {
        logCustodyOnChain(
          ev.blockchainEvidenceId,
          `case_reassigned to ${allottedTo.join(', ')} by ${user.name} (${user.position})`
        ).catch(() => {});
      }
    }

    res.json({ message: 'Case successfully assigned', case: caseDoc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign case', details: err.message });
  }
});

// GET /api/cases/:id/custody
// Returns the full, verified chain-of-custody timeline for a case
router.get('/:id/custody', checkCaseAllotment, async (req, res) => {
  try {
    let caseDoc;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      caseDoc = await Case.findById(req.params.id);
    } else {
      caseDoc = await Case.findOne({ caseId: req.params.id });
    }

    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const { getCustodyLogFromChain, getEvidenceInfoOnChain } = await import('../services/blockchain.js');

    const timeline = [];
    const seenKeys = new Set();

    // 1. Gather all evidence items in this case that have on-chain records
    const evidenceItems = await Evidence.find({ caseId: caseDoc.caseId })
      .populate('uploadedBy', 'name position role');

    for (const ev of evidenceItems) {
      if (ev.blockchainEvidenceId != null) {
        // Upload event on blockchain
        const info = await getEvidenceInfoOnChain(ev.blockchainEvidenceId);
        if (info) {
          const ts = Number(info[3]);
          const key = `uploaded-${ev._id}-${ts}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            timeline.push({
              action: 'uploaded',
              actor: info[2],
              actorName: ev.uploadedBy?.name || 'Unknown Officer',
              actorRole: ev.uploadedBy?.position || 'Police',
              timestamp: ts,
              evidenceFileName: ev.fileName,
              evidenceId: ev._id,
              blockchainEvidenceId: ev.blockchainEvidenceId,
              details: `Original evidence uploaded: ${ev.fileName} (SHA-256: ${ev.fileHash ? ev.fileHash.slice(0, 16) + '...' : 'Recorded'})`,
              txHash: ev.blockchainTxId,
              source: 'blockchain'
            });
          }
        }

        // Full custody log on chain
        const custodyLog = await getCustodyLogFromChain(ev.blockchainEvidenceId);
        if (custodyLog) {
          for (const entry of custodyLog) {
            if (entry.action === 'uploaded') continue;

            const actorName = extractNameFromAction(entry.action);
            const actorRole = extractRoleFromAction(entry.action);
            const ts = Number(entry.timestamp);
            const normAction = normalizeAction(entry.action);
            const key = `${normAction}-${actorName}-${Math.floor(ts / 30)}`;

            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              timeline.push({
                action: normAction,
                actor: entry.actor,
                actorName,
                actorRole,
                timestamp: ts,
                evidenceFileName: ev.fileName,
                evidenceId: ev._id,
                blockchainEvidenceId: ev.blockchainEvidenceId,
                details: formatActionDetails(entry.action, ev.fileName),
                txHash: null,
                source: 'blockchain'
              });
            }
          }
        }
      }
    }

    // 2. Gather all case-level AccessLogs (creation, reassignments, closings, reopenings, views, etc.)
    const accessLogs = await AccessLog.find({ caseId: caseDoc.caseId })
      .populate('userId', 'name position role')
      .populate('evidenceId', 'fileName')
      .sort({ createdAt: 1 });

    for (const log of accessLogs) {
      const ts = Math.floor(new Date(log.createdAt).getTime() / 1000);
      const actorName = log.userName || log.userId?.name || 'System';
      const actorRole = log.role || log.userId?.position || 'Officer';
      const normAction = normalizeAction(log.action);
      const key = `${normAction}-${actorName}-${Math.floor(ts / 30)}`;

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        timeline.push({
          action: normAction,
          actor: log.userId ? (log.userId._id ? log.userId._id.toString() : log.userId.toString()) : 'system',
          actorName,
          actorRole,
          timestamp: ts,
          evidenceFileName: log.evidenceId?.fileName || null,
          evidenceId: log.evidenceId?._id || null,
          blockchainEvidenceId: null,
          details: log.details || formatActionDetails(log.action, log.evidenceId?.fileName),
          txHash: log.blockchainTxHash || null,
          source: log.blockchainTxHash ? 'blockchain' : 'audit_trail'
        });
      }
    }

    // 3. Fallback: If case was created before any logs, include the case creation event
    if (timeline.length === 0 || !timeline.some(t => t.action === 'case_opened' || t.action === 'CASE_OPENED')) {
      const createdTs = Math.floor(new Date(caseDoc.createdAt || Date.now()).getTime() / 1000);
      timeline.unshift({
        action: 'case_opened',
        actor: 'system',
        actorName: caseDoc.allottedTo?.[0] || 'Investigating Officer',
        actorRole: 'Police',
        timestamp: createdTs,
        evidenceFileName: null,
        evidenceId: null,
        blockchainEvidenceId: null,
        details: `Case registered: ${caseDoc.name} (${caseDoc.caseId})`,
        txHash: null,
        source: 'audit_trail'
      });
    }

    // Sort chronologically ascending
    timeline.sort((a, b) => a.timestamp - b.timestamp);

    res.json({
      caseId: caseDoc.caseId,
      caseName: caseDoc.name,
      status: caseDoc.status,
      allottedTo: caseDoc.allottedTo,
      timeline
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch custody timeline', details: err.message });
  }
});

function normalizeAction(action) {
  if (!action) return 'unknown';
  const a = action.toLowerCase();
  if (a.includes('upload')) return 'uploaded';
  if (a.includes('download')) return 'downloaded';
  if (a.includes('view')) return 'viewed';
  if (a.includes('reopen')) return 'case_reopened';
  if (a.includes('close')) return 'case_closed';
  if (a.includes('reassign') || a.includes('assign')) return 'case_reassigned';
  if (a.includes('open') || a.includes('create')) return 'case_opened';
  if (a.includes('status')) return 'status_changed';
  return a;
}

function formatActionDetails(action, fileName) {
  if (!action) return '';
  const a = action.toLowerCase();
  if (a.includes('upload')) return `Evidence file ${fileName || ''} uploaded and hash registered on blockchain.`;
  if (a.includes('download')) return `Evidence file ${fileName || ''} downloaded for authorized inspection.`;
  if (a.includes('view')) return `Evidence file ${fileName || ''} viewed and accessed securely.`;
  if (a.includes('reopen')) return `Case reopened for further investigation and evidence verification.`;
  if (a.includes('close')) return `Case closed and evidence archive sealed.`;
  if (a.includes('reassign') || a.includes('assign')) return action;
  return action;
}

// Helper: extract name from action string
function extractNameFromAction(action) {
  if (!action) return 'Unknown Officer';
  const match = action.match(/by ([^(\n]+?)(?:\s*\([^)]*\))?$/);
  if (match) return match[1].trim();
  const generalMatch = action.match(/by (.+?) \(/);
  return generalMatch ? generalMatch[1].trim() : 'Unknown Officer';
}

function extractRoleFromAction(action) {
  if (!action) return 'Officer';
  const match = action.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : 'Officer';
}

export default router;
