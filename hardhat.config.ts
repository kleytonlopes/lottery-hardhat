import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "@nomicfoundation/hardhat-ethers";
import '@typechain/hardhat'
import '@nomicfoundation/hardhat-chai-matchers'
import dotenv from 'dotenv'; 
dotenv.config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY || "";
const SEPOLIA_CHAIN_ID = 11155111;
const HARDHAT_CHAIN_ID = 31337;


const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: HARDHAT_CHAIN_ID,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [SEPOLIA_PRIVATE_KEY],
      chainId: SEPOLIA_CHAIN_ID
    }
  },
  solidity: {
    compilers: [
      {version: "0.8.19"},
      {version: "0.8.0"}
    ]
  },
  mocha:{
    timeout: 20000,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    }
  }
}

export default config;