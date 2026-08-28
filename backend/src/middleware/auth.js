import jwt from 'jsonwebtoken';

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional: restrict a route to specific roles, e.g. requireRole('admin')
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized for this action' });
    }
    next();
  };
}

import Case from '../models/Case.js';
import User from '../models/User.js';
import { logAndAnalyze } from '../services/aiEngine.js';

export async function checkCaseAllotment(req, res, next) {
  try {
    const caseId = req.params.id || req.params.caseId || req.body.caseId || req.query.caseId;
    if (!caseId) {
      return res.status(400).json({ error: 'Case ID is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.position === 'CBI' || user.position === 'Judge') {
      return next(); // CBI and Judge can access any case
    }

    let caseDoc;
    if (caseId.match(/^[0-9a-fA-F]{24}$/)) {
      caseDoc = await Case.findById(caseId);
    } else {
      caseDoc = await Case.findOne({ caseId: caseId });
    }

    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found in database' });
    }

    if (caseDoc.status === 'Closed' && user.position !== 'Judge' && user.position !== 'CBI') {
      await logAndAnalyze(user._id, 'failed_access', { caseId: caseDoc.caseId, reason: 'Rule 10: Access after case is closed' });
      return res.status(403).json({ error: 'This case is closed. You no longer have access.' });
    }

    const isAllotted = user.allottedCases.some((id) => id.toString() === caseDoc._id.toString());
    if (!isAllotted) {
      await logAndAnalyze(user._id, 'failed_access', { caseId: caseDoc.caseId, reason: 'Rule 5: Access to non-allotted case' });
      return res.status(403).json({ error: 'You are not allotted to this case' });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify case allotment', details: err.message });
  }
}

