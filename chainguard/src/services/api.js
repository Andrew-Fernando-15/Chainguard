import axios from 'axios';

// Real backend connection (Step 1-2 of the build plan: auth is live).
// Blockchain calls further down are still mocked until Step 5.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// ---- REAL: Authentication ----
export async function registerUser({ name, email, password, position, role }) {
  const res = await client.post('/auth/register', { name, email, password, position, role });
  return res.data;
}

export async function loginUser({ name, position, role, email, password }) {
  const res = await client.post('/auth/login', { name, position, role, email, password });
  return res.data; // { message, token, user }
}

// ---- REAL: Evidence (protected, needs a token) ----
export async function uploadEvidence({ caseId, category, fileName, fileHash, file }, token) {
  const formData = new FormData();
  formData.append('caseId', caseId);
  formData.append('category', category);
  formData.append('fileName', fileName);
  formData.append('fileHash', fileHash);
  formData.append('file', file);

  const res = await client.post('/evidence/upload', formData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function listEvidence(token) {
  const res = await client.get('/evidence', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function listCases(token) {
  const res = await client.get('/cases', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getCase(id, token) {
  const res = await client.get(`/cases/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getCaseDetails(caseId, token) {
  const res = await client.get(`/cases/${caseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function updateCaseStatus(caseId, status, token) {
  const res = await client.put(`/cases/${caseId}/status`, { status }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function listCaseEvidence(id, token) {
  const res = await client.get(`/cases/${id}/evidence`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function downloadEvidence(id, token) {
  const res = await client.get(`/evidence/download/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  
  const disposition = res.headers['content-disposition'];
  let filename = 'download';
  if (disposition && disposition.indexOf('attachment') !== -1) {
    const matches = /filename="([^"]+)"/.exec(disposition);
    if (matches != null && matches[1]) {
      filename = matches[1];
    }
  }
  
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
}

export async function verifyEvidence(evidenceDbId, currentHash, token) {
  const res = await client.post('/evidence/verify', { evidenceDbId, currentHash }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function viewEvidence(evidenceDbId, token) {
  const res = await client.get(`/evidence/view/${evidenceDbId}`, {
    responseType: 'blob',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // Open in new tab
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  window.open(blobUrl, '_blank');
  
  // Cleanup after a minute
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
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
