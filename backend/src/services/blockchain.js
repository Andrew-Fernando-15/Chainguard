import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deploymentPath = path.join(__dirname, '..', '..', 'deployed-contract.json');

let contractAbi = null;
let contractAddress = null;
let provider = null;
let contract = null;

/**
 * Connects to the deployed EvidenceContract on Ganache.
 * Returns null (and logs a warning) if the contract hasn't been deployed yet —
 * this lets the rest of the app keep working even before Step 4 is wired up.
 */
export async function getContract() {
  if (!fs.existsSync(deploymentPath)) {
    console.warn(
      '⚠️  deployed-contract.json not found — blockchain features are disabled.\n' +
      '   Run "npm run deploy" in the blockchain/ folder, then copy the file here.'
    );
    return null;
  }

  if (!contractAbi) {
    ({ address: contractAddress, abi: contractAbi } = JSON.parse(fs.readFileSync(deploymentPath, 'utf8')));
  }

  if (!provider) {
    provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC || 'http://localhost:8545');
  }

  // Ganache's accounts come pre-unlocked, so we can just ask the node to sign
  // for account #0 — no private key needs to be stored anywhere.
  const signer = await provider.getSigner(0);
  contract = new ethers.Contract(contractAddress, contractAbi, signer);
  return contract;
}

export async function addEvidenceOnChain(caseId, fileHash) {
  const c = await getContract();
  if (!c) return null;

  const tx = await c.addEvidence(caseId, fileHash);
  const receipt = await tx.wait();

  let evidenceId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = c.interface.parseLog(log);
      if (parsed && parsed.name === 'EvidenceAdded') {
        evidenceId = Number(parsed.args.evidenceId || parsed.args[0]);
        break;
      }
    } catch (e) {
      // ignore other logs
    }
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    contractAddress: await c.getAddress(),
    evidenceId,
  };
}

export async function verifyEvidenceOnChain(evidenceId, currentHash) {
  const c = await getContract();
  if (!c) return null;
  return c.verifyEvidence(evidenceId, currentHash);
}

export async function getEvidenceInfoOnChain(evidenceId) {
  const c = await getContract();
  if (!c) return null;
  return c.getEvidence(evidenceId);
}

/**
 * Log a custody event (view, download, transferred, case_reopened, etc.)
 * onto the blockchain for an existing evidence record.
 * @param {number} evidenceId - The on-chain evidence ID
 * @param {string} action - Description of the action (e.g. "downloaded", "viewed")
 * @returns {{ txHash, blockNumber }} or null
 */
export async function logCustodyOnChain(evidenceId, action) {
  const c = await getContract();
  if (!c) return null;

  try {
    const tx = await c.logCustodyEvent(evidenceId, action);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (err) {
    console.error('Blockchain custody log failed:', err.message);
    return null;
  }
}

/**
 * Fetch the full chain-of-custody log from the blockchain for a given evidence.
 * @param {number} evidenceId - The on-chain evidence ID
 * @returns {Array<{ action, actor, timestamp }>} or null
 */
export async function getCustodyLogFromChain(evidenceId) {
  const c = await getContract();
  if (!c) return null;

  try {
    const rawLog = await c.getCustodyLog(evidenceId);
    return rawLog.map((entry) => ({
      action: entry.action,
      actor: entry.actor,
      timestamp: Number(entry.timestamp),
    }));
  } catch (err) {
    console.error('Failed to fetch custody log:', err.message);
    return null;
  }
}

/**
 * Get the total number of evidence records stored on-chain.
 * @returns {number} or 0
 */
export async function getEvidenceCountOnChain() {
  const c = await getContract();
  if (!c) return 0;
  const count = await c.evidenceCount();
  return Number(count);
}

/**
 * Get the deployed contract address.
 * @returns {string} or null
 */
export async function getContractAddress() {
  const c = await getContract();
  if (!c) return null;
  return c.getAddress();
}

