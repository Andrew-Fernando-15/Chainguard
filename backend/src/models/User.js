import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stored hashed, never plain text
    role: {
      type: String,
      enum: ['police', 'judge', 'admin'],
      default: 'police',
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
