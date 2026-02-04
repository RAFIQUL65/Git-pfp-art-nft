# Git-pfp-art-nft
PFP ART Collections NFT
🎯 CORE FEATURES (Perfect for 10K PFP Collections):
✅ 10,000 NFT Collection with Hard Supply Cap
✅ Multi-Phase Minting System (Paused → Whitelist → Public)
✅ Merkle Proof Whitelist - Gas Efficient & Private
✅ Blind Reveal Mechanism with IPFS Integration
✅ Team Allocation with Secure Access Controls

💰 REVENUE & FINANCIAL FEATURES:
✅ Dual Pricing: Public (0.08 ETH) & Whitelist (0.05 ETH)
✅ Secure Treasury Management with Withdrawal Functions
✅ Royalty-Ready Architecture (Easy ERC2981 Integration)
✅ Anti-Bot Measures: Max 10 NFTs per Transaction
✅ Real-time Supply Tracking with Remaining Count

🛡️ ENTERPRISE-GRADE SECURITY:
✅ Reentrancy Protection on All Minting Functions
✅ Ownership-Based Access Control (OnlyOwner Modifiers)
✅ Input Validation & Edge Case Handling
✅ Emergency Pause Functionality
✅ Gas-Optimized Batch Minting

🎨 METADATA MANAGEMENT:

✅ Dynamic URI System with Placeholder Support
✅ One-Way Reveal Function (Cannot be Reversed)
✅ IPFS/Arweave Compatible URI Structure
✅ Real-time Token URI Generation

📋 MAIN FUNCTIONS HIGHLIGHTED:
1. MINTING SYSTEM (3-Tier Access)
📍 whitelistMint() - Discounted mint for verified addresses
📍 publicMint()     - Open minting for everyone
📍 teamMint()       - Reserved allocation for team/giveaways

2. ADMIN & CONTROL FUNCTIONS
📍 setMintPhase()   - Control minting schedule (0=paused, 1=whitelist, 2=public)
📍 setMerkleRoot()  - Update whitelist without redeployment
📍 reveal()         - Switch from placeholder to real metadata
📍 withdraw()       - Secure fund extraction to treasury
📍 emergencyPause() - Immediate minting halt for security