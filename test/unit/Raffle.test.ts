import { assert, expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Address } from "hardhat-deploy/types";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"
import { networks, RAFFLE_CONTRACT_NAME, VRF_COORDNINATOR_V2_MOCK_NAME, developmentChainIds } from "../../helper-hardhat-config";
const chainId = network.config.chainId ?? 1;
const networkConfig = networks[chainId];
const isDevelomentChain = developmentChainIds.includes(chainId);

!isDevelomentChain ? describe.skip :
describe("Raffle Unit Tests", async function () {
    let deployerAddress: Address;
    let raffleContract: Raffle;
    let mockCoordinatorContract: VRFCoordinatorV2Mock;
    let lastBlockTimestamp: BigInt;
    let raffleEntranceFee: BigInt;

    beforeEach(async function() {
        await deployments.fixture(["all"]);
        deployerAddress = (await ethers.provider.getSigner()).address;
        const raffleDeployment = await deployments.get(RAFFLE_CONTRACT_NAME);
        const mockCoordinatorDeployment = await deployments.get(VRF_COORDNINATOR_V2_MOCK_NAME);
        raffleContract = await ethers.getContractAt(RAFFLE_CONTRACT_NAME, raffleDeployment.address);
        mockCoordinatorContract = await ethers.getContractAt(VRF_COORDNINATOR_V2_MOCK_NAME, mockCoordinatorDeployment.address);
        lastBlockTimestamp = BigInt(await time.latest());
        raffleEntranceFee = await raffleContract.getEntranceFee();
    });

    describe("constructor", async function(){
        it("Initializes the raffle correctly", async function() {
             const state = await raffleContract.getRaffleState();
             const interval = await raffleContract.getInterval();
             const numberOfPlayers = await raffleContract.getNumberOfPlayers();
             const lastTimestamp = await raffleContract.getLatestTimestamp();
             const callbakGasLimit = await raffleContract.getCallbackGasLimit();

             assert.equal(state.toString(), "0");
             assert.equal(interval.toString(), networkConfig.keepersUpdateInterval);
             assert.equal(raffleEntranceFee, networkConfig.raffleEntranceFee);
             assert.equal(numberOfPlayers.toString(), "0");
             assert.equal(lastTimestamp, lastBlockTimestamp);
             assert.equal(callbakGasLimit.toString(), networkConfig.callbackGasLimit);
             //TODO: more constructor tests
        })
    })

    describe("enterRaffle", async function(){
        it("reverts when you don't pay enough", async function() {
            await expect(raffleContract.enterRaffle())
                .to.be.revertedWithCustomError(raffleContract,"Raffle__NotEnoughETHEntered");
        }),
        it("record players when they enter", async function() {
            await raffleContract.enterRaffle({value: `${raffleEntranceFee}`});
            const playerFromContract = await raffleContract.getPlayer(0);
            assert.equal(playerFromContract, deployerAddress)
        })
    })
})