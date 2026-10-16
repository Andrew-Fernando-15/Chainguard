import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Case from '../models/Case.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chainguard';

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
  let offset = 9;
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

// Full specification for ALL cases with their subfolders and files
const CASES_CONFIG = [
  // CASE-10239 (Showcase 1)
  {
    caseId: 'CASE-10239',
    caseDirName: 'CASE-10239_Murder_MG_Road',
    folders: ['Crime_Scene', 'Forensic_Reports', 'Statements'],
    files: [
      {
        folder: 'Forensic_Reports',
        fileName: 'Autopsy_Report_CASE-10239.pdf',
        officer: 'Aisha Khan',
        title: 'OFFICE OF THE CHIEF CORONER - AUTOPSY PROTOCOL',
        lines: [
          'Case ID: CASE-10239 (Murder at MG Road)',
          'Coroner: Dr. K. Radhakrishnan, MD (Forensic Medicine)',
          'Date: October 12, 2026, 06:00 IST',
          '--------------------------------------------------------------------------------',
          'FINDINGS: Sharp-force incision wound to thoracic cavity causing hemorrhage.',
          'Weapon match consistent with single-edged blade, approximately 7-8 inches.',
          'Toxicology screen negative for narcotics; blood alcohol 0.02%.',
          'STATUS: Homicide established. Time of death estimated 01:00 - 01:30 AM.'
        ]
      },
      {
        folder: 'Forensic_Reports',
        fileName: 'DNA_Report_CASE-10239.pdf',
        officer: 'Aisha Khan',
        title: 'STATE FORENSIC SCIENCE LABORATORY - DNA PROFILING',
        lines: [
          'Case ID: CASE-10239',
          'Specimen: Epithelial swabs recovered from victim shirt collar & weapon grip',
          'Examiner: Aisha Khan (Senior Forensic Geneticist)',
          '--------------------------------------------------------------------------------',
          '16 STR Loci Profiling: Match probability 1 in 4.2 billion against suspect K. Verma.',
          'Conclusion: Incontrovertible biological match with suspect sample #DNA-992.'
        ]
      },
      {
        folder: 'Forensic_Reports',
        fileName: 'Blood_Sample_CASE-10239.pdf',
        officer: 'Aisha Khan',
        title: 'SEROLOGY & BLOOD SPATTER ANALYSIS',
        lines: [
          'Case ID: CASE-10239',
          'Item: Blood spatter samples lifted from alley brick wall (Ex. BL-01 through BL-06)',
          'Examiner: Aisha Khan',
          '--------------------------------------------------------------------------------',
          'Grouping: Human Blood, Group O Positive.',
          'Impact angle: High-velocity arterial projection consistent with defensive struggle.'
        ]
      },
      {
        folder: 'Forensic_Reports',
        fileName: 'Fingerprint_CASE-10239.pdf',
        officer: 'Aisha Khan',
        title: 'LATENT FINGERPRINT IDENTIFICATION (AFIS)',
        lines: [
          'Case ID: CASE-10239',
          'Item: Latent prints lifted from discarded weapon handle using cyanoacrylate',
          'Examiner: Aisha Khan',
          '--------------------------------------------------------------------------------',
          'AFIS Match: Right index whorl pattern matching suspect records (Score: 98.4%).',
          'Examiner: Aisha Khan, FSL Expert'
        ]
      },
      {
        folder: 'Statements',
        fileName: 'Victim_Statement_CASE-10239.pdf',
        officer: 'Rahul Sharma',
        title: 'RECORDED DYING DECLARATION / VICTIM NOTES',
        lines: [
          'Case ID: CASE-10239',
          'Attending Officer: Rahul Sharma (Investigating Officer)',
          'Location: Bowring & Lady Curzon Hospital ICU',
          '--------------------------------------------------------------------------------',
          'Summary: Preliminary statement given to emergency triage officer prior to collapse.',
          'Identified perpetrator clothing description and altercation origin.'
        ]
      },
      {
        folder: 'Statements',
        fileName: 'Witness_Statement_CASE-10239.pdf',
        officer: 'Rahul Sharma',
        title: 'OFFICIAL WITNESS DEPOSITION (SEC 161 CrPC)',
        lines: [
          'Case ID: CASE-10239',
          'Deponent: Ramesh K. (Local Shopkeeper)',
          'Recording Officer: Rahul Sharma',
          '--------------------------------------------------------------------------------',
          'Witness observed two individuals fleeing towardIndiranagar Metro junction at 01:15 AM.',
          'Deposition verified and signed in presence of two independent witnesses.'
        ]
      }
    ]
  },

  // CASE-10231 (Showcase 2)
  {
    caseId: 'CASE-10231',
    caseDirName: 'CASE-10231_Cyber_Fraud',
    folders: ['Digital_Evidence', 'Documents'],
    files: [
      {
        folder: 'Digital_Evidence',
        fileName: 'Mobile_Phone_Data_CASE-10231.pdf',
        officer: 'Rahul Sharma',
        title: 'CYBER CRIME CELL - MOBILE EXTRACTION REPORT',
        lines: [
          'Case ID: CASE-10231 (Multi-State Phishing Syndicate)',
          'Examiner: Rahul Sharma',
          'Extraction: WhatsApp business database & spoofed banking application APKs.',
          'Result: 432 spoofed OTP SMS intercepts and bank credential database logs found.'
        ]
      },
      {
        folder: 'Digital_Evidence',
        fileName: 'Call_Detail_Records_CASE-10231.pdf',
        officer: 'Rahul Sharma',
        title: 'CDR & VOIP INTERCEPT TELECOMMUNICATION RECORD',
        lines: [
          'Case ID: CASE-10231',
          'Analyst: Rahul Sharma',
          'Target: Primary virtual PBX outbound dialer pool.',
          'Findings: Over 12,000 robocalls initiated targeting senior citizen bank accounts.'
        ]
      },
      {
        folder: 'Documents',
        fileName: 'FIR_Copy_CASE-10231.pdf',
        officer: 'Rahul Sharma',
        title: 'FIRST INFORMATION REPORT - CYBER POLICE STATION',
        lines: [
          'Case ID: CASE-10231',
          'Sections: 66C, 66D IT Act 2000, Sec 419/420 IPC.',
          'Reporting Officer: Rahul Sharma',
          'Summary: Formal complaint of fraudulent withdrawal of Rs 48,00,000 across 16 victims.'
        ]
      },
      {
        folder: 'Documents',
        fileName: 'Charge_Sheet_CASE-10231.pdf',
        officer: 'Rahul Sharma',
        title: 'FINAL REPORT / CHARGE SHEET UNDER SEC 173 CrPC',
        lines: [
          'Case ID: CASE-10231',
          'Submitting Officer: Rahul Sharma',
          'Accused: 4 Operators of Jamtara/Nuh phishing module.',
          'Status: 18 mule bank accounts frozen; Rs 31 Lakhs recovered in escrow.'
        ]
      }
    ]
  },

  // CASE-10232
  {
    caseId: 'CASE-10232',
    caseDirName: 'CASE-10232_Narcotics_Raid',
    folders: ['Forensic_Reports', 'Physical_Evidence'],
    files: [
      {
        folder: 'Forensic_Reports',
        fileName: 'Toxicology_Report_CASE-10232.pdf',
        officer: 'Aisha Khan',
        title: 'STATE CHEMICAL EXAMINER - TOXICOLOGY REPORT',
        lines: [
          'Case ID: CASE-10232 (Narcotics Raid #42)',
          'Examiner: Aisha Khan (Senior Chemical Analyst)',
          'Sample: White crystalline substance seized from container #NR-42',
          'Result: High-purity Methamphetamine (91.2% purity). Matches NDPS Schedule I.'
        ]
      },
      {
        folder: 'Forensic_Reports',
        fileName: 'Blood_Sample_CASE-10232.pdf',
        officer: 'Aisha Khan',
        title: 'FORENSIC DRUG SCREENING - BLOOD SERUM',
        lines: [
          'Case ID: CASE-10232',
          'Examiner: Aisha Khan',
          'Subject: Accused driver in transport intercept.',
          'Result: Positive for central nervous system stimulants; chain of custody sealed.'
        ]
      }
    ]
  },

  // CASE-10233
  {
    caseId: 'CASE-10233',
    caseDirName: 'CASE-10233_Arson',
    folders: ['Documents', 'Statements', 'Crime_Scene'],
    files: [
      {
        folder: 'Documents',
        fileName: 'FIR_Copy_CASE-10233.pdf',
        officer: 'Rahul Sharma',
        title: 'FIRST INFORMATION REPORT (CrPC SEC 154)',
        lines: [
          'Case ID: CASE-10233 (Industrial Warehouse Arson)',
          'Officer: Rahul Sharma (Investigating Officer)',
          'Location: Whitefield Cyber & Logistics Park',
          'Sections: 435/436 IPC (Mischief by Fire or Explosive Substance).'
        ]
      },
      {
        folder: 'Statements',
        fileName: 'Witness_Statement_CASE-10233.pdf',
        officer: 'Rahul Sharma',
        title: 'WITNESS STATEMENT (CrPC SEC 161)',
        lines: [
          'Case ID: CASE-10233',
          'Witness: Mohan R. (Night Security Guard, Gate 2)',
          'Officer: Rahul Sharma',
          'Summary: Observed two males carrying jerry cans into Loading Bay #3 at 23:20.'
        ]
      }
    ]
  },

  // CASE-10234
  {
    caseId: 'CASE-10234',
    caseDirName: 'CASE-10234_Corporate_Embezzlement',
    folders: ['Digital_Evidence', 'Documents'],
    files: [
      {
        folder: 'Digital_Evidence',
        fileName: 'Call_Detail_Records_CASE-10234.pdf',
        officer: 'Rahul Sharma',
        title: 'TELECOM CDR ANALYSIS REPORT',
        lines: [
          'Case ID: CASE-10234 (Corporate Fund Embezzlement)',
          'Officer: Rahul Sharma',
          'Summary: 34 incoming voice calls from offshore accounts during wire routing.'
        ]
      },
      {
        folder: 'Digital_Evidence',
        fileName: 'Mobile_Phone_Data_CASE-10234.pdf',
        officer: 'Rahul Sharma',
        title: 'DIGITAL FORENSIC EXTRACTION (UFED)',
        lines: [
          'Case ID: CASE-10234',
          'Officer: Rahul Sharma',
          'Artifacts: 14 encrypted spreadsheets tracking shell corporation wire transfers.'
        ]
      },
      {
        folder: 'Documents',
        fileName: 'Charge_Sheet_CASE-10234.pdf',
        officer: 'Rahul Sharma',
        title: 'POLICE FINAL REPORT / CHARGE SHEET (SEC 173 CrPC)',
        lines: [
          'Case ID: CASE-10234',
          'Officer: Rahul Sharma',
          'Charges: Sections 409, 420, 120B IPC for embezzlement of $1.8M USD.'
        ]
      }
    ]
  },

  // CASE-10235
  {
    caseId: 'CASE-10235',
    caseDirName: 'CASE-10235_Hit_and_Run',
    folders: ['Forensic_Reports', 'Documents'],
    files: [
      {
        folder: 'Forensic_Reports',
        fileName: 'Medical_Report_CASE-10235.pdf',
        officer: 'Priya Nair',
        title: 'MEDICO-LEGAL AUTOPSY & INJURY ASSESSMENT',
        lines: [
          'Case ID: CASE-10235 (Hit and Run Incident)',
          'Officer: Priya Nair',
          'Findings: Severe blunt-force vehicular impact trauma consistent with SUV bumper height.'
        ]
      }
    ]
  },

  // CASE-10236
  {
    caseId: 'CASE-10236',
    caseDirName: 'CASE-10236_Digital_Forgery',
    folders: ['Digital_Evidence', 'Documents'],
    files: [
      {
        folder: 'Digital_Evidence',
        fileName: 'Mobile_Phone_Data_CASE-10236.pdf',
        officer: 'Rahul Sharma',
        title: 'SMARTPHONE HARDWARE EXTRACTION',
        lines: [
          'Case ID: CASE-10236 (Digital Forgery Case)',
          'Officer: Rahul Sharma',
          'Findings: AI biometric face swaps and 112 counterfeit digital signature certificates.'
        ]
      },
      {
        folder: 'Digital_Evidence',
        fileName: 'Call_Detail_Records_CASE-10236.pdf',
        officer: 'Rahul Sharma',
        title: 'SUBSCRIBER CDR & IPDR LOGS',
        lines: [
          'Case ID: CASE-10236',
          'Officer: Rahul Sharma',
          'Findings: IP connections mapped to automated voting portal scraping.'
        ]
      },
      {
        folder: 'Documents',
        fileName: 'FIR_Copy_CASE-10236.pdf',
        officer: 'Rahul Sharma',
        title: 'FIRST INFORMATION REPORT - CYBER CELL',
        lines: [
          'Case ID: CASE-10236',
          'Officer: Rahul Sharma',
          'Sections: 66C/66D IT Act, 465/468/471 IPC.'
        ]
      }
    ]
  },

  // CASE-10237
  {
    caseId: 'CASE-10237',
    caseDirName: 'CASE-10237_Bank_Robbery',
    folders: ['Forensic_Reports', 'Crime_Scene'],
    files: [
      {
        folder: 'Forensic_Reports',
        fileName: 'Fingerprint_CASE-10237.pdf',
        officer: 'Aisha Khan',
        title: 'VAULT DOOR LATENT FINGERPRINT EXAMINATION',
        lines: [
          'Case ID: CASE-10237 (Bank Robbery Evidence)',
          'Examiner: Aisha Khan',
          'Item: Prints lifted from electronic combination keypad casing.'
        ]
      },
      {
        folder: 'Forensic_Reports',
        fileName: 'Ballistics_Report_CASE-10237.pdf',
        officer: 'Aisha Khan',
        title: 'FIREARMS & BALLISTICS IDENTIFICATION DIVISION',
        lines: [
          'Case ID: CASE-10237',
          'Examiner: Aisha Khan',
          'Findings: Discharged 9mm cartridge cases matched to Glock handgun mechanism.'
        ]
      }
    ]
  },

  // CASE-10238
  {
    caseId: 'CASE-10238',
    caseDirName: 'CASE-10238_Insider_Trading',
    folders: ['Digital_Evidence', 'Statements'],
    files: [
      {
        folder: 'Digital_Evidence',
        fileName: 'Call_Detail_Records_CASE-10238.pdf',
        officer: 'Priya Nair',
        title: 'FINANCIAL INTELLIGENCE CDR & TOWER LOGS',
        lines: [
          'Case ID: CASE-10238 (Insider Trading Suspicion)',
          'Officer: Priya Nair',
          'Findings: 18 calls exchanged 15 mins prior to quarterly earnings release.'
        ]
      },
      {
        folder: 'Digital_Evidence',
        fileName: 'Mobile_Phone_Data_CASE-10238.pdf',
        officer: 'Priya Nair',
        title: 'DEVICE FORENSIC ARTIFACT ANALYSIS',
        lines: [
          'Case ID: CASE-10238',
          'Officer: Priya Nair',
          'Findings: Screenshots of unreleased Q3 financial balance sheet.'
        ]
      },
      {
        folder: 'Statements',
        fileName: 'Witness_Statement_CASE-10238.pdf',
        officer: 'Priya Nair',
        title: 'WHISTLEBLOWER DEPOSITION & AFFIDAVIT',
        lines: [
          'Case ID: CASE-10238',
          'Officer: Priya Nair',
          'Deponent: Senior Compliance Officer.'
        ]
      }
    ]
  },

  // CASE-10240
  {
    caseId: 'CASE-10240',
    caseDirName: 'CASE-10240_Smuggling',
    folders: ['Physical_Evidence', 'Digital_Evidence', 'Crime_Scene'],
    files: [
      {
        folder: 'Physical_Evidence',
        fileName: 'Other_Physical_Evidence_CASE-10240.pdf',
        officer: 'Priya Nair',
        title: 'CONTRABAND SEIZURE MEMO & INVENTORY',
        lines: [
          'Case ID: CASE-10240 (Smuggling Operations Ring)',
          'Officer: Priya Nair',
          'Findings: 14 Gold Ingots (14.2 kg) and Rs 85 Lakhs in undeclared currency.'
        ]
      },
      {
        folder: 'Digital_Evidence',
        fileName: 'Call_Detail_Records_CASE-10240.pdf',
        officer: 'Priya Nair',
        title: 'SATELLITE & MARITIME CDR INTERCEPT',
        lines: [
          'Case ID: CASE-10240',
          'Officer: Priya Nair',
          'Findings: High-frequency communication with overseas logistics agency.'
        ]
      }
    ]
  },

  // CASE-10241
  {
    caseId: 'CASE-10241',
    caseDirName: 'CASE-10241_Kidnapping',
    folders: ['Digital_Evidence', 'Statements'],
    files: [
      {
        folder: 'Digital_Evidence',
        fileName: 'Mobile_Phone_Data_CASE-10241.pdf',
        officer: 'Priya Nair',
        title: 'VOIP & AUDIO INTERCEPT ANALYSIS',
        lines: [
          'Case ID: CASE-10241 (Kidnapping Ransom)',
          'Officer: Priya Nair',
          'Findings: Voice print matching suspect demanding Rs 5 Crore ransom.'
        ]
      },
      {
        folder: 'Digital_Evidence',
        fileName: 'Call_Detail_Records_CASE-10241.pdf',
        officer: 'Priya Nair',
        title: 'REAL-TIME CELL TOWER TRIANGULATION',
        lines: [
          'Case ID: CASE-10241',
          'Officer: Priya Nair',
          'Findings: Burner device route traced to border checkpoint.'
        ]
      },
      {
        folder: 'Statements',
        fileName: 'Victim_Statement_CASE-10241.pdf',
        officer: 'Priya Nair',
        title: 'VICTIM RESCUE STATEMENT UNDER SEC 164 CrPC',
        lines: [
          'Case ID: CASE-10241',
          'Officer: Priya Nair',
          'Deposition: Full details of abduction, hostage detention, and rescue operation.'
        ]
      }
    ]
  },

  // CASE-10242
  {
    caseId: 'CASE-10242',
    caseDirName: 'CASE-10242_Illegal_Weapons',
    folders: ['Forensic_Reports', 'Physical_Evidence', 'Crime_Scene'],
    files: [
      {
        folder: 'Forensic_Reports',
        fileName: 'Ballistics_Report_CASE-10242.pdf',
        officer: 'Aisha Khan',
        title: 'BALLISTICS WEAPONS EXAMINATION',
        lines: [
          'Case ID: CASE-10242 (Illegal Weapons Cache)',
          'Examiner: Aisha Khan',
          'Findings: Unlicensed country-made pistols and 45 live rounds cataloged.'
        ]
      },
      {
        folder: 'Physical_Evidence',
        fileName: 'Other_Physical_Evidence_CASE-10242.pdf',
        officer: 'Priya Nair',
        title: 'ARMORY SEIZURE INVENTORY & LOG',
        lines: [
          'Case ID: CASE-10242',
          'Officer: Priya Nair',
          'Findings: Lathe machining tools and silencer suppressors confiscated.'
        ]
      }
    ]
  },

  // CASE-10243
  {
    caseId: 'CASE-10243',
    caseDirName: 'CASE-10243_Cryptocurrency_Theft',
    folders: ['Digital_Evidence', 'Documents'],
    files: [
      {
        folder: 'Digital_Evidence',
        fileName: 'Mobile_Phone_Data_CASE-10243.pdf',
        officer: 'Priya Nair',
        title: 'HARDWARE WALLET & SEED EXTRACTION',
        lines: [
          'Case ID: CASE-10243 (Cryptocurrency Theft)',
          'Officer: Priya Nair',
          'Findings: 24-word recovery seed controlling $3.4M in Ethereum assets.'
        ]
      },
      {
        folder: 'Digital_Evidence',
        fileName: 'Call_Detail_Records_CASE-10243.pdf',
        officer: 'Priya Nair',
        title: 'RPC BLOCKCHAIN NODE IP CORRELATION',
        lines: [
          'Case ID: CASE-10243',
          'Officer: Priya Nair',
          'Findings: IP addresses match cellular hotspot during smart contract exploitation.'
        ]
      },
      {
        folder: 'Documents',
        fileName: 'FIR_Copy_CASE-10243.pdf',
        officer: 'Priya Nair',
        title: 'FIRST INFORMATION REPORT - CYBER CRIMES',
        lines: [
          'Case ID: CASE-10243',
          'Officer: Priya Nair',
          'Sections: 43/66 IT Act & 420 IPC.'
        ]
      }
    ]
  },

  // CASE-10244
  {
    caseId: 'CASE-10244',
    caseDirName: 'CASE-10244_Serial_Burglaries',
    folders: ['Forensic_Reports', 'Statements', 'Crime_Scene'],
    files: [
      {
        folder: 'Forensic_Reports',
        fileName: 'Fingerprint_CASE-10244.pdf',
        officer: 'Aisha Khan',
        title: 'LATENT PRINT AFIS IDENTIFICATION',
        lines: [
          'Case ID: CASE-10244 (Serial Burglaries South)',
          'Examiner: Aisha Khan',
          'Findings: 99.7% correlation with registered repeat offender print.'
        ]
      },
      {
        folder: 'Statements',
        fileName: 'Witness_Statement_CASE-10244.pdf',
        officer: 'Priya Nair',
        title: 'NEIGHBORHOOD WITNESS DEPOSITION',
        lines: [
          'Case ID: CASE-10244',
          'Officer: Priya Nair',
          'Deposition: Visual sighting of suspect scaling wall at 02:20 AM.'
        ]
      }
    ]
  },

  // CASE-10245
  {
    caseId: 'CASE-10245',
    caseDirName: 'CASE-10245_Counterfeit_Currency',
    folders: ['Physical_Evidence', 'Documents'],
    files: [
      {
        folder: 'Physical_Evidence',
        fileName: 'Other_Physical_Evidence_CASE-10245.pdf',
        officer: 'Priya Nair',
        title: 'COUNTERFEIT NOTE TECHNICAL EXAMINATION',
        lines: [
          'Case ID: CASE-10245 (Counterfeit Currency Network)',
          'Officer: Priya Nair',
          'Findings: 2,500 fake Rs 500 notes lacking UV fluorescent thread and intaglio print.'
        ]
      },
      {
        folder: 'Documents',
        fileName: 'FIR_Copy_CASE-10245.pdf',
        officer: 'Priya Nair',
        title: 'FIRST INFORMATION REPORT (EOW)',
        lines: [
          'Case ID: CASE-10245',
          'Officer: Priya Nair',
          'Sections: 489A through 489D IPC.'
        ]
      },
      {
        folder: 'Documents',
        fileName: 'Charge_Sheet_CASE-10245.pdf',
        officer: 'Priya Nair',
        title: 'CHARGE SHEET UNDER SEC 173 CrPC',
        lines: [
          'Case ID: CASE-10245',
          'Officer: Priya Nair',
          'Findings: Offset printing plates and synthetic currency inks seized.'
        ]
      }
    ]
  }
];

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  const baseDemoDir = path.join(process.cwd(), 'Demo_Evidence');
  const flatDemoDir = path.join(process.cwd(), 'Demo_Evidence_Files');

  if (!fs.existsSync(baseDemoDir)) fs.mkdirSync(baseDemoDir, { recursive: true });
  if (!fs.existsSync(flatDemoDir)) fs.mkdirSync(flatDemoDir, { recursive: true });

  let totalFiles = 0;

  for (const caseCfg of CASES_CONFIG) {
    // 1. Update Case in MongoDB with its designated folders
    await Case.updateOne(
      { caseId: caseCfg.caseId },
      { $set: { folders: caseCfg.folders } },
      { upsert: false }
    );
    console.log(`\n📂 [${caseCfg.caseId}] Configured Folders in DB: [${caseCfg.folders.join(', ')}]`);

    // 2. Create subfolders and files inside Demo_Evidence/<caseDirName>/<folder>/
    const caseDiskDir = path.join(baseDemoDir, caseCfg.caseDirName);
    if (!fs.existsSync(caseDiskDir)) fs.mkdirSync(caseDiskDir, { recursive: true });

    // Also remove any flat files that might be sitting directly in caseDiskDir
    for (const f of fs.readdirSync(caseDiskDir)) {
      const p = path.join(caseDiskDir, f);
      if (fs.statSync(p).isFile() && f.endsWith('.pdf')) {
        fs.unlinkSync(p);
      }
    }

    // Create each subfolder
    for (const folderName of caseCfg.folders) {
      const folderPath = path.join(caseDiskDir, folderName);
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    }

    // Generate each file into its designated subfolder
    for (const fileDef of caseCfg.files) {
      const targetFolderDir = path.join(caseDiskDir, fileDef.folder);
      if (!fs.existsSync(targetFolderDir)) fs.mkdirSync(targetFolderDir, { recursive: true });

      const targetFilePath = path.join(targetFolderDir, fileDef.fileName);
      const flatFilePath = path.join(flatDemoDir, fileDef.fileName);

      const buffer = generateSimplePDF(fileDef.title, [
        `Case: ${caseCfg.caseId} | Assigned Officer: ${fileDef.officer}`,
        ...fileDef.lines
      ]);

      fs.writeFileSync(targetFilePath, buffer);
      fs.writeFileSync(flatFilePath, buffer);
      totalFiles++;

      console.log(`   📄 Created: ${caseCfg.caseDirName}/${fileDef.folder}/${fileDef.fileName} (Officer: ${fileDef.officer})`);
    }
  }

  console.log(`\n🎉 DONE! Configured all ${CASES_CONFIG.length} cases with organized folders in MongoDB and generated ${totalFiles} PDF files into their respective case subfolders.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
