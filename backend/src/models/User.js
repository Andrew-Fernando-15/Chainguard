import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stored hashed, never plain text
    position: {
      type: String,
      enum: ['Police', 'Forensic', 'Judge', 'CBI'],
      required: true,
    },
    role: {
      type: String,
      enum: ['Investigating Officer', 'Normal Officer', 'N/A'],
      default: 'N/A',
    },
    allottedCases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
      }
    ],
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
