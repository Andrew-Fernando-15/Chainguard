import express from 'express';
import Case from '../models/Case.js';
import User from '../models/User.js';
import Evidence from '../models/Evidence.js';
import { verifyToken, checkCaseAllotment } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/cases
// Returns cases allotted to the current user (or all if CBI)
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('allottedCases');
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.position === 'CBI') {
      const allCases = await Case.find();
      return res.json(allCases);
    }
    
    res.json(user.allottedCases);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cases', details: err.message });
  }
});

// GET /api/cases/:id
// Returns specific case details, protected by allotment check
router.get('/:id', checkCaseAllotment, async (req, res) => {
  try {
    const caseData = await Case.findById(req.params.id).populate('currentInCharge', 'name position role');
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    res.json(caseData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch case details', details: err.message });
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

    caseDoc.status = status;
    await caseDoc.save();

    res.json({ message: 'Case status updated', case: caseDoc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update case status', details: err.message });
  }
});

export default router;
