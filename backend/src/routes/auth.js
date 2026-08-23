import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, position, role } = req.body;
    if (!name || !email || !password || !position) {
      return res.status(400).json({ error: 'name, email, password, and position are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, position, role: role || 'N/A' });

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
    const { name, position, role, email, password } = req.body;
    if (!name || !position || !email || !password) {
      return res.status(400).json({ error: 'name, position, email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.name !== name || user.position !== position || user.role !== (role || 'N/A')) {
      return res.status(401).json({ error: 'Invalid name, position, or role' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, position: user.position, role: user.role },
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

export default router;
