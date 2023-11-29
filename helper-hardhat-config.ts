import {ethers} from 'hardhat';

interface Network {
    name: String,
    subscriptionId?: String
    gasLane?: string 
    keepersUpdateInterval: string 
    raffleEntranceFee?: bigint 
    callbackGasLimit?: string 
    vrfCoordinatorV2?: string
};

//gasline: //https://docs.chain.link/vrf/v2/subscription/supported-networks
export const networks: {[key: number]: Network} = {
    11155111: {
        name: "Sepolia",
        subscriptionId: "557",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
        keepersUpdateInterval: "30",
        raffleEntranceFee: ethers.parseEther("0.01"), // 0.01 ETH
        callbackGasLimit: "500000", // 500,000 gas
    },
    31337: {
        name: "Local",
        subscriptionId: "557",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
        keepersUpdateInterval: "30",
        raffleEntranceFee: ethers.parseEther("0.01"), // 0.01 ETH
        callbackGasLimit: "500000", // 500,000 gas
    },
    1: {
        name: "mainnet",
        keepersUpdateInterval: "30",
    }
};

export const developmentChains = ["hardhat", "localhost"];
export const developmentChainIds = [31337];
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
export const VRF_COORDNINATOR_V2_MOCK_NAME = "VRFCoordinatorV2Mock";
export const RAFFLE_CONTRACT_NAME = "Raffle";


