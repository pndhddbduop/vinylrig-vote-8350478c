# VinylRig Vote

A privacy-preserving decentralized voting application for audiophile equipment blind testing sessions, powered by Fully Homomorphic Encryption Virtual Machine (FHEVM).

## Overview

VinylRig Vote enables vinyl enthusiasts to conduct anonymous blind listening tests where participants can vote on equipment setups without revealing their preferences until the session is complete. All votes are encrypted on-chain using homomorphic encryption, ensuring complete privacy during the voting process.

## Features

- **Anonymous Voting**: Votes are encrypted using FHEVM, keeping individual preferences private
- **Blind Testing Sessions**: Organizers can create sessions with multiple equipment setups
- **Homomorphic Aggregation**: Votes are aggregated on-chain without decryption
- **Decryption Authorization**: Only session organizers can decrypt aggregated results after voting closes
- **Equipment Reveal**: Organizers can reveal equipment names after voting completes
- **Statistical Visualization**: Interactive charts showing rankings, average ratings, and tag frequencies

## Architecture

### Smart Contracts (`fhevm-hardhat-template/`)

- **VinylRigVote.sol**: Main contract managing sessions, votes, and encrypted aggregation
  - Uses `euint16` for encrypted ratings (1-10 scale)
  - Uses `euint8[5]` for encrypted preference tags (Bass, Midrange, Treble, Soundstage, Detail)
  - Homomorphic addition for on-chain aggregation
  - EIP-712 based decryption authorization

### Frontend (`vinylrig-vote-frontend/`)

- **Next.js 15** with App Router
- **Static Export** for deployment
- **FHEVM Integration**:
  - Real Relayer SDK for Sepolia testnet
  - Mock utils for local Hardhat development
- **Wallet Integration**: MetaMask with EIP-6963 support
- **Charts**: Recharts for statistical visualization

## Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- MetaMask or compatible Web3 wallet
- For local development: Hardhat node running on port 8545

## Installation

### 1. Install Dependencies

```bash
# Install contract dependencies
cd fhevm-hardhat-template
npm install

# Install frontend dependencies
cd ../vinylrig-vote-frontend
npm install
```

### 2. Environment Setup

#### Contract Environment (Hardhat)

```bash
cd fhevm-hardhat-template

# Set your mnemonic
npx hardhat vars set MNEMONIC

# Set Infura API key (for Sepolia)
npx hardhat vars set INFURA_API_KEY

# Optional: Etherscan API key for verification
npx hardhat vars set ETHERSCAN_API_KEY
```

### 3. Generate ABI Files

```bash
cd vinylrig-vote-frontend
npm run genabi
```

## Development

### Local Development (Mock Mode)

1. **Start Hardhat Node**:
   ```bash
   cd fhevm-hardhat-template
   npx hardhat node --port 8545
   ```

2. **Deploy Contracts**:
   ```bash
   npx hardhat deploy --network localhost
   ```

3. **Start Frontend (Mock Mode)**:
   ```bash
   cd vinylrig-vote-frontend
   npm run dev:mock
   ```

### Testnet Development (Real Relayer)

1. **Deploy to Sepolia**:
   ```bash
   cd fhevm-hardhat-template
   npx hardhat deploy --network sepolia
   ```

2. **Update Contract Addresses**:
   ```bash
   cd ../vinylrig-vote-frontend
   npm run genabi
   ```

3. **Start Frontend**:
   ```bash
   npm run dev
   ```

## Usage

1. **Create a Session**:
   - Navigate to "Create Session"
   - Fill in session details (title, description, deadline, number of setups)
   - Add equipment names (hidden until revealed)
   - Submit transaction

2. **Vote**:
   - Browse active sessions
   - Click "Vote Now" on a session
   - Rate each setup (1-10) and select preference tags
   - Submit encrypted vote

3. **View Results** (Organizer Only):
   - After voting closes, organizer can close the session
   - Request decryption authorization
   - Decrypt and view aggregated results
   - Reveal equipment names

## Testing

### Contract Tests

```bash
cd fhevm-hardhat-template
npm run test
```

### Frontend Static Export Check

```bash
cd vinylrig-vote-frontend
npm run check:static
```

## Building

### Frontend Production Build

```bash
cd vinylrig-vote-frontend
npm run build
```

Output will be in `out/` directory, ready for static hosting.

## Deployment

### Contracts

Deploy to Sepolia:
```bash
cd fhevm-hardhat-template
npx hardhat deploy --network sepolia
```

### Frontend

The frontend is configured for static export and can be deployed to:
- Vercel (configured with `vercel.json`)
- Any static hosting service

**Important**: For production deployment, ensure your hosting provider sets these headers:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

These headers are required for FHEVM Relayer SDK SharedArrayBuffer support.

## Project Structure

```
.
├── fhevm-hardhat-template/     # Smart contracts & Hardhat config
│   ├── contracts/              # Solidity contracts
│   ├── deploy/                 # Deployment scripts
│   ├── test/                   # Contract tests
│   └── tasks/                  # Hardhat tasks
│
└── vinylrig-vote-frontend/     # Next.js frontend
    ├── app/                    # Next.js App Router pages
    ├── components/             # React components
    ├── hooks/                  # React hooks
    ├── fhevm/                  # FHEVM integration
    └── abi/                    # Generated contract ABIs
```

## Technology Stack

- **Smart Contracts**: Solidity ^0.8.24, FHEVM v0.9
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Web3**: ethers.js v6
- **Encryption**: FHEVM (Fully Homomorphic Encryption)

## License

MIT

## Acknowledgments

Built with [FHEVM](https://docs.zama.ai/fhevm) by Zama for privacy-preserving on-chain computation.
