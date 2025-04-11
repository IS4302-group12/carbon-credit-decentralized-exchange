// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./ProjectNFT.sol";
import "./Marketplace.sol";

contract CarbonCreditToken is ERC20 {
    address public auditor; // Address of the assigned auditor
    address public marketplace;
    ProjectToken public greenNFT; // Reference to the Green NFT contract

    struct CreditInfo {
        uint256 amount;
        uint256 expiry;
    }
    
    mapping(address => CreditInfo) public creditExpiry;
    mapping(address => string) public reductionMethods; // Tracks the reduction method per project

    event CarbonCreditsIssued(address indexed projectOwner, uint256 amount, uint256 expiry);
    event CarbonCreditsRetired(address indexed holder, uint256 amount);
    event ReductionMethodSet(address indexed projectOwner, string method);

    // Constructor initializes the token, assigns the auditor, and sets the Green NFT contract address
    constructor(address _auditor, address _greenNFT, address _marketplace) ERC20("CarbonCredit", "CCT") {
        require(_auditor != address(0), "Invalid auditor address");
        require(_greenNFT != address(0), "Invalid NFT contract address");
        auditor = _auditor;
        marketplace = _marketplace;
        greenNFT = ProjectToken(_greenNFT);
    }

    // Modifier to restrict function access to the designated auditor
    modifier onlyAuditor() {
        require(msg.sender == auditor, "Only the auditor can perform this action");
        _;
    }

    // Function to issue (mint) carbon credits to a project owner, ensuring they own a Green NFT
    function issueCarbonCredits(address projectOwner, uint256 amount, uint256 expiry) external onlyAuditor {
        require(projectOwner != address(0), "Invalid project owner address");
        require(greenNFT.balanceOf(projectOwner) > 0, "Project owner must have a verified Green NFT");
        require(expiry > block.timestamp, "Expiry must be in the future");
        
        creditExpiry[projectOwner] = CreditInfo(amount, expiry);
        _mint(projectOwner, amount);
        _approve(projectOwner, address(marketplace), amount);
        emit CarbonCreditsIssued(projectOwner, amount, expiry);
    }

    // Function to retire (burn) carbon credits, making them non-transferable
    function retireCarbonCredits(uint256 amount) external {
        _burn(msg.sender, amount);
        emit CarbonCreditsRetired(msg.sender, amount);
    }

    // Function to set the reduction method for a project
    function setReductionMethod(address projectOwner, string memory method) external onlyAuditor {
        require(bytes(method).length > 0, "Reduction method required");
        reductionMethods[projectOwner] = method;
        emit ReductionMethodSet(projectOwner, method);
    }

}
