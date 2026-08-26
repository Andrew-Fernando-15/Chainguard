import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    fileName: { type: String, required: true },
    fileHash: { type: String, required: true }, // SHA-256, computed in the frontend
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true }, // Size in bytes
    iv: { type: String, required: true },
    blockchainEvidenceId: { type: Number }, // The smart contract's uint256 evidenceId
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
