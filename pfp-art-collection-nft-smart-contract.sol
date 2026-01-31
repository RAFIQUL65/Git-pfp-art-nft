// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// Minimal imports - no Counters dependency
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";          // ERC721 standard
import "@openzeppelin/contracts/access/Ownable.sol";               // Ownership
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol"; // Whitelist
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";        // Security

/**
 * @title ArtCollectorsPFP
 * @notice 10,000 PFP NFT collection with whitelist functionality
 * @dev Simplified version without Counters library dependency
 * @author NFT Developer
 */
contract ArtCollectorsPFP is ERC721, Ownable, ReentrancyGuard {
    // ============ STATE VARIABLES ============
    
    // Simple counter instead of using Counters library
    uint256 private _tokenIdCounter = 1;  // Start at 1 (tokenId 0 is reserved)
    
    // Collection constants
    uint256 public constant MAX_SUPPLY = 10000;           // Total NFTs
    uint256 public constant MAX_PER_TX = 10;              // Anti-bot measure
    uint256 public constant WHITELIST_MAX_PER_WALLET = 3; // Max whitelist mints
    
    // Pricing
    uint256 public publicPrice = 0.08 ether;    // Public mint price
    uint256 public whitelistPrice = 0.05 ether; // Whitelist discount price
    
    // Metadata
    string private _baseTokenURI;     // Base URI for metadata
    string public placeholderURI;     // Placeholder before reveal
    bool public revealed = false;     // Reveal status
    
    // Whitelist
    bytes32 public merkleRoot;        // Merkle tree root for whitelist
    
    // Minting phases: 0 = paused, 1 = whitelist, 2 = public
    uint256 public mintPhase = 0;
    
    // Tracking
    mapping(address => uint256) public whitelistMinted;  // Whitelist mints per address
    mapping(address => uint256) public addressMinted;    // Total mints per address
    mapping(address => bool) public teamMembers;         // Team addresses
    address payable public treasury;                     // Fund receiver
    
    // ============ EVENTS ============
    event Minted(address indexed minter, uint256 indexed tokenId, uint256 phase);
    event PhaseChanged(uint256 newPhase);
    event Revealed();
    event WhitelistUpdated(bytes32 newRoot);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event TeamMemberAdded(address indexed member);
    event TeamMemberRemoved(address indexed member);
    
    // ============ MODIFIERS ============
    modifier mintingActive() {
        require(mintPhase > 0, "Minting is paused");
        _;
    }
    
    modifier correctPayment(uint256 quantity, uint256 price) {
        require(msg.value == quantity * price, "Incorrect payment amount");
        _;
    }
    
    modifier withinMaxPerTx(uint256 quantity) {
        require(quantity > 0 && quantity <= MAX_PER_TX, "Invalid mint quantity");
        _;
    }
    
    modifier withinSupply(uint256 quantity) {
        require(_tokenIdCounter + quantity - 1 <= MAX_SUPPLY, "Exceeds max supply");
        _;
    }
    
    modifier onlyTeam() {
        require(teamMembers[msg.sender], "Not a team member");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    /**
     * @dev Initializes the NFT collection
     * @param name_ Collection name
     * @param symbol_ Collection symbol
     * @param baseURI_ Base metadata URI
     * @param placeholderURI_ Placeholder URI before reveal
     * @param treasury_ Treasury address for withdrawals
     * @param teamAddresses Array of initial team members
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        string memory placeholderURI_,
        address payable treasury_,
        address[] memory teamAddresses
    ) ERC721(name_, symbol_) Ownable(msg.sender) {  // FIXED: Added Ownable(msg.sender)
        require(treasury_ != address(0), "Invalid treasury address");
        require(teamAddresses.length > 0, "No team addresses provided");
        
        _baseTokenURI = baseURI_;
        placeholderURI = placeholderURI_;
        treasury = treasury_;
        
        // Add owner to team members by default
        teamMembers[msg.sender] = true;
        
        // Add other team members
        for (uint256 i = 0; i < teamAddresses.length; i++) {
            teamMembers[teamAddresses[i]] = true;
        }
        // _tokenIdCounter already initialized to 1
    }
    
    // ============ MINTING FUNCTIONS ============
    
    /**
     * @dev Whitelist mint function
     * @param quantity Number of NFTs to mint
     * @param proof Merkle proof for whitelist verification
     */
    function whitelistMint(
        uint256 quantity,
        bytes32[] calldata proof
    ) external payable nonReentrant mintingActive 
        correctPayment(quantity, whitelistPrice)
        withinMaxPerTx(quantity) withinSupply(quantity) {
        
        require(mintPhase == 1, "Whitelist minting is not active");
        require(_verifyWhitelist(msg.sender, proof), "Address is not whitelisted");
        require(
            whitelistMinted[msg.sender] + quantity <= WHITELIST_MAX_PER_WALLET,
            "Exceeds whitelist mint limit"
        );
        
        whitelistMinted[msg.sender] += quantity;
        _mintTokens(msg.sender, quantity);
        emit Minted(msg.sender, _tokenIdCounter - 1, 1);
    }
    
    /**
     * @dev Public mint function
     * @param quantity Number of NFTs to mint
     */
    function publicMint(uint256 quantity)
        external payable nonReentrant mintingActive 
        correctPayment(quantity, publicPrice) withinMaxPerTx(quantity) withinSupply(quantity) {
        
        require(mintPhase == 2, "Public minting is not active");
        _mintTokens(msg.sender, quantity);
        emit Minted(msg.sender, _tokenIdCounter - 1, 2);
    }
    
    /**
     * @dev Team mint function
     * @param to Address to receive NFTs
     * @param quantity Number of NFTs to mint
     */
    function teamMint(address to, uint256 quantity) external onlyTeam withinSupply(quantity) {
        require(to != address(0), "Cannot mint to zero address");
        require(quantity <= 100, "Exceeds team mint limit");
        _mintTokens(to, quantity);
        emit Minted(to, _tokenIdCounter - 1, 0);
    }
    
    /**
     * @dev Internal minting logic
     * @param to Recipient address
     * @param quantity Number to mint
     */
    function _mintTokens(address to, uint256 quantity) private {
        uint256 startTokenId = _tokenIdCounter;
        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(to, startTokenId + i);
        }
        _tokenIdCounter += quantity;  // Update counter
        addressMinted[to] += quantity;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Returns total number of minted tokens
     * @return Total minted count
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;  // Subtract 1 because we started at 1
    }
    
    /**
     * @dev Returns remaining tokens available
     * @return Remaining supply
     */
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - (_tokenIdCounter - 1);
    }
    
    /**
     * @dev Returns token URI with reveal handling
     * @param tokenId Token ID
     * @return Token metadata URI
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        // Check if token exists (ownerOf reverts if token doesn't exist)
        require(_ownerOf(tokenId) != address(0), "ERC721: invalid token ID");
        
        if (!revealed) {
            return placeholderURI;
        }
        
        // If baseURI is set, concatenate tokenId, otherwise return empty string
        string memory baseURI = _baseURI();
        if (bytes(baseURI).length > 0) {
            return string(abi.encodePacked(baseURI, _toString(tokenId)));
        } else {
            return "";
        }
    }
    
    /**
     * @dev Returns base URI for metadata
     * @return Base URI string
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Helper function to convert uint256 to string
     * @param value Number to convert
     * @return String representation
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Verifies whitelist status using Merkle proof
     * @param account Address to verify
     * @param proof Merkle proof
     * @return True if whitelisted
     */
    function _verifyWhitelist(address account, bytes32[] calldata proof) private view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }
    
    /**
     * @dev Public function to check whitelist status
     * @param account Address to check
     * @param proof Merkle proof
     * @return True if whitelisted
     */
    function isWhitelisted(address account, bytes32[] calldata proof) external view returns (bool) {
        return _verifyWhitelist(account, proof);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Sets the minting phase
     * @param phase New phase: 0 = paused, 1 = whitelist, 2 = public
     */
    function setMintPhase(uint256 phase) external onlyOwner {
        require(phase <= 2, "Invalid phase (0-2 only)");
        mintPhase = phase;
        emit PhaseChanged(phase);
    }
    
    /**
     * @dev Sets the Merkle root for whitelist
     * @param newMerkleRoot New Merkle root
     */
    function setMerkleRoot(bytes32 newMerkleRoot) external onlyOwner {
        merkleRoot = newMerkleRoot;
        emit WhitelistUpdated(newMerkleRoot);
    }
    
    /**
     * @dev Sets the public mint price
     * @param newPrice New price in wei
     */
    function setPublicPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be > 0");
        publicPrice = newPrice;
    }
    
    /**
     * @dev Sets the whitelist mint price
     * @param newPrice New price in wei
     */
    function setWhitelistPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be > 0");
        whitelistPrice = newPrice;
    }
    
    /**
     * @dev Sets the base URI for metadata
     * @param newBaseURI New base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }
    
    /**
     * @dev Sets the placeholder URI
     * @param newPlaceholderURI New placeholder URI
     */
    function setPlaceholderURI(string memory newPlaceholderURI) external onlyOwner {
        placeholderURI = newPlaceholderURI;
    }
    
    /**
     * @dev Reveals the metadata
     */
    function reveal() external onlyOwner {
        require(!revealed, "Already revealed");
        revealed = true;
        emit Revealed();
    }
    
    /**
     * @dev Sets the treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address payable newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid address");
        treasury = newTreasury;
    }
    
    /**
     * @dev Withdraws contract balance to treasury
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = treasury.call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(treasury, balance);
    }
    
    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyOwner {
        mintPhase = 0;
        emit PhaseChanged(0);
    }
    
    /**
     * @dev Adds a team member
     * @param member Address to add as team member
     */
    function addTeamMember(address member) external onlyOwner {
        require(member != address(0), "Invalid address");
        require(!teamMembers[member], "Already a team member");
        teamMembers[member] = true;
        emit TeamMemberAdded(member);
    }
    
    /**
     * @dev Removes a team member
     * @param member Address to remove from team
     */
    function removeTeamMember(address member) external onlyOwner {
        require(teamMembers[member], "Not a team member");
        teamMembers[member] = false;
        emit TeamMemberRemoved(member);
    }
    
    /**
     * @dev Returns if an address is a team member
     * @param member Address to check
     * @return True if team member
     */
    function isTeamMember(address member) external view returns (bool) {
        return teamMembers[member];
    }
    
    // ============ OVERRIDES ============
    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}