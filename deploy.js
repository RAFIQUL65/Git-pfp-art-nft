// scripts/deploy.js
async function main() {
  console.log("🚀 NFT Contract Deployment\n");
  
  const hre = require("hardhat");
  const ethers = hre.ethers;
  
  // DECLARE pfp HERE, OUTSIDE THE TRY BLOCK
  let pfp;
  
  try {
    // 1. Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // 2. Get balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH\n");
    
    // 3. Contract parameters
    const params = {
      name: "Art Collectors Club",
      symbol: "ACC",
      baseURI: "ipfs://QmTest/",
      placeholderURI: "ipfs://placeholder/",
      treasury: deployer.address,
      teamMembers: [deployer.address]
    };
    
    console.log("📋 Configuration:");
    console.log("Name:", params.name);
    console.log("Symbol:", params.symbol);
    console.log("Base URI:", params.baseURI);
    console.log("Placeholder URI:", params.placeholderURI);
    console.log("Treasury:", params.treasury);
    console.log("\n👥 Team Members:");
    params.teamMembers.forEach((addr, i) => {
      console.log(`  ${i + 1}. ${addr} ${i === 0 ? '(Treasury/Owner)' : ''}`);
    });
    
    // 4. Deploy
    console.log("\n⚡ Deploying...");
    const PFP = await ethers.getContractFactory("ArtCollectorsPFP");
    
    // Now pfp is accessible in the entire function
    pfp = await PFP.deploy(
      params.name,
      params.symbol,
      params.baseURI,
      params.placeholderURI,
      params.treasury,
      params.teamMembers
    );
    
    console.log("⏳ Waiting for deployment confirmation...");
    await pfp.waitForDeployment();
    
    const contractAddress = await pfp.getAddress();
    
    console.log("\n✅ SUCCESS!");
    console.log("Contract:", contractAddress);
    
    // Additional checks
    console.log("Testing contract functions...");
    try {
      const owner = await pfp.owner();
      console.log("Owner:", owner);
    } catch (e) {
      console.log("Note: owner() function might not exist");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    // Now we can safely check if pfp was initialized
    if (pfp && pfp.deploymentTransaction) {
      console.log("Deployment transaction hash:", pfp.deploymentTransaction().hash);
    } else {
      console.log("Contract was not deployed before error occurred");
    }
    
    process.exit(1);
  }
}

// Execute
main();