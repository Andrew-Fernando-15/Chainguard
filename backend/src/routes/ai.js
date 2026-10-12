import express from 'express';
import AccessLog from '../models/AccessLog.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/ai/anomalies - Fetch logs where suspiciousFlag = true
router.get('/anomalies', async (req, res) => {
  try {
    const { date, role, rule } = req.query;
    
    let query = { suspiciousFlag: true };

    if (date) {
      // date format expected: YYYY-MM-DD
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.createdAt = { $gte: start, $lt: end };
    }

    if (role) {
      query.role = role;
    }

    if (rule) {
      query.triggeredRules = { $regex: rule, $options: 'i' };
    }

    const logs = await AccessLog.find(query)
      .populate('userId', 'name position role')
      .populate('evidenceId', 'fileName category caseId')
      .sort({ createdAt: -1 });
    
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AI anomalies', details: err.message });
  }
});

export default router;
