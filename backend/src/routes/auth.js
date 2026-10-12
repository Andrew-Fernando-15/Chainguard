import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Helper function to check if user exists in the authorized credentials file
function checkCredential(name, position) {
  try {
    // File is located in the root of the backend folder
    const credPath = path.join(process.cwd(), 'Credential data.txt');
    if (!fs.existsSync(credPath)) {
      console.warn('Credential data.txt not found at', credPath);
      return null;
    }
    
    const fileContent = fs.readFileSync(credPath, 'utf8');
    const lines = fileContent.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Expected format: Name | Position | Role | EmployeeID
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const [fileLocName, fileLocPos, fileLocRole, fileLocEmpId] = parts;
        
        // Match Name (case-insensitive) and Position (case-insensitive)
        if (
          fileLocName.toLowerCase() === name.toLowerCase() &&
          fileLocPos.toLowerCase() === position.toLowerCase()
        ) {
          return { role: fileLocRole, employeeId: fileLocEmpId };
        }
      }
    }
  } catch (err) {
    console.error('Error reading credential data:', err);
  }
  return null;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, position, role } = req.body;
    if (!name || !email || !password || !position) {
      return res.status(400).json({ error: 'name, email, password, and position are required' });
    }

    // 1. Password Validation
    // Must contain at least 1 uppercase, 1 lowercase, 1 number, 1 symbol, and minimum 8 characters
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 symbol, and be at least 8 characters long.' 
      });
    }

    // 2. Check "Credential data.txt" for authorization
    const authorizedDetails = checkCredential(name, position);
    if (!authorizedDetails) {
      return res.status(403).json({ error: 'You are not authorised to register in ChainGuard' });
    }

    // 3. Email uniqueness validation
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // 4. Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name, 
      email, 
      password: hashedPassword, 
      position, 
      // Use the role from the credential file if available, otherwise fallback to request/default
      role: authorizedDetails.role || role || 'N/A' 
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user._id, name: user.name, email: user.email, position: user.position, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, position: user.position, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, position: user.position, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// GET /api/auth/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name position role email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

export default router;
