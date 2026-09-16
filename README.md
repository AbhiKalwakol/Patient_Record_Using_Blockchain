# Patient Records on Blockchain

A decentralized medical record verification platform that pairs **client-side OCR digitization** and **IndexedDB privacy-preserving storage** with **immutable Ethereum smart contract audit trails**.

---

## Key Architecture & Privacy Model

In healthcare informatics (HIPAA, GDPR), storing Protected Health Information (PHI) directly on a public blockchain introduces severe privacy violations. This system solves that problem using a **hybrid on-chain / off-chain architecture**:

```
[ Medical Paper / Scan ]
          │
          ▼
   (Tesseract.js OCR)
          │
   Client-Side Browser
  ┌───────┴───────────────┐
  │                       │
  ▼                       ▼
[ IndexedDB ]       [ keccak256 Hash ]
(Raw image file          │
+ Extracted text)        ▼
                   (Ethereum Smart Contract)
                   - contentHash (bytes32)
                   - docType (string)
                   - timestamp (uint256)
                   - uploader (address)
```

1. **Zero PHI On-Chain**: Raw scanned images and sensitive OCR texts **never** leave the patient's local browser storage (IndexedDB).
2. **Cryptographic Sealing**: A cryptographic fingerprint is computed:
   $$\text{contentHash} = \text{keccak256}(\text{fileBytes} \parallel \text{toUtf8Bytes}(\text{ocrText}))$$
3. **Immutability & Proof of Existence**: Only the 32-byte hash and document metadata are committed to the Ethereum blockchain.
4. **Instant Verification**: Any document can be verified against the blockchain by recomputing its hash and checking for exact equivalence with the on-chain record.

---

## Tech Stack

- **Smart Contract**: Solidity `^0.8.24` (compiled with Paris EVM target, optimizer enabled)
- **Development & Testing Framework**: Hardhat, Ethers.js v6, Chai matchers
- **Frontend**: React 18, Vite, React Router v6
- **Optical Character Recognition (OCR)**: Tesseract.js
- **Client-Side Storage**: IndexedDB via `idb-keyval` and native `indexedDB` API
- **Web3 Wallet**: MetaMask (EIP-1193 provider)

---

## Project Structure

```
.
├── contracts/
│   └── PatientRecords.sol          # Smart contract storing record hashes
├── scripts/
│   └── deploy.js                   # Deployment script & frontend artifact sync
├── test/
│   └── PatientRecords.js           # Full Hardhat/Chai test suite
├── frontend/
│   ├── index.html                  # HTML entry point
│   ├── package.json                # Frontend package manifest
│   ├── vite.config.js              # Vite config with React plugin
│   └── src/
│       ├── main.jsx                # React root
│       ├── App.jsx                 # Routes & context wrapping
│       ├── index.css               # Application stylesheet
│       ├── components/
│       │   └── Layout.jsx          # Header, navigation, and wallet chip
│       ├── context/
│       │   └── WalletContext.jsx   # MetaMask connection & network management
│       ├── lib/
│       │   ├── contract.js         # Contract instance & hash computation
│       │   ├── idb.js              # Local IndexedDB persistence
│       │   └── ocr.js              # Tesseract.js optical character recognition
│       ├── pages/
│       │   ├── Digitize.jsx        # Document upload, OCR, and on-chain sealing
│       │   └── MyRecords.jsx       # Record list and hash tamper-verification
│       └── contracts/
│           └── PatientRecords.json # Deployed address & ABI
├── hardhat.config.js               # Hardhat configuration
├── package.json                    # Root package manifest
└── README.md
```

---

## Quickstart Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MetaMask](https://metamask.io/) browser extension

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Compile Contracts and Run Tests
```bash
# Compile Solidity contracts
npm run compile

# Run test suite
npm test
```

### 4. Start Local Blockchain & Deploy
In terminal 1, start the Hardhat local node:
```bash
npx hardhat node
```

In terminal 2, deploy the smart contract:
```bash
npm run deploy
```
This automatically updates `frontend/src/contracts/PatientRecords.json` with the deployed address.

### 5. Launch the Web Application
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Using the Application

1. **Connect MetaMask**: Click **Connect MetaMask** in the navigation bar. Ensure your wallet is connected to **Hardhat Localhost** (`http://127.0.0.1:8545`, Chain ID `31337`).
2. **Digitize Record**:
   - Upload an image scan of a medical document (e.g. lab report, prescription).
   - Click **Run OCR** to extract the text.
   - Review or edit the recognized text.
   - Click **Seal hash on chain** to sign the transaction in MetaMask.
3. **Verify Integrity**:
   - Navigate to **My records**.
   - Click **Verify hash** on any record to cryptographically check whether your local copy matches the immutable on-chain hash.
