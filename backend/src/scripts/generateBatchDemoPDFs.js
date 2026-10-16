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

const PDF_DEFINITIONS = [
  // CASE-10233: Arson
  {
    folder: 'CASE-10233_Arson',
    fileName: 'FIR_Copy_CASE-10233.pdf',
    officer: 'Rahul Sharma',
    title: 'FIRST INFORMATION REPORT (CrPC SEC 154)',
    lines: [
      'Case ID: CASE-10233 (Industrial Warehouse Arson)',
      'Police Station: Whitefield Cyber & Crime Precinct',
      'Investigating Officer: Rahul Sharma (Investigating Officer)',
      'Date of Occurrence: September 28, 2026, 23:45 IST',
      '--------------------------------------------------------------------------------',
      'INCIDENT OVERVIEW:',
      'Commercial warehouse structure engulfed in multi-point accelerant fire.',
      'Complainant: Apex Logistics Facilities Security Division.',
      'Suspected Offense: Sections 435/436 IPC (Mischief by Fire or Explosive Substance).',
      '--------------------------------------------------------------------------------',
      'INITIAL INQUIRY:',
      'Thermal imaging indicates distinct ignition sources on East Loading Dock #3.',
      'Physical samples preserved for gas chromatography accelerant analysis.',
      'Tamper-Proof Registry: ChainGuard Forensic Vault ID #FIR-10233.'
    ]
  },
  {
    folder: 'CASE-10233_Arson',
    fileName: 'Witness_Statement_CASE-10233.pdf',
    officer: 'Rahul Sharma',
    title: 'OFFICIAL WITNESS STATEMENT (SEC 161 CrPC)',
    lines: [
      'Case ID: CASE-10233 (Arson Investigation)',
      'Witness: Mohan R. (Night Security Guard, Gate 2)',
      'Investigating Officer: Rahul Sharma',
      'Date of Recording: September 29, 2026, 08:30 IST',
      '--------------------------------------------------------------------------------',
      'TESTIMONY SUMMARY:',
      '"I observed an unmarked grey pickup truck enter the side driveway around 23:20.',
      'Two males entered the loading bay carrying two metallic 20-liter jerry cans.',
      'Within ten minutes, smoke began billowing from Bay #3 and the vehicle sped away."',
      '--------------------------------------------------------------------------------',
      'VERIFICATION:',
      'Deposition corroborated by CCTV perimeter timestamp logs at 23:18 IST.'
    ]
  },

  // CASE-10234: Corporate Embezzlement
  {
    folder: 'CASE-10234_Corporate_Embezzlement',
    fileName: 'Call_Detail_Records_CASE-10234.pdf',
    officer: 'Rahul Sharma',
    title: 'TELECOM CELLULAR CDR ANALYSIS REPORT',
    lines: [
      'Case ID: CASE-10234 (Corporate Fund Embezzlement)',
      'Target Number: +91 98451 XXXXX (Chief Financial Controller)',
      'Investigating Officer: Rahul Sharma',
      'Analysis Period: August 1, 2026 - September 30, 2026',
      '--------------------------------------------------------------------------------',
      'CDR PATTERN DISCOVERY:',
      '- High-frequency encrypted VoIP redirects to offshore exchange servers.',
      '- 34 incoming voice calls from Cayman Islands branch intermediary accounts.',
      '- Cell Tower Triangulation confirms user presence at unauthorized bank branches.',
      '--------------------------------------------------------------------------------',
      'AUTHENTICITY: Certified under Section 65B of the Indian Evidence Act.'
    ]
  },
  {
    folder: 'CASE-10234_Corporate_Embezzlement',
    fileName: 'Mobile_Phone_Data_CASE-10234.pdf',
    officer: 'Rahul Sharma',
    title: 'DIGITAL FORENSIC EXTRACTION REPORT (UFED)',
    lines: [
      'Case ID: CASE-10234',
      'Extracted Device: Apple iPhone 15 Pro (IMEI: 359182049182012)',
      'Forensic Examiner: Rahul Sharma',
      'Extraction Type: Full Physical Decrypted Bitstream Image',
      '--------------------------------------------------------------------------------',
      'FORENSIC ARTIFACTS RECOVERED:',
      '- 14 encrypted spreadsheets tracking offshore shell corporation wire transfers.',
      '- Deleted messaging logs detailing fictitious vendor invoice generation.',
      '- Keystroke cache corroborates manual routing of $1.8M USD in corporate assets.',
      '--------------------------------------------------------------------------------',
      'INTEGRITY: SHA-256 verification hash matched against source physical memory.'
    ]
  },
  {
    folder: 'CASE-10234_Corporate_Embezzlement',
    fileName: 'Charge_Sheet_CASE-10234.pdf',
    officer: 'Rahul Sharma',
    title: 'POLICE FINAL REPORT / CHARGE SHEET (SEC 173 CrPC)',
    lines: [
      'Case ID: CASE-10234',
      'Court: Principal City Civil & Sessions Judge, Bangalore',
      'Submitting Officer: Rahul Sharma (Investigating Officer)',
      'Accused: Ex-Finance Director & 2 Shell Entities',
      '--------------------------------------------------------------------------------',
      'CHARGES APPLIED: Sections 409 (Criminal Breach of Trust), 420 (Cheating), 120B IPC.',
      'SUMMARY OF PROOF:',
      '1. Forensic forensic trail of 47 fraudulent transfer vouchers.',
      '2. Cryptographic blockchain logs linking offshore crypto wallets to accused.',
      '3. Confessionary audit documentation from third-party statutory auditors.',
      '--------------------------------------------------------------------------------',
      'RECOMMENDATION: Trial commencement with custodial detention.'
    ]
  },

  // CASE-10236: Digital Forgery
  {
    folder: 'CASE-10236_Digital_Forgery',
    fileName: 'Mobile_Phone_Data_CASE-10236.pdf',
    officer: 'Rahul Sharma',
    title: 'MOBILE SMARTPHONE EXTRACTION PROTOCOL',
    lines: [
      'Case ID: CASE-10236 (Digital Forgery & Identity Fabrication)',
      'Device Model: Samsung Galaxy S24 Ultra',
      'Secured By: Rahul Sharma',
      'Analysis Date: October 2, 2026',
      '--------------------------------------------------------------------------------',
      'DIGITAL EVIDENCE RECOVERED:',
      '- AI-generated biometric face swaps used to open fraudulent bank accounts.',
      '- Template vector files of State Revenue Department official seals.',
      '- 112 counterfeit digital signature certificates (.pfx keys).',
      '--------------------------------------------------------------------------------',
      'CHAIN OF CUSTODY: Immutably sealed on ChainGuard distributed ledger.'
    ]
  },
  {
    folder: 'CASE-10236_Digital_Forgery',
    fileName: 'Call_Detail_Records_CASE-10236.pdf',
    officer: 'Rahul Sharma',
    title: 'SUBSCRIBER CDR & IPDR NETWORK DUMP',
    lines: [
      'Case ID: CASE-10236',
      'Telecom Carrier: Airtel & Jio Joint Subpoena Records',
      'Investigating Officer: Rahul Sharma',
      '--------------------------------------------------------------------------------',
      'INTERNET PROTOCOL DETAIL RECORD (IPDR) CORRELATION:',
      '- VPN exit nodes traced to residential IP connection registered to prime suspect.',
      '- Continuous automated queries against electoral roll voter ID databases.',
      '- Synchronized calls made to counterfeit passport couriers across state lines.'
    ]
  },
  {
    folder: 'CASE-10236_Digital_Forgery',
    fileName: 'FIR_Copy_CASE-10236.pdf',
    officer: 'Rahul Sharma',
    title: 'FIRST INFORMATION REPORT - CYBER CRIME DIVISION',
    lines: [
      'Case ID: CASE-10236',
      'Sections: 66C, 66D IT Act 2000 read with Sec 465, 468, 471 IPC.',
      'Reporting Officer: Rahul Sharma',
      '--------------------------------------------------------------------------------',
      'SUBSTANCE OF INFORMATION:',
      'Criminal syndicate manufacturing forged government employment authorization letters,',
      'fake university degrees, and fraudulent biometric identity tokens.',
      '--------------------------------------------------------------------------------',
      'EVIDENCE STATUS: 6 laptops, 12 SIM cards, and 2 hardware security keys impounded.'
    ]
  },

  // CASE-10238: Insider Trading
  {
    folder: 'CASE-10238_Insider_Trading',
    fileName: 'Call_Detail_Records_CASE-10238.pdf',
    officer: 'Priya Nair',
    title: 'FINANCIAL INTELLIGENCE CDR & TOWER LOGS',
    lines: [
      'Case ID: CASE-10238 (Equities Insider Trading)',
      'Submitting Officer: Priya Nair (Investigating Officer)',
      'Target Device: Mobile Line +91 99002 XXXXX (Managing Partner)',
      '--------------------------------------------------------------------------------',
      'COMMUNICATION PEAKS:',
      '- 18 calls exchanged 15 minutes prior to quarterly earnings announcement.',
      '- Direct call routing to brokerage execution desk in Mumbai.',
      '- Cell Tower proximity confirms co-presence with Board of Directors audit member.'
    ]
  },
  {
    folder: 'CASE-10238_Insider_Trading',
    fileName: 'Mobile_Phone_Data_CASE-10238.pdf',
    officer: 'Priya Nair',
    title: 'DEVICE FORENSIC ARTIFACT ANALYSIS',
    lines: [
      'Case ID: CASE-10238',
      'Device: Google Pixel 8 Pro (Encrypted Work Profile)',
      'Investigating Officer: Priya Nair',
      '--------------------------------------------------------------------------------',
      'UNENCRYPTED CACHE ANALYSIS:',
      '- Screenshots of unreleased Q3 financial balance sheet.',
      '- Ephemeral chat logs negotiating 30% profit split on front-running orders.',
      '- Bank account screenshot showing Rs 4.2 Crore overseas liquidity inflow.'
    ]
  },
  {
    folder: 'CASE-10238_Insider_Trading',
    fileName: 'Witness_Statement_CASE-10238.pdf',
    officer: 'Priya Nair',
    title: 'WHISTLEBLOWER DEPOSITION & SWORN AFFIDAVIT',
    lines: [
      'Case ID: CASE-10238',
      'Deponent: Senior Compliance Officer (Name Protected Under SEBI Guidelines)',
      'Recorded By: Priya Nair',
      'Date: October 5, 2026',
      '--------------------------------------------------------------------------------',
      'STATEMENT EXCERPT:',
      '"The accused explicitly instructed compliance systems to pause trading flags',
      'for specific offshore accounts during the blackout trading window period."',
      '--------------------------------------------------------------------------------',
      'LEGAL STATUS: Deponent placed under protective custodial supervision.'
    ]
  },

  // CASE-10240: Smuggling
  {
    folder: 'CASE-10240_Smuggling',
    fileName: 'Other_Physical_Evidence_CASE-10240.pdf',
    officer: 'Priya Nair',
    title: 'SEIZURE MEMO & CUSTOMS CONTRABAND INVENTORY',
    lines: [
      'Case ID: CASE-10240 (Cross-Border Smuggling Network)',
      'Seizing Officer: Priya Nair (Investigating Officer)',
      'Location: Kempegowda International Airport Air Cargo Terminal',
      '--------------------------------------------------------------------------------',
      'CATALOGED ITEMS:',
      '1. 14 Gold Ingots (99.9% purity, total weight: 14.2 kg) concealed in industrial pump.',
      '2. False-bottomed cargo containers with laser-etched serial modifications.',
      '3. Currency notes totaling Rs 85,00,000 in undeclared high-denomination cash.',
      '--------------------------------------------------------------------------------',
      'CUSTODY: Deposited into Government Treasury Vault under ChainGuard Seal.'
    ]
  },
  {
    folder: 'CASE-10240_Smuggling',
    fileName: 'Call_Detail_Records_CASE-10240.pdf',
    officer: 'Priya Nair',
    title: 'INTERNATIONAL SATELLITE & CELLULAR CDR TRACE',
    lines: [
      'Case ID: CASE-10240',
      'Investigating Officer: Priya Nair',
      'Carrier: International Roaming Gateway Logs',
      '--------------------------------------------------------------------------------',
      'TRANSIT ANALYSIS:',
      '- High-priority communication with maritime shipping agency in Dubai.',
      '- Coordinated arrival alerts sent to warehouse logistics supervisor.',
      '- Signal intercepted through maritime border cell transceivers.'
    ]
  },

  // CASE-10241: Kidnapping
  {
    folder: 'CASE-10241_Kidnapping',
    fileName: 'Mobile_Phone_Data_CASE-10241.pdf',
    officer: 'Priya Nair',
    title: 'EXTORTION THREAT MESSAGE & TELEPHONY EXTRACTION',
    lines: [
      'Case ID: CASE-10241 (Aggravated Kidnapping for Ransom)',
      'Investigating Officer: Priya Nair',
      'Extraction: VoIP Call Logs & Encrypted Audio Note Intercepts',
      '--------------------------------------------------------------------------------',
      'RECOVERED AUDIO VOICE DATA:',
      '- Audio analysis matches voice print of identified suspect #2.',
      '- Threat recordings demanding Rs 5 Crore cash drop at Highway KM marker 42.',
      '- Background ambient acoustics indicate abandoned brick kiln manufacturing site.'
    ]
  },
  {
    folder: 'CASE-10241_Kidnapping',
    fileName: 'Call_Detail_Records_CASE-10241.pdf',
    officer: 'Priya Nair',
    title: 'REAL-TIME CELL TOWER TRIANGULATION REPORT',
    lines: [
      'Case ID: CASE-10241',
      'Officer: Priya Nair',
      'Target Burner SIM: +91 91104 XXXXX',
      '--------------------------------------------------------------------------------',
      'TOWER HOPS & ROUTE TIMELINE:',
      '- 21:00 IST: Active at Electronic City Flyover Sector 1.',
      '- 22:30 IST: Ping registered at Hosur Outer Border Checkpost.',
      '- 01:15 IST: Device powered down near Anekal forest reserve perimeter.'
    ]
  },
  {
    folder: 'CASE-10241_Kidnapping',
    fileName: 'Victim_Statement_CASE-10241.pdf',
    officer: 'Priya Nair',
    title: 'VICTIM RESCUE STATEMENT UNDER SEC 164 CrPC',
    lines: [
      'Case ID: CASE-10241',
      'Magistrate Court: Judicial Magistrate First Class',
      'Recording Officer: Priya Nair (with Judicial Magistrate)',
      'Date: October 9, 2026',
      '--------------------------------------------------------------------------------',
      'VICTIM DEPOSITION:',
      '"I was intercepted while returning from college at 19:45. Blindfolded and taken',
      'to a location with generator noise. The kidnappers used aliases Vikram and Cobra.',
      'I was rescued when police tactical units breached the south entrance."',
      '--------------------------------------------------------------------------------',
      'PHYSICAL STATUS: Medical trauma evaluation completed at Victoria Hospital.'
    ]
  },

  // CASE-10242: Illegal Weapons
  {
    folder: 'CASE-10242_Illegal_Weapons',
    fileName: 'Ballistics_Report_CASE-10242.pdf',
    officer: 'Aisha Khan',
    title: 'FORENSIC BALLISTICS & WEAPONS EXAMINATION REPORT',
    lines: [
      'Case ID: CASE-10242 (Unlicensed Firearms Distribution)',
      'Forensic Ballistics Expert: Aisha Khan (Senior Ballistics Specialist)',
      'Examination Date: October 8, 2026',
      '--------------------------------------------------------------------------------',
      'EXAMINATION FINDINGS:',
      'Weapon 1: Country-made semi-automatic pistol (7.65mm bore). Serial filed off.',
      'Weapon 2: Factory-manufactured 9mm automatic with defaced ordnance markings.',
      'Ammunition: 45 live rounds with military-spec brass casings.',
      'Test-fire striations cataloged in Central Ballistics Database (NIBIN match).'
    ]
  },
  {
    folder: 'CASE-10242_Illegal_Weapons',
    fileName: 'Other_Physical_Evidence_CASE-10242.pdf',
    officer: 'Priya Nair',
    title: 'ARMORY SEIZURE INVENTORY & CHAIN OF CUSTODY',
    lines: [
      'Case ID: CASE-10242',
      'Investigating Officer: Priya Nair',
      'Location of Seizure: Underground basement workshop, Peenya Industrial Area',
      '--------------------------------------------------------------------------------',
      'MANUFACTURING TOOLS RECOVERED:',
      '- Lathe machine with barrel rifling tool attachments.',
      '- 3 spare gun silencer suppressors with heat baffles.',
      '- Nitroglycerin residue detected on hydraulic pressing bench.'
    ]
  },

  // CASE-10243: Cryptocurrency Theft
  {
    folder: 'CASE-10243_Cryptocurrency_Theft',
    fileName: 'Mobile_Phone_Data_CASE-10243.pdf',
    officer: 'Priya Nair',
    title: 'HARDWARE WALLET & SEED PHRASE EXTRACTION MEMO',
    lines: [
      'Case ID: CASE-10243 (Decentralized Exchange Flash-Loan Exploitation)',
      'Investigating Officer: Priya Nair',
      'Artifact: Ledger Nano X Hardware Wallet & Encrypted Notes',
      '--------------------------------------------------------------------------------',
      'CRYPTOGRAPHIC EVIDENCE RECOVERED:',
      '- 24-word BIP-39 mnemonic seed phrase recovered from encrypted memo.',
      '- Private keys controlling $3.4 Million USD in Ethereum and USDT.',
      '- Smart contract bytecode exploit script designed to drain liquidity pools.'
    ]
  },
  {
    folder: 'CASE-10243_Cryptocurrency_Theft',
    fileName: 'Call_Detail_Records_CASE-10243.pdf',
    officer: 'Priya Nair',
    title: 'BLOCKCHAIN IP CLUSTER & CALL LOG CORRELATION',
    lines: [
      'Case ID: CASE-10243',
      'Investigating Officer: Priya Nair',
      '--------------------------------------------------------------------------------',
      'RPC NODE CONNECTION LOGS:',
      '- IP addresses initiating attack transactions match cellular hotspots',
      '  belonging to suspect during execution of the smart contract exploit.',
      '- Simultaneous calls placed to crypto OTC brokers to liquidate tokens into fiat.'
    ]
  },
  {
    folder: 'CASE-10243_Cryptocurrency_Theft',
    fileName: 'FIR_Copy_CASE-10243.pdf',
    officer: 'Priya Nair',
    title: 'FIRST INFORMATION REPORT - CYBER CRIMES WING',
    lines: [
      'Case ID: CASE-10243',
      'Sections: 43/66 IT Act & 420 IPC',
      'Complainant: Defi Protocol Security Lead',
      'Investigating Officer: Priya Nair',
      '--------------------------------------------------------------------------------',
      'INCIDENT SUMMARY:',
      'Unauthorized manipulation of decentralized liquidity pool oracle prices,',
      'resulting in systemic asset withdrawal within a 3-block timeframe.',
      'Cryptographic freeze orders issued to centralized exchanges via interpol.'
    ]
  },

  // CASE-10244: Serial Burglaries
  {
    folder: 'CASE-10244_Serial_Burglaries',
    fileName: 'Fingerprint_CASE-10244.pdf',
    officer: 'Aisha Khan',
    title: 'LATENT PRINT IDENTIFICATION & AFIS MATCH MEMO',
    lines: [
      'Case ID: CASE-10244 (Residential Serial Burglaries)',
      'Latent Print Examiner: Aisha Khan (Forensic Specialist)',
      'Source: Lifted from sliding glass terrace door (Ex. LP-04)',
      '--------------------------------------------------------------------------------',
      'DACTYLOSCOPIC ANALYSIS:',
      '- Pattern: Double whorl with 16 distinct Galton ridge characteristics.',
      '- Core and delta structures clear without smudging.',
      '- AFIS Database Match: 99.7% correlation with Known Offender ID #KA-8942.',
      'CONCLUSION: Positive scientific identification of suspect entry.'
    ]
  },
  {
    folder: 'CASE-10244_Serial_Burglaries',
    fileName: 'Witness_Statement_CASE-10244.pdf',
    officer: 'Priya Nair',
    title: 'NEIGHBORHOOD WITNESS DEPOSITION',
    lines: [
      'Case ID: CASE-10244',
      'Investigating Officer: Priya Nair',
      'Witness: Smt. Anuradha V. (Resident, House #44)',
      '--------------------------------------------------------------------------------',
      'TESTIMONY SUMMARY:',
      '"I noticed motion sensor security lights activate at neighbor\'s house at 02:20 AM.',
      'A hooded figure scaled the back garden wall carrying a black duffel bag.',
      'He climbed onto an unnumbered black motorcycle parked down the lane."',
      'VERIFICATION: Timing precisely aligns with glass break alarm telemetry.'
    ]
  },

  // CASE-10245: Counterfeit Currency
  {
    folder: 'CASE-10245_Counterfeit_Currency',
    fileName: 'Other_Physical_Evidence_CASE-10245.pdf',
    officer: 'Priya Nair',
    title: 'COUNTERFEIT NOTE TECHNICAL EXAMINATION MEMO',
    lines: [
      'Case ID: CASE-10245 (Fake Indian Currency Note Distribution)',
      'Investigating Officer: Priya Nair',
      'Seized Material: 2,500 Counterfeit Rs 500 Banknotes (Face Value: Rs 12.5 Lakhs)',
      '--------------------------------------------------------------------------------',
      'SECURITY FEATURE FLAWS IDENTIFIED:',
      '- Watermark: Mahatma Gandhi watermark is crude surface print, not internal pulp.',
      '- Security Thread: Windowed thread lacks fluorescent color-shift under UV light.',
      '- Microlettering: "RBI" and "500" blurred and illegible under 10x magnification.',
      '- Paper Substrate: Low rag-content commercial wood pulp paper without tactile intaglio.'
    ]
  },
  {
    folder: 'CASE-10245_Counterfeit_Currency',
    fileName: 'FIR_Copy_CASE-10245.pdf',
    officer: 'Priya Nair',
    title: 'FIRST INFORMATION REPORT (ECONOMIC OFFENCES WING)',
    lines: [
      'Case ID: CASE-10245',
      'Sections: 489A, 489B, 489C, 489D IPC (Counterfeiting Currency)',
      'Investigating Officer: Priya Nair',
      '--------------------------------------------------------------------------------',
      'STING OPERATION SUMMARY:',
      'Joint operation with Reserve Bank Intelligence Unit at Majestic Metro Hub.',
      'Two couriers caught red-handed receiving delivery of fake currency consignments.'
    ]
  },
  {
    folder: 'CASE-10245_Counterfeit_Currency',
    fileName: 'Charge_Sheet_CASE-10245.pdf',
    officer: 'Priya Nair',
    title: 'POLICE FINAL REPORT / CHARGE SHEET (CrPC 173)',
    lines: [
      'Case ID: CASE-10245',
      'Court: Special Sessions Court for Economic Offences, Bangalore',
      'Investigating Officer: Priya Nair',
      '--------------------------------------------------------------------------------',
      'SUBSTANTIAL EVIDENCE SUBMISSION:',
      '1. Confiscated high-resolution offset printing plates & specialized green ink.',
      '2. Forensic Laboratory chemical report confirming synthetic paper formulation.',
      '3. Confessional statements detailing printing press facility in interstate border.',
      'PRAYER: Cognizance requested and non-bailable warrants against ringleader.'
    ]
  }
];

const treeBaseDir = path.join(process.cwd(), 'Demo_Evidence');
const flatBaseDir = path.join(process.cwd(), 'Demo_Evidence_Files');

if (!fs.existsSync(treeBaseDir)) fs.mkdirSync(treeBaseDir, { recursive: true });
if (!fs.existsSync(flatBaseDir)) fs.mkdirSync(flatBaseDir, { recursive: true });

console.log(`Generating ${PDF_DEFINITIONS.length} Demo Evidence PDF files (excluding images & mp4)...\n`);

let index = 1;
for (const def of PDF_DEFINITIONS) {
  const caseDir = path.join(treeBaseDir, def.folder);
  if (!fs.existsSync(caseDir)) fs.mkdirSync(caseDir, { recursive: true });

  const treeFilePath = path.join(caseDir, def.fileName);
  const flatFilePath = path.join(flatBaseDir, def.fileName);

  const pdfBuffer = generateSimplePDF(def.title, [
    `Assigned Officer: ${def.officer}`,
    ...def.lines
  ]);

  // Save to Demo_Evidence/CASE-xxxx/
  fs.writeFileSync(treeFilePath, pdfBuffer);
  // Also save flat to Demo_Evidence_Files/ for quick drag & drop
  fs.writeFileSync(flatFilePath, pdfBuffer);

  console.log(`[${index}/${PDF_DEFINITIONS.length}] ✅ Created: ${def.folder}/${def.fileName} (Officer: ${def.officer})`);
  index++;
}

console.log(`\n🎉 Success! All ${PDF_DEFINITIONS.length} PDF files generated in:`);
console.log(`📁 Tree View: ${treeBaseDir}`);
console.log(`📁 Flat View: ${flatBaseDir}`);
