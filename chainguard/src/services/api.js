import axios from 'axios';

// Real backend connection fully integrated.
// Authentication, Blockchain, and AI Anomaly endpoints are live.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// ---- REAL: Authentication ----
export async function registerUser({ name, email, password, position, role }) {
  const res = await client.post('/auth/register', { name, email, password, position, role });
  return res.data;
}

export async function loginUser({ email, password }) {
  const res = await client.post('/auth/login', { email, password });
  return res.data; // { message, token, user }
}

// ---- REAL: Evidence (protected, needs a token) ----
export async function uploadEvidence({ caseId, folder = 'Root', category, title, description, collectedDate, fileName, fileHash, file, files = [] }, token) {
  const formData = new FormData();
  formData.append('caseId', caseId);
  formData.append('folder', folder || 'Root');
  formData.append('category', category);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);
  if (collectedDate) formData.append('collectedDate', collectedDate);

  // If multiple files passed
  if (files && files.length > 0) {
    const names = [];
    const hashes = [];
    files.forEach((fObj) => {
      // fObj can be File or { file, hash, name }
      const actualFile = fObj.file || fObj;
      const curName = fObj.name || actualFile.name;
      const curHash = fObj.hash || '';
      formData.append('files', actualFile);
      names.push(curName);
      if (curHash) hashes.push(curHash);
    });
    formData.append('fileNames', JSON.stringify(names));
    if (hashes.length > 0) formData.append('fileHashes', JSON.stringify(hashes));
  } else if (file) {
    formData.append('fileName', fileName || file.name);
    if (fileHash) formData.append('fileHash', fileHash);
    formData.append('file', file);
  }

  const res = await client.post('/evidence/upload', formData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function getCaseFolders(caseId, token) {
  const res = await client.get(`/cases/${caseId}/folders`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function createCaseFolder(caseId, folderName, token) {
  const res = await client.post(`/cases/${caseId}/folders`, { name: folderName }, {
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

export async function createCase(caseId, name, token) {
  const res = await client.post('/cases', { caseId, name }, {
    headers: { Authorization: `Bearer ${token}` }
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

export async function getUsers(token) {
  const res = await client.get('/auth/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function assignCase(caseId, allottedTo, token) {
  const res = await client.put(`/cases/${caseId}/assign`, { allottedTo }, {
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

export async function reopenCase(caseId, token) {
  const res = await client.put(`/cases/${caseId}/reopen`, {}, {
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

// ---- REAL: Chain of Custody (blockchain) ----
export async function getCustodyTimeline(caseId, token) {
  const res = await client.get(`/cases/${caseId}/custody`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// ---- REAL: AI Anomaly Detection ----
export async function getAnomalies(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.date) params.append('date', filters.date);
  if (filters.role) params.append('role', filters.role);
  if (filters.rule) params.append('rule', filters.rule);

  const res = await client.get(`/ai/anomalies?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// ---- User & Personnel Management ----
export async function listUsers(token) {
  const res = await client.get('/auth/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function updateCaseLimit(userId, caseLimit, token) {
  const res = await client.put(`/auth/users/${userId}/case-limit`, { caseLimit }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

