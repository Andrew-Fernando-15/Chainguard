# ChainGuard — Smart Contract

This is the blockchain piece of the project — a Solidity smart contract that
stores evidence hashes permanently and detects tampering.

## What's in here
- `contracts/EvidenceContract.sol` — the smart contract itself
- `scripts/deploy.js` — deploys it to your local Ganache blockchain
- `hardhat.config.js` — points Hardhat at Ganache (`http://127.0.0.1:8545`)

## Prerequisites
Ganache must already be running before you deploy. It comes up automatically
with:
```bash
docker-compose up -d
```
(from the `docker-compose.yml` you already have — it starts both MongoDB and
Ganache together)

## Setup
```bash
npm install
```

## Deploy the contract
```bash
npm run deploy
```

Expected output:
```
Deploying EvidenceContract to Ganache...
✅ EvidenceContract deployed at: 0x...
✅ Saved contract info to .../deployed-contract.json
```

This creates a file called `deployed-contract.json` containing the contract's
address and ABI (its "interface" — what functions it has).

## Connect it to your backend
Copy `deployed-contract.json` into your `backend` folder:
```
backend/
  deployed-contract.json   ← copy it here
  src/
  ...
```

The backend's `src/services/blockchain.js` reads this file to know how to
talk to your deployed contract. Restart your backend server after copying it.

## What the contract does

| Function | Purpose |
|---|---|
| `addEvidence(caseId, fileHash)` | Permanently stores a new evidence record |
| `getEvidence(evidenceId)` | Reads back a stored record |
| `verifyEvidence(evidenceId, currentHash)` | Returns `true`/`false` — did the file get tampered with? |
| `logCustodyEvent(evidenceId, action)` | Appends a chain-of-custody entry (e.g. "viewed", "transferred") |
| `getCustodyLog(evidenceId)` | Returns the full custody history |

## Re-deploying
If you restart Docker (`docker-compose down` then `up` again), Ganache resets
to a blank chain — meaning any previously deployed contract is gone. You'll
need to run `npm run deploy` again and re-copy the new `deployed-contract.json`
into `backend`.
