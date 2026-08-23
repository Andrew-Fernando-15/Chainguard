import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Closed'],
      default: 'Pending',
    },
    currentInCharge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    previousInCharges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Case', caseSchema);
