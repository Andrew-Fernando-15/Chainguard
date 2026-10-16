import fs from 'fs';
import path from 'path';

// Valid single-page PDF generator without any external dependencies
function generateSimplePDF(title, lines) {
  const contentStream = [
    'BT',
    '/F1 18 Tf',
    '50 740 Td',
    `(${escapePDF(title)}) Tj`,
    '/F1 10 Tf',
    '0 -25 Td',
    ...lines.map(line => `0 -16 Td (${escapePDF(line)}) Tj`),
    'ET'
  ].join('\n');

  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`,
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

// Tree specification with distinct content per file
const DEMO_STRUCTURE = [
  // CASE-10239: Murder at MG Road
  {
    relPath: 'CASE-10239_Murder_MG_Road/02_Forensic_Reports/Autopsy_Report_CASE-10239.pdf',
    title: 'OFFICE OF THE CHIEF CORONER - AUTOPSY PROTOCOL',
    lines: [
      'Case ID: CASE-10239 (Murder at MG Road)',
      'Subject: Post-Mortem Medical Examination',
      'Coroner: Dr. K. Radhakrishnan, MD (Forensic Medicine)',
      'Date of Examination: October 12, 2026, 06:00 IST',
      '--------------------------------------------------------------------------------',
      'EXTERNAL & INTERNAL FINDINGS:',
      '- Penetrating trauma identified in the thoracic cavity measuring 4.2 cm in width.',
      '- Incision path consistent with single-edged blade entry at approximately 30 degrees.',
      '- No defensive fractures identified on upper extremities.',
      '- Estimated Time Since Death (TSD): 5-7 hours prior to examination.',
      '--------------------------------------------------------------------------------',
      'CONCLUSION: Cause of death verified as acute hypovolemic shock.',
      'Cryptographic Seal: ChainGuard Blockchain Verified Digest.'
    ]
  },
  {
    relPath: 'CASE-10239_Murder_MG_Road/02_Forensic_Reports/DNA_Report_CASE-10239.pdf',
    title: 'CENTRAL FORENSIC SCIENCE LABORATORY - DNA FINGERPRINTING',
    lines: [
      'Case ID: CASE-10239',
      'Evidence Reference: Specimen DNA-10239-01 (Weapon Swab vs Reference A)',
      'Lead Analyst: Aisha Khan (Forensic Expert)',
      '--------------------------------------------------------------------------------',
      'ELECTROPHEROGRAM & STR ALLELIC PROFILING:',
      '- Locus D3S1358: [15, 16]   |   Locus vWA: [17, 18]',
      '- Locus FGA: [22, 24]       |   Locus D8S1179: [13, 14]',
      '- Locus D21S11: [29, 31.2]  |   Amelogenin: [X, Y]',
      '--------------------------------------------------------------------------------',
      'STATISTICAL EVALUATION:',
      'The DNA recovered from the crime scene weapon matches the suspect reference profile',
      'with an estimated match probability exceeding 1 in 14.8 billion.',
      'Status: ADMISSIBLE UNDER INDIAN EVIDENCE ACT.'
    ]
  },
  {
    relPath: 'CASE-10239_Murder_MG_Road/02_Forensic_Reports/Blood_Sample_CASE-10239.pdf',
    title: 'SEROLOGY DIVISION - BLOOD ANALYSIS & GROUPING',
    lines: [
      'Case ID: CASE-10239',
      'Item Description: Dried Blood Stain Scrapings (Exhibits BS-1 to BS-4)',
      'Testing Laboratory: Forensic Serology Unit',
      '--------------------------------------------------------------------------------',
      'LABORATORY OBSERVATIONS:',
      '- Kastle-Meyer (Phenolphthalein) Presumptive Test: Positive (Immediate Pink).',
      '- Takayama Microcrystal Test: Characteristic Hemochromogen crystals observed.',
      '- ABO Blood Group Typing: Group O Positive (Rh+ confirmed).',
      '- Enzymatic screen: Haptoglobin Type 2-1 identified.',
      '--------------------------------------------------------------------------------',
      'DISPOSITION: Stored in refrigerated vault at -20 degrees Celsius.'
    ]
  },
  {
    relPath: 'CASE-10239_Murder_MG_Road/02_Forensic_Reports/Fingerprint_CASE-10239.pdf',
    title: 'DACTYLOSCOPY BUREAU - LATENT FINGERPRINT MATCH REPORT',
    lines: [
      'Case ID: CASE-10239',
      'Latent Lift Surface: Glass Bottleneck recovered at alley scene',
      'Development Technique: Black Magnetic Powder & Cyanoacrylate Fuming',
      '--------------------------------------------------------------------------------',
      'RIDGE DETAIL & MINUTIAE EXTRACTION:',
      '- Pattern Classification: Left Slanted Loop',
      '- Core-to-Delta Ridge Count: 14 Ridges',
      '- Identifiable Characteristics: 8 bifurcations, 6 ridge endings, 2 dots',
      '--------------------------------------------------------------------------------',
      'AFIS SEARCH RESULT: 100% concordance with right index finger of registered record.',
      'Examiner: Aisha Khan'
    ]
  },
  {
    relPath: 'CASE-10239_Murder_MG_Road/03_Statements/Victim_Statement_CASE-10239.pdf',
    title: 'RECORDED DYING DECLARATION & VICTIM ADMISSION',
    lines: [
      'Case ID: CASE-10239 (Murder at MG Road)',
      'Declaration Under: Section 32(1) Indian Evidence Act',
      'Attending Magistrate / Medical Officer: Dr. S. Rao / Exec. Magistrate',
      'Location: Casualty Trauma Ward, Victoria Hospital',
      '--------------------------------------------------------------------------------',
      'DEPOSITION EXCERPT:',
      '"I was intercepted near the Metro pillar #142 at approximately 01:10 AM.',
      'Two men demanded the ledger documents. When I refused, the taller man brandished',
      'a dark metallic blade. They escaped toward the residential backstreet."',
      '--------------------------------------------------------------------------------',
      'CERTIFICATE OF FIT MENTAL STATE: Certified by attending physician prior to recording.',
      'Thumb impression affixed in presence of two attending nurses.'
    ]
  },
  {
    relPath: 'CASE-10239_Murder_MG_Road/03_Statements/Witness_Statement_CASE-10239.pdf',
    title: 'STATEMENT OF KEY EYE-WITNESS (SECTION 161 CrPC)',
    lines: [
      'Case ID: CASE-10239',
      'Witness: Ramesh K., Age 42 (Shopkeeper, MG Road Sector 4)',
      'Recording Officer: Rahul Sharma (Investigating Officer)',
      '--------------------------------------------------------------------------------',
      'STATEMENT DETAILS:',
      '"At about 01:15 AM I heard sharp shouting from the adjoining alley. I walked out',
      'and observed a motorcycle speeding away without rear license plates. I noted the rider',
      'wearing a distinctive red safety helmet with tinted visor."',
      '--------------------------------------------------------------------------------',
      'CORROBORATION: CCTV camera installed across street verified timeline to within 30 seconds.',
      'Signed and verified by Investigating Officer Rahul Sharma.'
    ]
  },

  // CASE-10231: Cyber Fraud
  {
    relPath: 'CASE-10231_Cyber_Fraud/01_Digital_Evidence/Mobile_Phone_Data_CASE-10231.pdf',
    title: 'DIGITAL FORENSIC EXTRACTION REPORT - MOBILE DEVICE',
    lines: [
      'Case ID: CASE-10231 (Cyber Fraud Investigation)',
      'Hardware Extracted: OnePlus 11 (IMEI: 863294058291049)',
      'Acquisition Tool: Cellebrite UFED Physical Extraction v8.4',
      'Examiner: Rahul Sharma',
      '--------------------------------------------------------------------------------',
      'DATA ARTIFACTS RECOVERED:',
      '1. Encrypted messaging database decrypted using recovered hardware passkey.',
      '2. Banking Trojan APK identified in hidden directory /sdcard/.system_cache/.',
      '3. Unauthorized OTP redirection logs dated between Oct 01 and Oct 08, 2026.',
      '4. Total 24 unauthorized funds transfers logged across 6 mule accounts.',
      '--------------------------------------------------------------------------------',
      'Integrity: SHA-256 Bitstream image generated before logical extraction.'
    ]
  },
  {
    relPath: 'CASE-10231_Cyber_Fraud/01_Digital_Evidence/Call_Detail_Records_CASE-10231.pdf',
    title: 'TELECOM SERVICE PROVIDER - CALL DETAIL RECORDS (CDR)',
    lines: [
      'Case ID: CASE-10231',
      'Target MSISDN: +91 98450 XXXXX (Under Section 91 CrPC notice)',
      'Carrier: Bharti Airtel Ltd / Karnataka LSA',
      'Period: 01-Oct-2026 00:00:00 to 09-Oct-2026 23:59:59',
      '--------------------------------------------------------------------------------',
      'TRAFFIC PATTERN ANALYSIS:',
      '- High-frequency outbound calls: 142 short-duration calls between 23:00 and 04:00.',
      '- Cell Tower Azimuth: Sector 2, Koramangala Hub (Cell ID: 404-45-12042).',
      '- Geo-locational coordinates consistent with phishing call center apartment.',
      '--------------------------------------------------------------------------------',
      'Certified under Section 65B of Indian Evidence Act by Nodal Officer.'
    ]
  },
  {
    relPath: 'CASE-10231_Cyber_Fraud/02_Documents/FIR_Copy_CASE-10231.pdf',
    title: 'FIRST INFORMATION REPORT (FIRST SCHEDULE, CrPC)',
    lines: [
      'Police Station: Cyber Crime Police Station, Bangalore City',
      'FIR Number: 0142/2026   |   Date: 09-Oct-2026 17:30 IST',
      'Acts & Sections: Sections 66C, 66D IT Act 2000 & 420, 120B IPC',
      'Complainant: Axis Digital Security Cell',
      '--------------------------------------------------------------------------------',
      'BRIEF DESCRIPTION OF OFFENCE:',
      'Systematic social engineering and unauthorized remote banking account intrusion.',
      'Cumulative fraudulent dissipation: INR 48,50,000 across inter-state bank networks.',
      '--------------------------------------------------------------------------------',
      'Action Taken: Allotted to Investigating Officer Rahul Sharma for full inquiry.'
    ]
  },
  {
    relPath: 'CASE-10231_Cyber_Fraud/02_Documents/Charge_Sheet_CASE-10231.pdf',
    title: 'FINAL POLICE REPORT / CHARGE SHEET (SECTION 173 CrPC)',
    lines: [
      'Court: Principal City Civil & Sessions Judge, Bangalore',
      'FIR Reference: 0142/2026 (Case ID: CASE-10231)',
      'Submitting Officer: Rahul Sharma (Investigating Officer)',
      '--------------------------------------------------------------------------------',
      'ACCUSED PARTICULARS & CHARGES:',
      '- Accused #1: Rohit Mehta (Organized Phishing Kingpin)',
      '- Charges Framed: Criminal Conspiracy (120B), Cheating by Personation (66D IT Act).',
      '- Prosecution Witnesses Listed: 12 witnesses including Bank Nodal Officers.',
      '- Material Objects Attached: 4 Laptops, 14 SIM cards, 8 passbooks.',
      '--------------------------------------------------------------------------------',
      'Prayer: Accused be summoned and tried in accordance with law.'
    ]
  },

  // CASE-10232: Narcotics Raid
  {
    relPath: 'CASE-10232_Narcotics_Raid/Toxicology_Report_CASE-10232.pdf',
    title: 'NARCOTICS & PSYCHOTROPIC SUBSTANCES LABORATORY REPORT',
    lines: [
      'Case ID: CASE-10232 (Narcotics Raid #42)',
      'Investigating Officers: Priya Nair & Aisha Khan',
      'Seized Exhibit: Brown granular substance marked Parcel N-42',
      '--------------------------------------------------------------------------------',
      'CHEMICAL IDENTIFICATION & CHROMATOGRAPHY:',
      '- Marquis Reagent: Immediate purple-to-black color reaction.',
      '- Cobalt Thiocyanate Test: Negative for cocaine alkaloid.',
      '- High-Performance Liquid Chromatography (HPLC): Confirmed Heroin (Diacetylmorphine).',
      '- Purity Concentration: 72.4% pharmaceutical grade purity.',
      '--------------------------------------------------------------------------------',
      'Weight Verified in Presence of Magistrate: 1.25 Kilograms (Commercial Quantity).'
    ]
  },
  {
    relPath: 'CASE-10232_Narcotics_Raid/Blood_Sample_CASE-10232.pdf',
    title: 'TOXICOLOGICAL BLOOD ANALYSIS - NARCOTICS PROFILE',
    lines: [
      'Case ID: CASE-10232',
      'Subject: Suspect in Custody Blood Screen',
      'Testing Officer: Aisha Khan (Forensic Expert)',
      '--------------------------------------------------------------------------------',
      'BLOOD CONCENTRATION METRICS:',
      '- Free Morphine: 45 ng/mL (Indicative of recent opiate consumption).',
      '- Methamphetamine: Not Detected (<5 ng/mL).',
      '- Cannabis (THC-COOH): 18 ng/mL (Positive for secondary cannabis exposure).',
      '--------------------------------------------------------------------------------',
      'Conclusion: Subject was actively under the influence of scheduled narcotic substance.'
    ]
  },

  // CASE-10235: Hit and Run
  {
    relPath: 'CASE-10235_Hit_and_Run/Medical_Report_CASE-10235.pdf',
    title: 'MEDICO-LEGAL CLINICAL CASE RECORD (MLC)',
    lines: [
      'Case ID: CASE-10235 (Hit and Run Incident)',
      'Hospital: Government General Hospital Casualty Unit',
      'Examining Medical Officer: Dr. M. Jayaram, Casualty Medical Officer',
      'Investigating Officers: Priya Nair, Aisha Khan',
      '--------------------------------------------------------------------------------',
      'INJURY DETAILS & VEHICULAR IMPACT TRAUMA:',
      '1. Compound comminuted fracture of right tibia-fibula with significant soft tissue laceration.',
      '2. Multiple contusions across left pelvic brim consistent with bumper bar height (48 cm).',
      '3. Road rash abrasions across dorsal surface of forearm.',
      '--------------------------------------------------------------------------------',
      'Nature of Injuries: Grievous, caused by blunt vehicular impact force.'
    ]
  },

  // CASE-10237: Bank Robbery
  {
    relPath: 'CASE-10237_Bank_Robbery/Fingerprint_CASE-10237.pdf',
    title: 'BANK VAULT LATENT FINGERPRINT ANALYSIS',
    lines: [
      'Case ID: CASE-10237 (Bank Robbery Evidence)',
      'Location: State Bank Commercial Branch Safe Deposit Vault',
      'Investigating Officer: Aisha Khan',
      '--------------------------------------------------------------------------------',
      'FINGERPRINT EVIDENCE SUMMARY:',
      '- Latent print lifted from electronic locker panel keypad digit #4 and #7.',
      '- Powder contrast: Silver metallic magnetic flake developer.',
      '- Minutiae Points: 16 individual characteristics recorded in AFIS.',
      '--------------------------------------------------------------------------------',
      'Cross-Reference: Matches previously convicted vault specialist on police record.'
    ]
  },
  {
    relPath: 'CASE-10237_Bank_Robbery/Ballistics_Report_CASE-10237.pdf',
    title: 'FIREARMS & BALLISTICS IDENTIFICATION DIVISION',
    lines: [
      'Case ID: CASE-10237',
      'Recovered Evidence: Discharged cartridge case (Ex. C-01) & lead bullet slug (Ex. S-01)',
      'Examiner: Aisha Khan',
      '--------------------------------------------------------------------------------',
      'MICROSCOPIC COMPARISON & STRIATIONS:',
      '- Caliber: 9x19mm Parabellum standard.',
      '- Firing Pin Impression: Rectangular Glock-type hemispherical strike.',
      '- Rifling Characteristics: 6 grooves, right-hand twist with polygonal pattern.',
      '--------------------------------------------------------------------------------',
      'CONCLUSION: Both cartridge cases were discharged from the same firearm mechanism.'
    ]
  }
];

const baseDir = path.join(process.cwd(), 'Demo_Evidence');

console.log('Generating Demo_Evidence folder hierarchy and PDFs...');

let count = 0;
for (const item of DEMO_STRUCTURE) {
  const fullPath = path.join(baseDir, item.relPath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const pdfBuffer = generateSimplePDF(item.title, item.lines);
  fs.writeFileSync(fullPath, pdfBuffer);
  count++;
  console.log(`✅ [${count}/${DEMO_STRUCTURE.length}] Generated: ${item.relPath}`);
}

console.log(`\n🎉 Successfully created all ${count} demo PDF files in: ${baseDir}`);
