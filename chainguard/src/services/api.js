import axios from 'axios';

// Real backend connection (Step 1-2 of the build plan: auth is live).
// Blockchain calls further down are still mocked until Step 5.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// ---- REAL: Authentication ----
export async function registerUser({ name, email, password, role }) {
  const res = await client.post('/auth/register', { name, email, password, role });
  return res.data;
}

export async function loginUser({ email, password }) {
  const res = await client.post('/auth/login', { email, password });
  return res.data; // { message, token, user }
}

// ---- REAL: Evidence (protected, needs a token) ----
export async function uploadEvidence({ caseId, fileName, fileHash }, token) {
  const res = await client.post(
    '/evidence/upload',
    { caseId, fileName, fileHash },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

export async function listEvidence(token) {
  const res = await client.get('/evidence', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function mockUploadToBlockchain(hash) {
  await delay(1400);
  return {
    txHash: `0x${hash.slice(0, 8)}...${hash.slice(-6)}`,
    contract: '0x8B3f...C29e',
    block: Math.floor(4_800_000 + Math.random() * 5000),
    timestamp: new Date().toISOString(),
  };
}

export async function mockVerifyEvidence(evidenceId) {
  await delay(1100);
  const match = Math.random() > 0.15;
  return {
    evidenceId,
    originalHash: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',
    currentHash: match
      ? 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'
      : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4',
    match,
    txHash: '0x7ac1f9e2b4d0a3c88e11f6a5b0d9c4e7f2a1b3c9',
    timestamp: '12 Jul 2026, 09:14',
    contract: '0x8B3fA1c9e02D47f6C1a9E22bB0f3C29eD4a17F00',
  };
}
