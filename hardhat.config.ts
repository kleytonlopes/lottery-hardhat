import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "@nomicfoundation/hardhat-ethers";
import '@typechain/hardhat'
import '@nomicfoundation/hardhat-chai-matchers'
import dotenv from 'dotenv'; 
dotenv.config();


const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {version: "0.8.19"},
      {version: "0.8.0"}
    ]
  },
}

export default config;