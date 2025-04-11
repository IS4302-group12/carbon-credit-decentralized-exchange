// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./LiquidityProviderToken.sol";

contract Marketplace is Ownable {
    IERC20 public ccToken; // Carbon Credit Token (CCT)
    LiquidityProviderToken public lpToken; // Liquidity Provider Token
    uint256 public constant EXCHANGE_RATE = 1000000000000000000; // 1 CCT = 1 MATIC (static pricing)
    uint256 public constant FEE_PERCENTAGE = 50; // 0.5% fee (50 / 10000)
    uint256 public constant FEE_DENOMINATOR = 10000;

    mapping(address => uint256) public liquidityProvided;
    uint256 public totalLiquidity;
    uint256 public totalFees;

    event TokensSold(address indexed seller, uint256 cctAmount, uint256 maticAmount);
    event TokensBought(address indexed buyer, uint256 cctAmount, uint256 maticAmount);
    event LiquidityAdded(address indexed provider, uint256 maticAmount, uint256 lpTokens);
    event LiquidityWithdrawn(address indexed provider, uint256 maticAmount, uint256 lpTokens);
    event Paying(uint256 amount);

    constructor(address _ccToken) Ownable(msg.sender) {
        require(_ccToken != address(0), "Invalid CCT token address");
        ccToken = IERC20(_ccToken);
    }

    function setLpToken(address _lpToken) external onlyOwner {
        require(_lpToken != address(0), "Invalid LP token address");
        require(address(lpToken) == address(0), "LP token already set");
        lpToken = LiquidityProviderToken(_lpToken);
    }

    function addLiquidity() external payable {
        require(msg.value > 0, "Must send MATIC to add liquidity");
        require(address(lpToken) != address(0), "LP token not set");

        uint256 lpTokens = totalLiquidity == 0 ? msg.value : (msg.value * lpToken.totalSupply()) / totalLiquidity;
        liquidityProvided[msg.sender] += msg.value;
        totalLiquidity += msg.value;
        lpToken.mint(msg.sender, lpTokens);

        emit LiquidityAdded(msg.sender, msg.value, lpTokens);
    }

    function sellCCT(uint256 cctAmount) external {
        require(cctAmount > 0, "Amount must be greater than 0");
        require(totalLiquidity >= cctAmount * EXCHANGE_RATE, "Insufficient MATIC liquidity");

        uint256 maticAmount = cctAmount * EXCHANGE_RATE;
        uint256 fee = (maticAmount * FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 netMatic = maticAmount - fee;
        totalFees += fee;

        require(ccToken.transferFrom(msg.sender, address(this), cctAmount), "CCT transfer failed");

        totalLiquidity -= maticAmount;
        (bool sent, ) = msg.sender.call{value: netMatic}("");
        require(sent, "Failed to send MATIC");

        emit TokensSold(msg.sender, cctAmount, netMatic);
    }

    function buyCCT(uint256 cctAmount) external payable {
        require(cctAmount > 0, "Amount must be greater than 0");
        uint256 maticAmount = cctAmount * EXCHANGE_RATE;
        emit Paying(msg.value);
        require(msg.value >= maticAmount, "Insufficient MATIC sent");
        uint256 cctBalance = ccToken.balanceOf(address(this));
        require(cctBalance >= cctAmount, "Insufficient CCT liquidity");

        uint256 fee = (maticAmount * FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 netMatic = maticAmount - fee;
        totalFees += fee;
        totalLiquidity += netMatic;

        require(ccToken.transfer(msg.sender, cctAmount), "CCT transfer failed");

        // Refund excess MATIC if sent
        if (msg.value > maticAmount) {
            (bool sent, ) = msg.sender.call{value: msg.value - maticAmount}("");
            require(sent, "Failed to refund excess MATIC");
        }

        emit TokensBought(msg.sender, cctAmount, maticAmount);
    }

    function withdrawLiquidity(uint256 lpAmount) external {
        require(lpAmount > 0, "Amount must be greater than 0");
        require(lpToken.balanceOf(msg.sender) >= lpAmount, "Insufficient LP tokens");

        uint256 maticShare = (lpAmount * totalLiquidity) / lpToken.totalSupply();
        uint256 feeShare = (lpAmount * totalFees) / lpToken.totalSupply();
        uint256 totalWithdrawal = maticShare + feeShare;

        require(address(this).balance >= totalWithdrawal, "Insufficient contract balance");

        lpToken.burnFrom(msg.sender, lpAmount);
        liquidityProvided[msg.sender] -= maticShare;
        totalLiquidity -= maticShare;
        totalFees -= feeShare;

        (bool sent, ) = msg.sender.call{value: totalWithdrawal}("");
        require(sent, "Failed to send MATIC");

        emit LiquidityWithdrawn(msg.sender, totalWithdrawal, lpAmount);
    }

    function withdrawCCT(uint256 amount) external onlyOwner {
        require(ccToken.transfer(msg.sender, amount), "CCT withdrawal failed");
    }

    function getMaticBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getCCTBalance() external view returns (uint256) {
        return ccToken.balanceOf(address(this));
    }

    receive() external payable {
        require(msg.value > 0, "Must send MATIC to add liquidity");
        require(address(lpToken) != address(0), "LP token not set");
        uint256 lpTokens = totalLiquidity == 0 ? msg.value : (msg.value * lpToken.totalSupply()) / totalLiquidity;
        liquidityProvided[msg.sender] += msg.value;
        totalLiquidity += msg.value;
        lpToken.mint(msg.sender, lpTokens);
        emit LiquidityAdded(msg.sender, msg.value, lpTokens);
    }
}