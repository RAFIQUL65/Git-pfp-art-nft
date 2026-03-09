const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArtCollectorsPFP - Comprehensive Tests", function() {
  let contract;
  let owner, user1, user2, treasury;
  
  beforeEach(async function() {
    [owner, user1, user2, treasury] = await ethers.getSigners();
    
    const PFP = await ethers.getContractFactory("ArtCollectorsPFP");
    contract = await PFP.deploy(
      "Test Collection",
      "TEST",
      "ipfs://test/",
      "ipfs://placeholder/",
      treasury.address,
      [owner.address]
    );
  });

  describe("Deployment", function() {
    it("Should set the right owner", async function() {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should set the right treasury", async function() {
      expect(await contract.treasury()).to.equal(treasury.address);
    });

    it("Should have correct constants", async function() {
      expect(await contract.MAX_SUPPLY()).to.equal(10000n);
      expect(await contract.MAX_PER_TX()).to.equal(10n);
      expect(await contract.WHITELIST_MAX_PER_WALLET()).to.equal(3n);
    });

    it("Should have correct initial prices", async function() {
      const publicPrice = await contract.publicPrice();
      const whitelistPrice = await contract.whitelistPrice();
      
      expect(publicPrice).to.equal(ethers.parseEther("0.08"));
      expect(whitelistPrice).to.equal(ethers.parseEther("0.05"));
    });
  });

  describe("Mint Phases", function() {
    it("Should start with minting paused", async function() {
      expect(await contract.mintPhase()).to.equal(0n);
    });

    it("Should allow owner to change phases", async function() {
      await contract.setMintPhase(1);
      expect(await contract.mintPhase()).to.equal(1n);
      
      await contract.setMintPhase(2);
      expect(await contract.mintPhase()).to.equal(2n);
      
      await contract.setMintPhase(0);
      expect(await contract.mintPhase()).to.equal(0n);
    });

    it("Should not allow non-owner to change phases", async function() {
      await expect(
        contract.connect(user1).setMintPhase(1)
      ).to.be.reverted;
    });
  });

  describe("Team Minting", function() {
    it("Should allow team to mint", async function() {
      await contract.teamMint(user1.address, 5);
      expect(await contract.balanceOf(user1.address)).to.equal(5n);
      expect(await contract.totalSupply()).to.equal(5n);
    });

    it("Should enforce team mint limit (100 max)", async function() {
      // Should allow minting 100 (max allowed)
      await contract.teamMint(user1.address, 100);
      expect(await contract.balanceOf(user1.address)).to.equal(100n);
      
      // Should reject minting 101
      await expect(
        contract.teamMint(user1.address, 101)
      ).to.be.revertedWith("Exceeds team mint limit");
    });

    it("Should not allow non-team to team mint", async function() {
      await expect(
        contract.connect(user1).teamMint(user1.address, 1)
      ).to.be.revertedWith("Not a team member");
    });

    it("Should track address mints", async function() {
      await contract.teamMint(user1.address, 3);
      const minted = await contract.addressMinted(user1.address);
      expect(minted).to.equal(3n);
    });
  });

  describe("Public Minting", function() {
    beforeEach(async function() {
      await contract.setMintPhase(2); // Set to public phase
    });

    it("Should allow anyone to mint", async function() {
      const price = await contract.publicPrice();
      
      await contract.connect(user1).publicMint(2, {
        value: price * 2n
      });
      
      expect(await contract.balanceOf(user1.address)).to.equal(2n);
    });

    it("Should enforce max per transaction (10 max)", async function() {
      const price = await contract.publicPrice();
      
      // Should allow minting 10 (max allowed)
      await contract.connect(user1).publicMint(10, {
        value: price * 10n
      });
      expect(await contract.balanceOf(user1.address)).to.equal(10n);
      
      // Should reject minting 11
      await expect(
        contract.connect(user2).publicMint(11, {
          value: price * 11n
        })
      ).to.be.revertedWith("Invalid mint quantity");
    });

    it("Should enforce max supply (10,000 total)", async function() {
      const price = await contract.publicPrice();
      
      // First team mint 9900 tokens (in batches of 100)
      for (let i = 0; i < 99; i++) { // 99 * 100 = 9900
        await contract.teamMint(owner.address, 100);
      }
      
      // Now mint 99 via public mint - in batches of 10 (max per tx)
      // We need 99 total, so: 9 batches of 10 + 1 batch of 9 = 99
      for (let i = 0; i < 9; i++) {
        await contract.connect(user1).publicMint(10, {
          value: price * 10n
        });
      }
      // Last batch: mint 9
      await contract.connect(user1).publicMint(9, {
        value: price * 9n
      });
      
      // Total should be 9999 now (9900 + 99)
      expect(await contract.totalSupply()).to.equal(9999n);
      
      // Try to mint 2 more (would exceed 10000)
      await expect(
        contract.connect(user1).publicMint(2, {
          value: price * 2n
        })
      ).to.be.revertedWith("Exceeds max supply");
    });

    it("Should reject incorrect payment", async function() {
      const price = await contract.publicPrice();
      
      // Try to mint 2 but only pay for 1
      await expect(
        contract.connect(user1).publicMint(2, {
          value: price  // Only paying for 1
        })
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("Should reject overpayment", async function() {
      const price = await contract.publicPrice();
      
      // Try to mint 1 but pay for 2
      await expect(
        contract.connect(user1).publicMint(1, {
          value: price * 2n  // Paying double
        })
      ).to.be.revertedWith("Incorrect payment amount");
    });
  });

  describe("Supply Tracking", function() {
    it("Should track total supply correctly", async function() {
      expect(await contract.totalSupply()).to.equal(0n);
      
      await contract.teamMint(user1.address, 10);
      expect(await contract.totalSupply()).to.equal(10n);
      
      await contract.teamMint(user2.address, 5);
      expect(await contract.totalSupply()).to.equal(15n);
    });

    it("Should calculate remaining supply correctly", async function() {
      expect(await contract.remainingSupply()).to.equal(10000n);
      
      // Mint 2500 tokens in batches of 100
      const batches = 25; // 25 * 100 = 2500
      for (let i = 0; i < batches; i++) {
        await contract.teamMint(user1.address, 100);
      }
      
      expect(await contract.remainingSupply()).to.equal(7500n);
    });
  });

  describe("Metadata", function() {
    it("Should return placeholder URI before reveal", async function() {
      await contract.teamMint(owner.address, 1);
      const tokenURI = await contract.tokenURI(1);
      expect(tokenURI).to.equal("ipfs://placeholder/");
    });

    it("Should return actual URI after reveal", async function() {
      await contract.teamMint(owner.address, 1);
      await contract.reveal();
      const tokenURI = await contract.tokenURI(1);
      expect(tokenURI).to.equal("ipfs://test/1");
    });

    it("Should not allow reveal twice", async function() {
      await contract.reveal();
      await expect(contract.reveal()).to.be.revertedWith("Already revealed");
    });

    it("Should allow owner to update base URI", async function() {
      await contract.setBaseURI("ipfs://new-uri/");
      await contract.teamMint(owner.address, 1);
      await contract.reveal();
      const tokenURI = await contract.tokenURI(1);
      expect(tokenURI).to.equal("ipfs://new-uri/1");
    });
  });

  describe("Fund Management", function() {
    it("Should allow owner to withdraw funds", async function() {
      await contract.setMintPhase(2);
      const price = await contract.publicPrice();
      
      // Mint some NFTs with correct payment
      await contract.connect(user1).publicMint(5, {
        value: price * 5n
      });
      
      // Withdraw (should not revert)
      await contract.withdraw();
      
      // If we get here, test passes
      expect(true).to.be.true;
    });

    it("Should not allow non-owner to withdraw", async function() {
      await expect(
        contract.connect(user1).withdraw()
      ).to.be.reverted;
    });

    it("Should allow owner to update treasury", async function() {
      await contract.setTreasury(user2.address);
      expect(await contract.treasury()).to.equal(user2.address);
    });
  });

  describe("Team Management", function() {
    it("Should allow owner to add team member", async function() {
      await contract.addTeamMember(user1.address);
      const isMember = await contract.teamMembers(user1.address);
      expect(isMember).to.be.true;
    });

    it("Should allow owner to remove team member", async function() {
      await contract.addTeamMember(user1.address);
      let isMember = await contract.teamMembers(user1.address);
      expect(isMember).to.be.true;
      
      await contract.removeTeamMember(user1.address);
      isMember = await contract.teamMembers(user1.address);
      expect(isMember).to.be.false;
    });

    it("Should not allow non-owner to manage team", async function() {
      await expect(
        contract.connect(user1).addTeamMember(user2.address)
      ).to.be.reverted;
    });
  });

  describe("Emergency Functions", function() {
    it("Should allow emergency pause", async function() {
      await contract.setMintPhase(2);
      expect(await contract.mintPhase()).to.equal(2n);
      
      await contract.emergencyPause();
      expect(await contract.mintPhase()).to.equal(0n);
    });
  });
});