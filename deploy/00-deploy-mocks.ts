import { network, ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";
import {
    VRF_COORDNINATOR_V2_MOCK_NAME,
    developmentChainIds
} from "../helper-hardhat-config";

const BASE_FEE = ethers.parseEther("0.25");
const GAS_PRICE_LINK = 1e9;

const deployMocks: DeployFunction = async function deploy(
    { getNamedAccounts, deployments }: HardhatRuntimeEnvironment
){
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();

    const isDevelopmentChain = developmentChainIds.includes(
        network.config.chainId ?? 0
    );
    if(isDevelopmentChain){
        log("Local network detected! Deploying mocks..");
        const args = [BASE_FEE, GAS_PRICE_LINK];
        await deploy(VRF_COORDNINATOR_V2_MOCK_NAME, {
            from: deployer,
            contract: VRF_COORDNINATOR_V2_MOCK_NAME,
            args,
            log: true,
        });
        log("Mocks deployed!");
        log("------------------------------------------");
    }
};

deployMocks.tags = ["all", "mocks"];
export default deployMocks;
