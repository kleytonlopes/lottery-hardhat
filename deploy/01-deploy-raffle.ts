import { HardhatRuntimeEnvironment } from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types"
import { network, ethers } from "hardhat";
import {
    networks, 
    developmentChainIds,
    VRF_COORDNINATOR_V2_MOCK_NAME,
    RAFFLE_CONTRACT_NAME,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config";

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("2"); //2 ETH

const deployLottery: DeployFunction = async function deploy({ getNamedAccounts, deployments } : HardhatRuntimeEnvironment){
    const { deploy } = deployments;
    const {deployer} = await getNamedAccounts();
    const chainId: number = network.config.chainId ?? -1;
    const isDevelopmentChain = developmentChainIds.includes(chainId);
    const networkConfig = networks[chainId];

    let vrfCoordinatorV2Address, subscriptionId;

    if(isDevelopmentChain){
        const {address} = await deployments.get(
            VRF_COORDNINATOR_V2_MOCK_NAME
        );
        const vrfCoordinatorV2MockContract = await ethers.getContractAt(
            VRF_COORDNINATOR_V2_MOCK_NAME, address
        );
        const transactionResponse = await vrfCoordinatorV2MockContract.createSubscription();
        const transactionReceipt =  await transactionResponse.wait();
        vrfCoordinatorV2Address = address;
        subscriptionId = transactionReceipt.logs[0].args.subId;
        await vrfCoordinatorV2MockContract.fundSubscription(
            subscriptionId, VRF_SUB_FUND_AMOUNT
        );
    }else{
        vrfCoordinatorV2Address = networkConfig.vrfCoordinatorV2;
        subscriptionId = networkConfig.subscriptionId;
    }

    const waitConfirmations = isDevelopmentChain
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS

    const args = [
        vrfCoordinatorV2Address,
        networkConfig.raffleEntranceFee,
        networkConfig.gasLane,
        subscriptionId,
        networkConfig.callbackGasLimit,
        networkConfig.keepersUpdateInterval,
    ];
    const deployResult = await deploy(RAFFLE_CONTRACT_NAME, {
        from: deployer,
        args,
        waitConfirmations,
        log: true,
    });
    console.log(deployResult);
}

export default deployLottery;