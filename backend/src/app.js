import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import evidenceRoutes from './routes/evidence.js';
import caseRoutes from './routes/case.js';

const app = express();

app.use(cors()); // allows your Vite frontend on localhost:5173 to call this API
app.use(express.json());

// Simple health check - visit http://localhost:5000/api/health to confirm the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ChainGuard backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/cases', caseRoutes);

// Catch-all for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
