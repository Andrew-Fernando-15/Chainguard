import mongoose from 'mongoose';

const accessLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }, // Optional, as some actions might just be case-level or failed attempts before evidence is known
    caseId: { type: String, trim: true },
    action: {
      type: String,
      enum: ['upload', 'view', 'download', 'failed_access'],
      required: true,
    },
    suspiciousFlag: { type: Boolean, default: false },
    reason: { type: String }, // Describes which rule was broken
    blockchainTxHash: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('AccessLog', accessLogSchema);
