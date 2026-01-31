// scripts/deploy.js
async function main() {
  console.log("🚀 NFT Contract Deployment\n");
  
  // Load hardhat at the beginning
  const hre = require("hardhat");
  const ethers = hre.ethers;
  
  try {
    // 1. Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // 2. Get balance - CORRECT WAY
    //const balance = await deployer.getBalance();
    const balance = await deployer.provider.getBalance(deployer.address);
   // console.log("Balance:", ethers.utils.formatEther(balance), "ETH");
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    // 3. Contract parameters
   const params = {
      name: "Art Collectors Club",
      symbol: "ACC",
      baseURI: "ipfs://QmTest/",
      placeholderURI: "ipfs://placeholder/",
      treasury: deployer.address,
      teamMembers: []
    };
    
    console.log("\n📋 Configuration:");
    console.log("Name:", params.name);
    console.log("Symbol:", params.symbol);
    console.log("Treasury:", params.treasury);
    
    // 4. Deploy
    console.log("\n⚡ Deploying...");
    const PFP = await ethers.getContractFactory("ArtCollectorsPFP");
    const pfp = await PFP.deploy(
      params.name,
      params.symbol,
      params.baseURI,
      params.placeholderURI,
      params.treasury,
      params.teamMembers
    );
    
    console.log("⏳ Waiting for deployment...");
    await pfp.deployed();
    
    console.log("\n✅ SUCCESS!");
    console.log("Contract:", pfp.address);
    console.log("Owner:", await pfp.owner());
    console.log("Max Supply:", await pfp.MAX_SUPPLY());
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

// Execute
main();