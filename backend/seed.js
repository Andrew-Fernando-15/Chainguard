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

    // Create 15 Cases with allottedTo field (Strict limit: max 5 cases per officer, not applied to Judge/CBI)
    const casesData = [
      { caseId: 'CASE-10231', name: 'Cyber Fraud Investigation', status: 'Active', allottedTo: ['Rahul Sharma'] },
      { caseId: 'CASE-10232', name: 'Narcotics Raid #42', status: 'Pending', allottedTo: ['Priya Nair', 'Aisha Khan'] },
      { caseId: 'CASE-10233', name: 'Arson at 5th Avenue', status: 'Closed', allottedTo: ['Rahul Sharma'] },
      { caseId: 'CASE-10234', name: 'Corporate Embezzlement', status: 'Active', allottedTo: ['Rahul Sharma'] },
      { caseId: 'CASE-10235', name: 'Hit and Run Incident', status: 'Pending', allottedTo: ['Priya Nair', 'Aisha Khan'] },
      { caseId: 'CASE-10236', name: 'Digital Forgery Case', status: 'Active', allottedTo: ['Rahul Sharma'] },
      { caseId: 'CASE-10237', name: 'Bank Robbery Evidence', status: 'Closed', allottedTo: ['Aisha Khan'] },
      { caseId: 'CASE-10238', name: 'Insider Trading Suspicion', status: 'Pending', allottedTo: ['Priya Nair'] },
      { caseId: 'CASE-10239', name: 'Murder at MG Road', status: 'Active', allottedTo: ['Rahul Sharma', 'Aisha Khan'] },
      { caseId: 'CASE-10240', name: 'Smuggling Operations Ring', status: 'Active', allottedTo: ['Priya Nair'] },
      { caseId: 'CASE-10241', name: 'Kidnapping Ransom', status: 'Closed', allottedTo: [] },
      { caseId: 'CASE-10242', name: 'Illegal Weapons Cache', status: 'Pending', allottedTo: [] },
      { caseId: 'CASE-10243', name: 'Cryptocurrency Theft', status: 'Active', allottedTo: ['Priya Nair'] },
      { caseId: 'CASE-10244', name: 'Serial Burglaries South', status: 'Active', allottedTo: ['Aisha Khan'] },
      { caseId: 'CASE-10245', name: 'Counterfeit Currency Network', status: 'Closed', allottedTo: [] },
    ];

    console.log('Creating Cases...');
    await Case.insertMany(casesData);

    // Create Demo Users
    console.log('Creating Users...');
    const users = [
      {
        name: 'Rahul Sharma',
        email: 'rahul@chainguard.com',
        password: await bcrypt.hash('Rahul@123', 10),
        position: 'Police',
        role: 'Investigating Officer'
      },
      {
        name: 'Priya Nair',
        email: 'priya@chainguard.com',
        password: await bcrypt.hash('Priya@123', 10),
        position: 'Police',
        role: 'Normal Officer'
      },
      {
        name: 'Aisha Khan',
        email: 'aisha@chainguard.com',
        password: await bcrypt.hash('Aisha@123', 10),
        position: 'Forensic',
        role: 'Forensic Expert'
      },
      {
        name: 'Suresh Verma',
        email: 'suresh@chainguard.com',
        password: await bcrypt.hash('Suresh@123', 10),
        position: 'Judge',
        role: 'Judge'
      },
      {
        name: 'Vikram Singh',
        email: 'vikram@chainguard.com',
        password: await bcrypt.hash('Vikram@123', 10),
        position: 'CBI',
        role: 'CBI Officer'
      }
    ];

    await User.insertMany(users);

    console.log('Seeding complete! 5 demo users and 15 cases created.');
    console.log('Credentials format: email (e.g. rahul@chainguard.com) / specific password (e.g. Rahul@123)');

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    mongoose.connection.close();
  }
}

seed();
