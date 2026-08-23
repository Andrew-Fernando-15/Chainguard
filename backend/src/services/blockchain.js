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
  if (!c) return null; // blockchain not deployed yet — caller should handle gracefully

  const tx = await c.addEvidence(caseId, fileHash);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    contractAddress: await c.getAddress(),
  };
}

export async function verifyEvidenceOnChain(evidenceId, currentHash) {
  const c = await getContract();
  if (!c) return null;
  return c.verifyEvidence(evidenceId, currentHash);
}
