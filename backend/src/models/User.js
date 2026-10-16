import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stored hashed, never plain text
    position: {
      type: String,
      enum: ['Police', 'Forensic', 'Judge', 'CBI', 'Investigator'],
      required: true,
    },
    role: {
      type: String,
      enum: ['Investigating Officer', 'Normal Officer', 'Judge', 'CBI', 'N/A', 'Forensic Expert', 'CBI Officer'],
      default: 'N/A',
    },
    caseLimit: {
      type: Number,
      default: null, // null means unlimited, or positive integer limit set by Judge / CBI
    },
    employeeId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
