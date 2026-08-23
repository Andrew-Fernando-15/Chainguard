import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, trim: true },
    fileName: { type: String, required: true },
    fileHash: { type: String, required: true }, // SHA-256, computed in the frontend
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'verified', 'flagged'],
      default: 'pending',
    },
    blockchainTxId: { type: String, default: null }, // filled in once Step 5 (blockchain) is wired up
  },
  { timestamps: true }
);

export default mongoose.model('Evidence', evidenceSchema);
