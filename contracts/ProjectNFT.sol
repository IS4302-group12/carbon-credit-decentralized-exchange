// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProjectToken is ERC721URIStorage {
    uint256 private _nextTokenId = 1;
    address public auditor; // Address of the assigned auditor
    
    mapping(uint256 => bool) public verified;
    
    struct NFTDetails {
        string projectName;
        address projectOwner;
        address auditor;
        uint256 carbonCredits;
        string location;
        uint256 issuanceDate;
        uint256 expirationDate;
        string reductionMethod;
        uint256 verificationDate;
    }
    
    mapping(uint256 => NFTDetails) public nftDetails;

    event ProjectNFTMinted(address indexed projectOwner, uint256 indexed tokenId, string projectName, uint256 carbonCredits);

    // Constructor initializes ERC721 and sets the auditor address
    constructor(address _auditor) ERC721("ProjectNFT", "PJNFT") {
        require(_auditor != address(0), "Invalid auditor address");
        auditor = _auditor;
    }

    // Modifier to restrict function access to the designated auditor
    modifier onlyAuditor() {
        require(msg.sender == auditor, "Only the auditor can perform this action");
        _;
    }

    function mintProjectNFT(
        string memory tokenURI,
        string memory projectName,
        address projectOwner,
        uint256 carbonCredits,
        string memory location,
        uint256 issuanceDate,
        uint256 expirationDate,
        string memory reductionMethod
    ) external onlyAuditor returns (uint256) {
        require(projectOwner != address(0), "Invalid project owner address");

        uint256 tokenId = _nextTokenId++;
        _mint(projectOwner, tokenId); // Automatically transferred to project owner
        _setTokenURI(tokenId, tokenURI);
        
        nftDetails[tokenId] = NFTDetails({
            projectName: projectName,
            projectOwner: projectOwner,
            auditor: auditor,
            carbonCredits: carbonCredits,
            location: location,
            issuanceDate: issuanceDate,
            expirationDate: expirationDate,
            reductionMethod: reductionMethod,
            verificationDate: block.timestamp // Set to the current timestamp
        });
        
        verified[tokenId] = true;
        emit ProjectNFTMinted(projectOwner, tokenId, projectName, carbonCredits);
        return tokenId;
    }
}
