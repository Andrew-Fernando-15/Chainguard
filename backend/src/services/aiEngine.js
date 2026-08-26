import AccessLog from '../models/AccessLog.js';
import Evidence from '../models/Evidence.js';

/**
 * Log action and evaluate AI rules
 * @param {string} userId
 * @param {string} action - 'upload', 'view', 'download', 'failed_access'
 * @param {Object} details - { caseId, evidenceId, fileName, fileHash, fileSize, reason (for pre-caught) }
 */
export async function logAndAnalyze(userId, action, details = {}) {
  try {
    const { caseId, evidenceId, fileName, fileHash, fileSize, reason } = details;

    let isSuspicious = false;
    let ruleViolated = reason || null;

    // Rule 6: Access between 12 AM – 5 AM
    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 5) {
      isSuspicious = true;
      ruleViolated = ruleViolated ? `${ruleViolated}, Rule 6: Access between 12 AM - 5 AM` : 'Rule 6: Access between 12 AM - 5 AM';
    }

    if (action === 'failed_access') {
      isSuspicious = true; // Pre-caught rules (5, 9, 10) or general failures
      
      // Rule 4: >5 failed access attempts in 10 min
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      const failedCount = await AccessLog.countDocuments({
        userId,
        action: 'failed_access',
        createdAt: { $gte: tenMinsAgo }
      });

      if (failedCount >= 5) { // 5 previous + 1 current = 6 (>5)
        ruleViolated = `${ruleViolated}, Rule 4: >5 failed access attempts in 10 min`;
      }
    }

    if (action === 'upload') {
      // Rule 11: Duplicate SHA-256 upload
      const existingHash = await Evidence.findOne({ fileHash });
      if (existingHash) {
        isSuspicious = true;
        ruleViolated = ruleViolated ? `${ruleViolated}, Rule 11: Duplicate SHA-256 upload` : 'Rule 11: Duplicate SHA-256 upload';
      }

      // Rule 1, 2, 3: Check against previous uploads with the same fileName in the same case
      if (fileName && caseId) {
        const previousUploads = await Evidence.find({ caseId, fileName }).sort({ createdAt: -1 });
        if (previousUploads.length > 0) {
          const lastUpload = previousUploads[0];
          
          if (lastUpload.fileHash !== fileHash) {
            isSuspicious = true;
            ruleViolated = ruleViolated ? `${ruleViolated}, Rule 1 & 3: Hash mismatch on same file name (Possible Tamper/Recreate)` : 'Rule 1 & 3: Hash mismatch on same file name (Possible Tamper/Recreate)';
          }

          if (fileSize && lastUpload.fileSize) {
            const sizeDiff = Math.abs(lastUpload.fileSize - fileSize) / lastUpload.fileSize;
            if (sizeDiff > 0.5) { // >50% change
              isSuspicious = true;
              ruleViolated = ruleViolated ? `${ruleViolated}, Rule 2: Abnormal file size change` : 'Rule 2: Abnormal file size change';
            }
          }
        }
      }
    }

    if (action === 'download') {
      // Rule 7: Download >8 files in 20 min
      const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
      const downloadCount = await AccessLog.countDocuments({
        userId,
        action: 'download',
        createdAt: { $gte: twentyMinsAgo }
      });

      if (downloadCount >= 8) { // 8 previous + 1 current = 9 (>8)
        isSuspicious = true;
        ruleViolated = ruleViolated ? `${ruleViolated}, Rule 7: Download >8 files in 20 min` : 'Rule 7: Download >8 files in 20 min';
      }
    }

    if (action === 'view' || action === 'download') {
      // Rule 8: Same evidence opened >10 times in 1 hour
      if (evidenceId) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const openCount = await AccessLog.countDocuments({
          userId,
          evidenceId,
          action: { $in: ['view', 'download'] },
          createdAt: { $gte: oneHourAgo }
        });

        if (openCount >= 10) { // 10 previous + 1 current = 11 (>10)
          isSuspicious = true;
          ruleViolated = ruleViolated ? `${ruleViolated}, Rule 8: Same evidence opened >10 times in 1 hour` : 'Rule 8: Same evidence opened >10 times in 1 hour';
        }
      }
    }

    const logEntry = await AccessLog.create({
      userId,
      evidenceId,
      caseId,
      action,
      suspiciousFlag: isSuspicious,
      reason: ruleViolated
    });

    return logEntry;
  } catch (err) {
    console.error('AI Engine Error:', err);
    return null;
  }
}
