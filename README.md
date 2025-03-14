# Carbon Credit Decentralized Exchange

A decentralized exchange (DEX) for trading carbon credit tokens, built using Hardhat. This project aims to facilitate the trading of tokenized carbon credits in a transparent and decentralized manner.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- Basic understanding of Ethereum smart contracts and Hardhat

## Installation

Follow these steps to set up the project locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/IS4302-group12/carbon-credit-decentralized-exchange
   cd carbon-credit-decentralized-exchange
   ```
2. **Install dependencies**
    '''bash
    npm install
    ```
3. **Compile**
    ```bash
    npx hardhat compile
    ```
4. **Run**
    ```bash
    npx hardhat test
    npx hardhat node
    npx hardhat run scripts/deploy.js --network localhost
    ```
5. **Test**
    ```bash
    npx hardhat test
    ```