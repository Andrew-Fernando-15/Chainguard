import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Case from './src/models/Case.js';
import User from './src/models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    // Clear existing users and cases
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Case.deleteMany({});

    // Create 8 Cases
    const casesData = [
      { caseId: 'EVD-10231', name: 'Cyber Fraud Investigation', status: 'Active' },
      { caseId: 'EVD-10232', name: 'Narcotics Raid #42', status: 'Pending' },
      { caseId: 'EVD-10233', name: 'Arson at 5th Avenue', status: 'Closed' },
      { caseId: 'EVD-10234', name: 'Corporate Embezzlement', status: 'Active' },
      { caseId: 'EVD-10235', name: 'Hit and Run Incident', status: 'Pending' },
      { caseId: 'EVD-10236', name: 'Digital Forgery Case', status: 'Active' },
      { caseId: 'EVD-10237', name: 'Bank Robbery Evidence', status: 'Closed' },
      { caseId: 'EVD-10238', name: 'Insider Trading Suspicion', status: 'Pending' },
    ];

    console.log('Creating Cases...');
    const cases = await Case.insertMany(casesData);
    
    // Create Demo Users
    console.log('Creating Users...');
    const users = [
      {
        name: 'Inspector Rajesh Sharma',
        email: 'police@chainguard.com',
        password: await bcrypt.hash('Police@123', 10),
        position: 'Police',
        role: 'Investigating Officer',
        allottedCases: [cases[0]._id, cases[1]._id, cases[2]._id] // 3 cases
      },
      {
        name: 'Dr. Ananya Khan',
        email: 'forensic@chainguard.com',
        password: await bcrypt.hash('Forensic@123', 10),
        position: 'Forensic',
        role: 'Normal Officer',
        allottedCases: [cases[3]._id, cases[4]._id] // 2 cases
      },
      {
        name: 'Inspector Priya Nair',
        email: 'investigator@chainguard.com',
        password: await bcrypt.hash('Invest@123', 10),
        position: 'Police',
        role: 'Investigating Officer',
        allottedCases: [cases[5]._id] // 1 case
      },
      {
        name: 'Justice Suresh Verma',
        email: 'judge@chainguard.com',
        password: await bcrypt.hash('Judge@123', 10),
        position: 'Judge',
        role: 'Judge',
        allottedCases: [] // Judge sees all via logic
      },
      {
        name: 'CBI Officer Vikram Singh',
        email: 'cbi@chainguard.com',
        password: await bcrypt.hash('CBI@123', 10),
        position: 'CBI',
        role: 'CBI',
        allottedCases: [] // CBI sees all via logic
      }
    ];

    await User.insertMany(users);
    
    console.log('Seeding complete! 5 demo users and 8 cases created.');
    console.log('Credentials format: email (e.g. police@chainguard.com) / specific password');

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    mongoose.connection.close();
  }
}

seed();
