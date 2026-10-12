import AccessLog from '../models/AccessLog.js';
import Evidence from '../models/Evidence.js';

export async function logActivity({ user, action, caseId, evidenceId, ipAddress, details = '', fileHash, fileSize, fileName }) {
  try {
    let isSuspicious = false;
    const triggeredRules = [];
    const act = action.toUpperCase();

    // 1. Hash mismatch
    // 2. Abnormal file size change
    // 3. Delete + Recreate with different hash
    // 11. Duplicate SHA-256 upload
    if (act === 'UPLOAD') {
      if (fileHash) {
        const existingHash = await Evidence.findOne({ fileHash });
        if (existingHash) {
          isSuspicious = true;
          triggeredRules.push('Rule 11: Duplicate SHA-256 upload');
        }
      }

      if (fileName && caseId) {
        const previousUploads = await Evidence.find({ caseId, fileName }).sort({ createdAt: -1 });
        if (previousUploads.length > 0) {
          const lastUpload = previousUploads[0];
          
          if (lastUpload.fileHash !== fileHash) {
            isSuspicious = true;
            triggeredRules.push('Rule 1: Hash mismatch on same file name');
            triggeredRules.push('Rule 3: Delete + Recreate with different hash');
          }

          if (fileSize && lastUpload.fileSize) {
            const sizeDiff = Math.abs(lastUpload.fileSize - fileSize) / lastUpload.fileSize;
            if (sizeDiff > 0.5) { // >50% change
              isSuspicious = true;
              triggeredRules.push('Rule 2: Abnormal file size change');
            }
          }
        }
      }
    }

    if (act === 'ACCESS_DENIED') {
      isSuspicious = true;
      
      // Rule 5, 9, 10 come in via details
      if (details.includes('Rule 5')) triggeredRules.push('Rule 5: Access to non-allotted case');
      if (details.includes('Rule 9')) triggeredRules.push('Rule 9: Category not allowed for Position+Role');
      if (details.includes('Rule 10')) triggeredRules.push('Rule 10: Access after closed (except Judge/CBI)');

      // Rule 4: >5 failed access attempts in 10 min
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      const failedCount = await AccessLog.countDocuments({
        userId: user._id || user.id,
        action: 'ACCESS_DENIED',
        createdAt: { $gte: tenMinsAgo }
      });

      if (failedCount >= 5) {
        triggeredRules.push('Rule 4: >5 failed access attempts in 10 min');
      }
    }

    // Rule 6: Access between 12 AM – 5 AM
    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 5) {
      isSuspicious = true;
      triggeredRules.push('Rule 6: Access between 12 AM - 5 AM');
    }

    if (act === 'DOWNLOAD') {
      // Rule 7: Download >8 files in 20 min
      const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
      const downloadCount = await AccessLog.countDocuments({
        userId: user._id || user.id,
        action: 'DOWNLOAD',
        createdAt: { $gte: twentyMinsAgo }
      });

      if (downloadCount >= 8) {
        isSuspicious = true;
        triggeredRules.push('Rule 7: Download >8 files in 20 min');
      }
    }

    if (act === 'VIEW' || act === 'DOWNLOAD') {
      // Rule 8: Same evidence opened >10 times in 1 hour
      if (evidenceId) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const openCount = await AccessLog.countDocuments({
          userId: user._id || user.id,
          evidenceId,
          action: { $in: ['VIEW', 'DOWNLOAD'] },
          createdAt: { $gte: oneHourAgo }
        });

        if (openCount >= 10) {
          isSuspicious = true;
          triggeredRules.push('Rule 8: Same evidence opened >10 times in 1 hour');
        }
      }
    }

    if (act === 'ACCESS_DENIED') {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      const recentDuplicate = await AccessLog.findOne({
        userId: user._id || user.id,
        action: act,
        caseId: caseId,
        details: details,
        createdAt: { $gte: thirtySecondsAgo }
      });

      if (recentDuplicate) {
        return recentDuplicate;
      }
    }

    const logEntry = await AccessLog.create({
      userId: user._id || user.id,
      userName: user.name || 'Unknown',
      role: user.position || user.role || 'Unknown',
      action: act,
      caseId,
      evidenceId,
      ipAddress,
      suspiciousFlag: isSuspicious,
      triggeredRules,
      details
    });

    return logEntry;
  } catch (err) {
    console.error('AI Anomaly Engine Error:', err);
    return null;
  }
}
