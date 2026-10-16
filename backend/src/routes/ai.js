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

    // Deduplicate identical anomaly entries within a 5-minute window
    const deduplicated = [];
    const seen = new Set();
    for (const log of logs) {
      const uId = log.userId?._id?.toString() || log.userId?.toString() || log.userName || '';
      const cId = log.caseId || '';
      const act = log.action || '';
      const details = log.details || '';
      const rule = (log.triggeredRules || []).join('|');
      // Group by 5 minute time window
      const timeBucket = Math.floor(new Date(log.createdAt).getTime() / (5 * 60 * 1000));
      const key = `${uId}:${act}:${cId}:${details}:${rule}:${timeBucket}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Ensure fileName is present even if evidence was deleted
        const plainLog = log.toObject ? log.toObject() : log;
        plainLog.fileName = plainLog.fileName || plainLog.evidenceId?.fileName || '';
        deduplicated.push(plainLog);
      }
    }
    
    res.json(deduplicated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AI anomalies', details: err.message });
  }
});

// DELETE /api/ai/anomalies - Audit anomaly logs are immutable and cannot be cancelled or deleted
router.delete('/anomalies', (req, res) => {
  return res.status(403).json({
    error: 'AI anomaly logs are permanent audit records and cannot be cancelled or deleted.'
  });
});

export default router;
