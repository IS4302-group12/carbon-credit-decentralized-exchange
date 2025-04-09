import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-ethernal";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  ethernal: { 
    apiToken: process.env.ETHERNAL_API_TOKEN,
    disableSync: false,
    uploadAst: true,
    disabled: false,
  },
};

export default config;