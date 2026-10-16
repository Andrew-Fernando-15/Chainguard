import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Case from '../models/Case.js';
import { verifyToken } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Helper function to check if user exists in the authorized credentials file
function checkCredential(name) {
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'Credential data.txt'),
      path.join(process.cwd(), 'backend', 'Credential data.txt'),
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Credential data.txt'),
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Credential data.txt'),
    ];
    const credPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!credPath) {
      console.warn('Credential data.txt not found in candidate paths');
      return null;
    }
    
    const fileContent = fs.readFileSync(credPath, 'utf8');
    const lines = fileContent.split('\n');
    const cleanName = (name || '').trim().toLowerCase();
    if (!cleanName) return null;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Expected format: Name | Position | Role | EmployeeID
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const [fileLocName, fileLocPos, fileLocRole, fileLocEmpId] = parts;
        
        // Every name inside Credential data.txt is authorized to register
        if (fileLocName.toLowerCase() === cleanName) {
          return { 
            name: fileLocName,
            position: fileLocPos, 
            role: fileLocRole, 
            employeeId: fileLocEmpId || null 
          };
        }
      }
    }
  } catch (err) {
    console.error('Error reading credential data:', err);
  }
  return null;
}

// GET /api/auth/authorized-credentials
router.get('/authorized-credentials', (req, res) => {
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'Credential data.txt'),
      path.join(process.cwd(), 'backend', 'Credential data.txt'),
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Credential data.txt'),
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Credential data.txt'),
    ];
    const credPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!credPath) return res.json([]);

    const fileContent = fs.readFileSync(credPath, 'utf8');
    const lines = fileContent.split('\n');
    const list = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 3) {
        list.push({
          name: parts[0],
          position: parts[1],
          role: parts[2],
          employeeId: parts[3] || null,
        });
      }
    }
    res.json(list);
  } catch (err) {
    res.json([]);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, position, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    // 1. Password Validation
    // Must contain at least 1 uppercase, 1 lowercase, 1 number, 1 symbol, and minimum 8 characters
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 symbol, and be at least 8 characters long.' 
      });
    }

    // 2. Check "Credential data.txt" for authorization by Name
    const authorizedDetails = checkCredential(name);
    if (!authorizedDetails) {
      return res.status(403).json({ 
        error: `You are not authorised to register in ChainGuard. "${name}" is not listed in authorized credential records.` 
      });
    }

    // 3. Email uniqueness validation
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // 4. Hash password and create user with their official credential details
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name: authorizedDetails.name || name.trim(), 
      email: email.toLowerCase().trim(), 
      password: hashedPassword, 
      position: authorizedDetails.position || position, 
      role: authorizedDetails.role || role || 'N/A',
      employeeId: authorizedDetails.employeeId || null,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        position: user.position, 
        role: user.role,
        employeeId: user.employeeId 
      },
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        position: user.position,
        role: user.role,
        caseLimit: user.caseLimit ?? null
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// GET /api/auth/users - Return users with their case limits and active case count
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name position role email caseLimit').lean();
    
    // Attach active assigned cases count to each user
    const usersWithCounts = await Promise.all(
      users.map(async (u) => {
        const count = await Case.countDocuments({ allottedTo: u.name });
        return {
          ...u,
          caseLimit: u.caseLimit ?? null,
          activeCasesCount: count
        };
      })
    );

    res.json(usersWithCounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// PUT /api/auth/users/:id/case-limit - Changeable by Judge or CBI
router.put('/users/:id/case-limit', verifyToken, async (req, res) => {
  try {
    const requester = req.user;
    if (requester.position !== 'Judge' && requester.position !== 'CBI') {
      return res.status(403).json({
        error: 'Only Judge or CBI can configure case limits for personnel.'
      });
    }

    const { caseLimit } = req.body;
    // null, undefined, 0, negative, or empty string means unlimited (no limit)
    const parsedLimit = (caseLimit === null || caseLimit === '' || caseLimit === undefined || Number(caseLimit) <= 0)
      ? null
      : Math.floor(Number(caseLimit));

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { caseLimit: parsedLimit } },
      { new: true, select: 'name position role email caseLimit' }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activeCasesCount = await Case.countDocuments({ allottedTo: updatedUser.name });

    res.json({
      message: `Case limit updated for ${updatedUser.name}`,
      user: {
        ...updatedUser.toObject(),
        caseLimit: updatedUser.caseLimit ?? null,
        activeCasesCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update case limit', details: err.message });
  }
});

export default router;
