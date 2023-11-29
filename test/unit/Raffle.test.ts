import { assert, expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { Address } from "hardhat-deploy/types";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"
import { networks, RAFFLE_CONTRACT_NAME, VRF_COORDNINATOR_V2_MOCK_NAME, developmentChainIds } from "../../helper-hardhat-config";
const chainId = network.config.chainId ?? 1;
const networkConfig = networks[chainId];
const isDevelomentChain = developmentChainIds.includes(chainId);

!isDevelomentChain ? describe.skip :
describe("Raffle Unit Tests",function () {
    let deployerAddress: Address;
    let raffleContract: Raffle;
    let mockCoordinatorContract: VRFCoordinatorV2Mock;
    let raffleEntranceFee: BigInt;
    let raffleInterval: BigInt;


    beforeEach(async function() {
        await deployments.fixture(["all"]);
        deployerAddress = (await ethers.provider.getSigner()).address;
        const raffleDeployment = await deployments.get(RAFFLE_CONTRACT_NAME);
        const mockCoordinatorDeployment = await deployments.get(VRF_COORDNINATOR_V2_MOCK_NAME);
        raffleContract = await ethers.getContractAt(RAFFLE_CONTRACT_NAME, raffleDeployment.address);
        mockCoordinatorContract = await ethers.getContractAt(VRF_COORDNINATOR_V2_MOCK_NAME, mockCoordinatorDeployment.address);
        raffleEntranceFee = await raffleContract.getEntranceFee();
        raffleInterval = await raffleContract.getInterval();

    });

    describe("constructor", function(){
        it("Initializes the raffle correctly", async function() {
             const state = await raffleContract.getRaffleState();
             const numberOfPlayers = await raffleContract.getNumberOfPlayers();
             const callbakGasLimit = await raffleContract.getCallbackGasLimit();

             assert.equal(state.toString(), "0");
             assert.equal(raffleInterval.toString(), networkConfig.keepersUpdateInterval);
             assert.equal(raffleEntranceFee, networkConfig.raffleEntranceFee);
             assert.equal(numberOfPlayers.toString(), "0");
             assert.equal(callbakGasLimit.toString(), networkConfig.callbackGasLimit);
             //TODO: more constructor tests
        })
    })

    describe("enterRaffle",function(){
        it("reverts when you don't pay enough", async function() {
            await expect(raffleContract.enterRaffle())
                .to.be.revertedWithCustomError(raffleContract,"Raffle__NotEnoughETHEntered");
        }),
        it("record players when they enter", async function() {
            await raffleContract.enterRaffle({value: `${raffleEntranceFee}`});
            const playerFromContract = await raffleContract.getPlayer(0);
            assert.equal(playerFromContract, deployerAddress)
        }),
        it("emits event on enter", async function() {
            await expect(raffleContract.enterRaffle({value: `${raffleEntranceFee}`}))
                .to.emit(raffleContract,"RaffleEnter");
        }),
        it("doesnt allow entrance when raffle is calculating", async function() {
            await raffleContract.enterRaffle({value: raffleEntranceFee.valueOf()});
            const addInterval = Number(raffleInterval.valueOf() + BigInt(1));
            await network.provider.send("evm_increaseTime", [addInterval]);
            await network.provider.request({method: "evm_mine", params: []});
            //or => await network.provider.send("evm_mine");
            await raffleContract.performUpkeep("0x");
            await expect(raffleContract.enterRaffle({ value: `${raffleEntranceFee}` }))
                .to.be.revertedWithCustomError(raffleContract,"Raffle__NotOpen");
        })
    }),
    describe("checkUpkeep", function(){
        it("returns false if people haven't send any ETH", async function() {
            const addInterval = Number(raffleInterval.valueOf() + BigInt(1));
            await network.provider.send("evm_increaseTime", [addInterval]);
            await network.provider.send("evm_mine");
            const {upkeepNeeded} = await raffleContract.checkUpkeep.staticCall("0x");
            assert(!upkeepNeeded);
        }),
        it("returns false if raffle is't open", async function() {
            await raffleContract.enterRaffle({value: `${raffleEntranceFee}`});
            const addInterval = Number(raffleInterval.valueOf() + BigInt(1));
            await network.provider.send("evm_increaseTime", [addInterval]);
            await network.provider.send("evm_mine");
            await raffleContract.performUpkeep("0x");
            const raffleState = await raffleContract.getRaffleState();
            const {upkeepNeeded} = await raffleContract.checkUpkeep.staticCall("0x");
            assert.equal(raffleState.toString(), "1");
            assert(!upkeepNeeded);
        }),
        it("returns true enough time has passed, has players, eth and is open", async function() {
            await raffleContract.enterRaffle({value: `${raffleEntranceFee}`});
            const addInterval = Number(raffleInterval.valueOf() + BigInt(1));
            await network.provider.send("evm_increaseTime", [addInterval]);
            await network.provider.send("evm_mine");
            const {upkeepNeeded} = await raffleContract.checkUpkeep.staticCall("0x");
            assert(upkeepNeeded);
        })
    })
})