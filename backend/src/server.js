import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

console.log('JWT_SECRET loaded?', !!process.env.JWT_SECRET, 'length:', process.env.JWT_SECRET?.length);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard';

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`✅ ChainGuard backend running at http://localhost:${PORT}`);
      console.log(`   Try it: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();