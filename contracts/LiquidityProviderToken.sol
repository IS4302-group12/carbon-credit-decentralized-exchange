// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LiquidityProviderToken is ERC20 {
    address public marketplace;

    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "Only Marketplace can call this");
        _;
    }

    constructor(string memory name, string memory symbol, address _marketplace) ERC20(name, symbol) {
        require(_marketplace != address(0), "Invalid Marketplace address");
        marketplace = _marketplace;
    }

    function mint(address to, uint256 amount) external onlyMarketplace {
        _mint(to, amount);
    }

    function burnFrom(address from, uint256 amount) external onlyMarketplace {
        _burn(from, amount);
    }
}