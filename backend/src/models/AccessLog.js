import mongoose from 'mongoose';

const accessLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String },
    role: { type: String },
    action: {
      type: String,
      enum: ['UPLOAD', 'VIEW', 'DOWNLOAD', 'ACCESS_DENIED', 'CASE_OPENED', 'CASE_REOPENED', 'CASE_CLOSED', 'CASE_ASSIGNED', 'STATUS_CHANGED'],
      required: true,
    },
    caseId: { type: String, trim: true },
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' },
    fileName: { type: String },
    ipAddress: { type: String },
    suspiciousFlag: { type: Boolean, default: false },
    triggeredRules: [{ type: String }],
    details: { type: String },
    blockchainTxHash: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('AccessLog', accessLogSchema);
