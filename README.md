# ChainGuard — AI-Assisted Blockchain-Based Evidence Management System

**Final Year Engineering Project**

ChainGuard is a secure digital evidence management system that combines **Blockchain**, **SHA-256 hashing**, **role-based access control**, and **rule-based AI anomaly detection** to create a tamper-proof chain of custody for digital evidence.

---

## Demo Accounts

Use these accounts to explore the system:

| Role           | Name                      | Email                        | Password      |
|----------------|---------------------------|------------------------------|---------------|
| **Police**         | Inspector Rajesh Sharma   | police@chainguard.com        | Police@123    |
| **Forensic**       | Dr. Ananya Khan           | forensic@chainguard.com      | Forensic@123  |
| **Investigator**   | Inspector Priya Nair      | investigator@chainguard.com  | Invest@123    |
| **Judge**          | Justice Suresh Verma      | judge@chainguard.com         | Judge@123     |
| **CBI**            | CBI Officer Vikram Singh  | cbi@chainguard.com           | CBI@123       |

> **Note:** Judge and CBI can view all cases. Other roles can only see cases allotted to them.

---

## Project Overview

Traditional digital evidence systems are vulnerable to tampering, unauthorized access, and weak chain-of-custody records.  

ChainGuard solves this by:

- Storing evidence hashes permanently on the blockchain
- Encrypting evidence files
- Enforcing strict Position + Role + Case-based access control
- Detecting suspicious activities using 11 rule-based AI checks
- Maintaining a complete and verifiable chain of custody

---

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | React 19, Vite, Tailwind CSS v4, Framer Motion |
| Backend        | Node.js, Express.js                 |
| Database       | MongoDB                             |
| Blockchain     | Ethereum (Ganache) + Solidity + Hardhat |
| Authentication | JWT + bcrypt                        |
| Hashing        | SHA-256                             |
| Encryption     | AES-256-GCM (planned)               |
| AI             | Rule-based Anomaly Detection        |

---

## Project Structure
Chainguard//<br>
├── chainguard/          → Frontend (React + Vite)/<br>
├── backend/             → Node.js + Express API/<br>
├── blockchain/          → Solidity Smart Contract + Hardhat/<br>
├── docker-compose.yml   → MongoDB + Ganache/<br>
├── PRD.txt/<br>
├── SRS.txt/<br>
├── System Architecture.txt/<br>
├── UI-UX.txt/<br>
└── Deployment plan.txt/<br>

---

## Getting Started

### 1. Start Infrastructure

```bash
docker-compose up -d
```
This starts MongoDB and Ganache.

Backend
cd backend
cp .env.example .env

# Edit .env and set JWT_SECRET
npm install
npm run dev

Blockchain (Smart Contract)

cd blockchain
npm install
npm run deploy

Frontend

cd chainguard
npm install
npm run dev

Key Features (Current Progress)

Role-based authentication (Police, Forensic, Investigator, Judge, CBI)
Case allotment and access control
Evidence upload with real SHA-256 hashing
Blockchain storage of evidence hashes
Chain of Custody timeline
AI Anomaly Detection page
Dark / Light theme support
Modern premium UI


Documentation

Product Requirements Document (PRD)
Software Requirements Specification (SRS)
System Architecture
UI/UX Document
Deployment Plan

Team
Final Year Engineering Project – ChainGuard
