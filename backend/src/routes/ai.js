import express from 'express';
import AccessLog from '../models/AccessLog.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/ai/logs - Fetch all flagged suspicious activities
// Depending on requirements, we might want to restrict this to Judges or CBI. 
// For now, let's just return all logs for the AI Detection page to display.
router.get('/logs', async (req, res) => {
  try {
    const logs = await AccessLog.find({ suspiciousFlag: true })
      .populate('userId', 'name position role')
      .populate('evidenceId', 'fileName category caseId')
      .sort({ createdAt: -1 });
    
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AI logs', details: err.message });
  }
});

export default router;
