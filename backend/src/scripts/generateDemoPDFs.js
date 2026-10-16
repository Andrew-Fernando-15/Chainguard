import fs from 'fs';
import path from 'path';

// Minimal valid single-page PDF generator without any external dependencies
function generateSimplePDF(title, lines) {
  const contentStream = [
    'BT',
    '/F1 20 Tf',
    '50 740 Td',
    `(${escapePDF(title)}) Tj`,
    '/F1 11 Tf',
    '0 -30 Td',
    ...lines.map(line => `0 -18 Td (${escapePDF(line)}) Tj`),
    'ET'
  ].join('\n');

  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  const objects = [
    // 1: Catalog
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    // 2: Pages
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    // 3: Page
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
    // 4: Contents stream
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`,
    // 5: Font
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj'
  ];

  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  let offset = 9; // length of "%PDF-1.4\n"
  const offsets = [];

  for (const obj of objects) {
    offsets.push(offset);
    offset += Buffer.byteLength(obj + '\n', 'utf8');
  }

  for (const off of offsets) {
    xref += String(off).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;

  return Buffer.from(['%PDF-1.4', ...objects, xref, trailer].join('\n'));
}

function escapePDF(str) {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

const DEMO_FILES = [
  // 1. Crime Scene files
  {
    fileName: 'Crime_Scene_Investigation_Report.pdf',
    folder: 'Crime_Scene',
    title: 'CENTRAL FORENSIC EVIDENCE DIVISION',
    lines: [
      'Case ID: CASE-10239 (Murder at MG Road)',
      'Document: Preliminary Crime Scene Inspection Report',
      'Date of Investigation: October 12, 2026',
      'Investigating Officer: Rahul Sharma (Investigating Officer)',
      'Location: MG Road Alleyway, Sector 4, Bangalore',
      '--------------------------------------------------------------------------------',
      'SUMMARY OF OBSERVATIONS:',
      '1. Physical perimeter secured at 02:45 AM by patrol squad.',
      '2. Secondary weapon markings identified near north wall.',
      '3. Shoe imprint matching size 10 work boot cataloged under evidence #CS-01.',
      '4. Broken glass shards collected from the east drainage entry point.',
      '--------------------------------------------------------------------------------',
      'CHAIN OF CUSTODY VERIFICATION:',
      'Encrypted by ChainGuard AES-256 Engine with immutable SHA-256 hash record.',
      'Tamper-evident status: VERIFIED & SEALED.'
    ]
  },
  {
    fileName: 'Weapon_Recovery_Analysis.pdf',
    folder: 'Crime_Scene',
    title: 'WEAPON RECOVERY & BALLISTICS MEMO',
    lines: [
      'Case ID: CASE-10239',
      'Evidence Item: Metallic Knife (8-inch serrated edge)',
      'Recovery Coordinates: Lat 12.9716 N, Lon 77.5946 E',
      'Secured By: Rahul Sharma',
      '--------------------------------------------------------------------------------',
      'PHYSICAL CHARACTERISTICS:',
      '- Total Length: 20.3 cm',
      '- Blade Material: High-carbon tempered steel',
      '- Handle: Synthetic black polymer with visible friction wear',
      '- Latent biological trace detected on the inner hilt recess',
      '--------------------------------------------------------------------------------',
      'STATUS: Transfer to Forensic Laboratory for DNA & Blood Group Analysis.'
    ]
  },

  // 2. Forensic Reports
  {
    fileName: 'DNA_Profiling_Report.pdf',
    folder: 'Forensic_Reports',
    title: 'STATE FORENSIC SCIENCE LABORATORY - DNA DIVISION',
    lines: [
      'Case Reference: CASE-10239',
      'Subject Profile: Victim Identification & Unknown Source B',
      'Lead Forensic Expert: Aisha Khan',
      '--------------------------------------------------------------------------------',
      'STR LOCUS ANALYSIS SUMMARY:',
      '- Locus D3S1358: [15, 16]',
      '- Locus vWA: [17, 18]',
      '- Locus FGA: [22, 24]',
      '- Locus D8S1179: [13, 14]',
      '--------------------------------------------------------------------------------',
      'CONCLUSION:',
      'The biological samples recovered from weapon exhibit #01 demonstrate an unequivocal',
      'match with specimen profile Reference-A with a random match probability > 1 in 10 billion.'
    ]
  },
  {
    fileName: 'Toxicology_and_Blood_Analysis.pdf',
    folder: 'Forensic_Reports',
    title: 'COMPREHENSIVE CHEMICAL TOXICOLOGY REPORT',
    lines: [
      'Case ID: CASE-10239',
      'Laboratory Code: FSL-TOX-2026-904',
      'Examined By: Aisha Khan (Senior Forensic Analyst)',
      '--------------------------------------------------------------------------------',
      'METHODOLOGY:',
      'Gas Chromatography - Mass Spectrometry (GC-MS) & Liquid Chromatography (LC-MS/MS).',
      '--------------------------------------------------------------------------------',
      'FINDINGS:',
      '1. Ethanol screen: Negative (<0.01 g/dL).',
      '2. Sedative compounds: Trace synthetic benzamide detected in gastric residue.',
      '3. Heavy metals screen: Within normal physiological ranges.',
      '--------------------------------------------------------------------------------',
      'REMARKS: Report submitted under Section 293 of the Code of Criminal Procedure.'
    ]
  },
  {
    fileName: 'Fingerprint_Comparison_Chart.pdf',
    folder: 'Forensic_Reports',
    title: 'AUTOMATED FINGERPRINT IDENTIFICATION SYSTEM (AFIS)',
    lines: [
      'Case: CASE-10239',
      'Latent Print Lift #LP-04 vs Central Police Registry Database',
      '--------------------------------------------------------------------------------',
      'MINUTIAE MATCH METRICS:',
      '- Bifurcations identified: 14 matching points',
      '- Ridge endings verified: 12 matching points',
      '- AFIS Confidence Score: 98.4%',
      '--------------------------------------------------------------------------------',
      'STATUS: Verified match against registered offender record.',
      'Examiner Signature: Aisha Khan, FSL Expert'
    ]
  },

  // 3. Statements
  {
    fileName: 'Primary_Witness_Statement.pdf',
    folder: 'Statements',
    title: 'OFFICIAL WITNESS DEPOSITION UNDER SECTION 161 CrPC',
    lines: [
      'Case ID: CASE-10239 (Murder at MG Road)',
      'Deponent: Ramesh K. (Shopkeeper, Sector 4 MG Road)',
      'Recorded By: Rahul Sharma (Investigating Officer)',
      'Date & Time: October 12, 2026, 09:30 IST',
      '--------------------------------------------------------------------------------',
      'DEPOSITION TRANSCRIPT:',
      '"I was closing my store shutters at approximately 01:15 AM when I heard raised voices',
      'coming from the alley across the roadway. I observed two individuals fleeing toward',
      'the metro construction junction. One wore a dark grey jacket and carried a backpack."',
      '--------------------------------------------------------------------------------',
      'VERIFICATION:',
      'Read over and confirmed as accurate by deponent in presence of two independent witnesses.'
    ]
  },
  {
    fileName: 'Suspect_Interrogation_Record.pdf',
    folder: 'Statements',
    title: 'POLICE CUSTODY INTERROGATION SUMMARY',
    lines: [
      'Case ID: CASE-10239',
      'Interrogated Person: Suspect K. Verma',
      'Supervising Officers: Rahul Sharma & Priya Nair',
      'Location: Central Police Station Interrogation Room #2',
      '--------------------------------------------------------------------------------',
      'KEY ADMISSIONS & TIMELINE ALIBI INQUIRY:',
      '- Suspect claims to have been in Indiranagar between 00:00 and 02:00 AM.',
      '- Call Detail Records (CDR) contradict claim, placing device near MG Road cell tower.',
      '- Video surveillance timestamp: 01:22 AM corroborates physical presence in vicinity.',
      '--------------------------------------------------------------------------------',
      'RECORDING STATUS: Audio/Video backed up into ChainGuard tamper-proof storage.'
    ]
  }
];

// Target directory for demo sample PDFs
const outputDir = path.join(process.cwd(), 'sample_evidence_pdfs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Generating demo PDF files...');
DEMO_FILES.forEach(item => {
  const pdfBuffer = generateSimplePDF(item.title, item.lines);
  const filePath = path.join(outputDir, item.fileName);
  fs.writeFileSync(filePath, pdfBuffer);
  console.log(`✅ Created: ${item.fileName} (${(pdfBuffer.length / 1024).toFixed(1)} KB) -> Intended Folder: ${item.folder}`);
});

console.log(`\n🎉 Success! All demo PDF files created in: ${outputDir}`);
