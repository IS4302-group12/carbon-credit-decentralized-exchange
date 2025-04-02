// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is Ownable {
    IERC20 public cctToken; // Carbon Credit Token (CCT)
    uint256 public constant EXCHANGE_RATE = 1; // 1 CCT = 1 MATIC (static pricing)
    
    event TokensSold(address indexed seller, uint256 cctAmount, uint256 maticAmount);
    event LiquidityAdded(address indexed provider, uint256 maticAmount);

    // Constructor sets the CCT token address and initializes Ownable with msg.sender as owner
    constructor(address _cctToken) Ownable(msg.sender) {
        require(_cctToken != address(0), "Invalid CCT token address");
        cctToken = IERC20(_cctToken);
    }

    // Function to add MATIC liquidity to the marketplace (only owner)
    function addLiquidity() external payable onlyOwner {
        require(msg.value > 0, "Must send MATIC to add liquidity");
        emit LiquidityAdded(msg.sender, msg.value);
    }

    // Function to sell CCT tokens for MATIC
    function sellCCT(uint256 cctAmount) external {
        require(cctAmount > 0, "Amount must be greater than 0");
        
        // Check if the marketplace has enough MATIC liquidity
        uint256 maticAmount = cctAmount * EXCHANGE_RATE;
        require(address(this).balance >= maticAmount, "Insufficient MATIC liquidity in the contract");

        // Transfer CCT from seller to the contract
        require(cctToken.transferFrom(msg.sender, address(this), cctAmount), "CCT transfer failed");

        // Send MATIC to the seller
        (bool sent, ) = msg.sender.call{value: maticAmount}("");
        require(sent, "Failed to send MATIC");

        emit TokensSold(msg.sender, cctAmount, maticAmount);
    }

    // Function to withdraw MATIC (only owner, for managing liquidity)
    function withdrawMatic(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient MATIC balance");
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send MATIC");
    }

    // Function to withdraw CCT tokens (only owner, in case of emergency)
    function withdrawCCT(uint256 amount) external onlyOwner {
        require(cctToken.transfer(msg.sender, amount), "CCT withdrawal failed");
    }

    // Function to check contract's MATIC balance
    function getMaticBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Function to check contract's CCT balance
    function getCCTBalance() external view returns (uint256) {
        return cctToken.balanceOf(address(this));
    }

    // Receive function to accept MATIC directly
    receive() external payable {
        emit LiquidityAdded(msg.sender, msg.value);
    }
}