import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import dotenv from 'dotenv'; 

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {version: "0.8.19"},
      {version: "0.8.0"}
    ]
  },
}

export default config;