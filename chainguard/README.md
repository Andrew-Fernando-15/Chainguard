# ChainGuard — AI-Assisted Blockchain-Based Evidence Management System

A premium, dark-themed frontend for a Final Year Engineering Project combining
Blockchain, AI anomaly detection, SHA-256 hashing, and role-based access control
for tamper-proof digital evidence management.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion, React Router, React Icons, Chart.js
- **Hashing:** Real SHA-256 via the browser's SubtleCrypto API (Upload page)
- **Blockchain / Backend / AI:** Mocked in `src/services/api.js` and `src/data/dummyData.js` — replace with your Node/Express + MongoDB + Ganache/Ethereum + Python services

## Getting Started

```bash
npm install
npm run dev       # start dev server at http://localhost:5173
npm run build     # production build -> dist/
npm run preview   # preview the production build
```

Requires Node.js 18+.

## Project Structure

```
src/
  components/    Reusable UI (Navbar, Footer, cards, charts, diagrams, loader, toasts...)
  pages/         Landing, Dashboard, Upload, AIDetection, BlockchainVerification, ChainOfCustody, Roles
  layouts/       MainLayout (navbar + footer + FAB wrapper)
  context/       ThemeContext (dark/light), ToastContext (notifications)
  data/          dummyData.js — mock stats, activity, roles, custody events
  services/      api.js — mock blockchain calls, swap for real axios/Express endpoints
  utils/         hash.js — real SHA-256 file hashing helper
```

## Connecting a Real Backend

1. Replace the mock functions in `src/services/api.js` with `axios` calls to your Express API.
2. Point uploads at your Node/Express `/evidence` endpoint; keep `sha256File()` from
   `src/utils/hash.js` so hashing still happens client-side before the file is sent.
3. Swap the arrays in `src/data/dummyData.js` for data fetched from MongoDB via your API.
4. Wire `src/pages/BlockchainVerification.jsx` and `src/pages/Upload.jsx` to your deployed
   Solidity smart contract (via `ethers.js`/`web3.js` + MetaMask) instead of `mockUploadToBlockchain`
   and `mockVerifyEvidence`.

## Notes

- Light/dark theme toggle is in the navbar (top right).
- The floating action button (bottom right) jumps straight to the Upload page.
- All charts, heat maps, and tables currently render dummy data for demo purposes.
- Reduced-motion is respected throughout (`prefers-reduced-motion`).
