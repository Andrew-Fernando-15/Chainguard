export const roles = [
  { name: 'CBI', permissions: ['Manage users', 'View all cases globally', 'Override status', 'Full system visibility', 'Revoke access'] },
  { name: 'Police', permissions: ['Upload evidence', 'View own case files', 'Request analysis'] },
  { name: 'Investigator', permissions: ['Access assigned cases', 'Annotate evidence', 'Request forensic review'] },
  { name: 'Judge', permissions: ['View verified evidence', 'Approve chain of custody', 'Digitally sign rulings'] },
  { name: 'Forensic Expert', permissions: ['Run analysis', 'Upload findings', 'Flag anomalies'] },
];

export const teamMembers = [
  { name: 'Andrew Fernando', role: 'Full-Stack Developer' },
  { name: 'Divyadarshini Kumar', role: 'UI/UX Designer' },
  { name: 'Anirudh Iyer', role: 'Backend & Security' },
  { name: 'Mayur Ganiga', role: 'AI / ML Engineer' },
];
