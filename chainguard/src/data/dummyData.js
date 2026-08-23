// Dummy / mock data — replace with real API responses from the Express backend.

export const stats = [
  { id: 'total', label: 'Total Evidence', value: 4218, delta: '+12.4%', accent: 'blue' },
  { id: 'verified', label: 'Verified Files', value: 3894, delta: '+8.1%', accent: 'green' },
  { id: 'pending', label: 'Pending Reviews', value: 214, delta: '-3.2%', accent: 'cyan' },
  { id: 'tx', label: 'Blockchain Transactions', value: 9027, delta: '+15.7%', accent: 'blue' },
];

export const uploadTrend = {
  labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  data: [320, 410, 380, 512, 601, 734],
};

export const accessRequests = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  data: [42, 55, 38, 61, 49, 22, 18],
};

export const aiAlerts = {
  labels: ['Suspicious Login', 'Duplicate Upload', 'Unusual Time', 'Hash Mismatch'],
  data: [18, 9, 27, 4],
};

export const verificationSuccess = { verified: 3894, failed: 41 };

export const recentActivity = [
  { id: 'EVD-10231', name: 'CCTV_Footage_MG_Road.mp4', officer: 'Insp. R. Sharma', action: 'Uploaded', status: 'Verified', time: '2 min ago' },
  { id: 'EVD-10230', name: 'Fingerprint_Scan_04.png', officer: 'Dr. A. Khan (Forensics)', action: 'Analyzed', status: 'Verified', time: '18 min ago' },
  { id: 'EVD-10229', name: 'Weapon_Photo_Set.zip', officer: 'Insp. P. Nair', action: 'Accessed', status: 'Pending', time: '1 hr ago' },
  { id: 'EVD-10228', name: 'Witness_Statement.pdf', officer: 'Judge S. Verma', action: 'Reviewed', status: 'Verified', time: '3 hr ago' },
  { id: 'EVD-10227', name: 'DashCam_Clip_02.mp4', officer: 'Insp. R. Sharma', action: 'Uploaded', status: 'Flagged', time: '5 hr ago' },
];

export const notifications = [
  { id: 1, type: 'alert', text: 'Duplicate upload detected for EVD-10227', time: '5m' },
  { id: 2, type: 'success', text: 'EVD-10231 hash verified on-chain', time: '12m' },
  { id: 3, type: 'info', text: 'New investigator access request pending', time: '1h' },
];

export const custodyTimeline = [
  { role: 'Officer Upload', person: 'Insp. R. Sharma', time: '12 Jul 2026, 09:14', tx: '0x7ac1...4e2b', signature: 'SHA256:9f2a...c71d' },
  { role: 'Investigator Access', person: 'Insp. P. Nair', time: '12 Jul 2026, 14:02', tx: '0x91bd...aa30', signature: 'SHA256:2b7e...0a44' },
  { role: 'Forensic Analysis', person: 'Dr. A. Khan', time: '13 Jul 2026, 10:47', tx: '0xf03e...9c12', signature: 'SHA256:eb61...5f9a' },
  { role: 'Court Review', person: 'Court Admin', time: '15 Jul 2026, 16:20', tx: '0x22aa...7710', signature: 'SHA256:44d0...b823' },
  { role: 'Judge Verification', person: 'Judge S. Verma', time: '16 Jul 2026, 11:05', tx: '0xd4c9...0021', signature: 'SHA256:aa19...ff02' },
];

export const roles = [
  { name: 'Admin', permissions: ['Manage users', 'Configure system', 'View all logs', 'Revoke access'] },
  { name: 'Police', permissions: ['Upload evidence', 'View own case files', 'Request analysis'] },
  { name: 'Investigator', permissions: ['Access assigned cases', 'Annotate evidence', 'Request forensic review'] },
  { name: 'Judge', permissions: ['View verified evidence', 'Approve chain of custody', 'Digitally sign rulings'] },
  { name: 'Forensic Expert', permissions: ['Run analysis', 'Upload findings', 'Flag anomalies'] },
];

export const teamMembers = [
  { name: 'Aarav Mehta', role: 'Full-Stack & Blockchain Lead' },
  { name: 'Sneha Kulkarni', role: 'AI / ML Engineer' },
  { name: 'Rohan Deshpande', role: 'Backend & Security' },
  { name: 'Isha Patil', role: 'UI/UX Designer' },
];

export const aiCases = [
  { id: 'EVD-10227', issue: 'Duplicate Upload Detected', risk: 82 },
  { id: 'EVD-10219', issue: 'Unusual Access Time (03:14 AM)', risk: 64 },
  { id: 'EVD-10201', issue: 'Suspicious Login Location', risk: 91 },
  { id: 'EVD-10188', issue: 'Hash Mismatch on Re-verification', risk: 97 },
];
