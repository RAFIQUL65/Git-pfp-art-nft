// test/PFP.test.js - Simplified
const { expect } = require("chai");

describe("ArtCollectorsPFP", function() {
  let contract, owner, user1, treasury;
  
  beforeEach(async function() {
    // Get test accounts
    [owner, user1, , treasury] = await ethers.getSigners();
    
    // Deploy contract
    const PFP = await ethers.getContractFactory("ArtCollectorsPFP");
    contract = await PFP.deploy(
      "Test NFT",
      "TEST",
      "ipfs://test/",
      "ipfs://placeholder/",
      treasury.address,
      [owner.address]
    );
  });

  describe("Deployment", function() {
    it("Should set correct name and symbol", async function() {
      expect(await contract.name()).to.equal("Test NFT");
      expect(await contract.symbol()).to.equal("TEST");
    });

    it("Should set correct treasury", async function() {
      expect(await contract.treasury()).to.equal(treasury.address);
    });

    it("Should have correct constants", async function() {
      expect(await contract.MAX_SUPPLY()).to.equal(10000);
      expect(await contract.MAX_PER_TX()).to.equal(10);
    });
  });

  describe("Minting", function() {
    it("Should allow team mint", async function() {
      await contract.teamMint(user1.address, 2);
      expect(await contract.balanceOf(user1.address)).to.equal(2);
    });

    it("Should track total supply", async function() {
      await contract.teamMint(owner.address, 5);
      expect(await contract.totalSupply()).to.equal(5);
    });
  });

  describe("Access Control", function() {
    it("Should not allow non-owner to change phase", async function() {
      await expect(
        contract.connect(user1).setMintPhase(1)
      ).to.be.reverted;
    });

    it("Should not allow non-team to team mint", async function() {
      await expect(
        contract.connect(user1).teamMint(user1.address, 1)
      ).to.be.revertedWith("Not a team member");
    });
  });
});
