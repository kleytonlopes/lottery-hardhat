import { assert, expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { Address } from "hardhat-deploy/types";
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"
import { networks, RAFFLE_CONTRACT_NAME, VRF_COORDNINATOR_V2_MOCK_NAME, developmentChainIds } from "../../helper-hardhat-config";
import { HardhatEthersSigner, SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { EventLog } from "ethers";
const chainId = network.config.chainId ?? 1;
const networkConfig = networks[chainId];
const isDevelomentChain = developmentChainIds.includes(chainId);

!isDevelomentChain ? describe.skip :
describe("Raffle Unit Tests",function () {
    let deployerAddress: Address;
    let raffleContract: Raffle;
    let raffleContractAddress: Address;
    let mockCoordinatorContract: VRFCoordinatorV2Mock;
    let raffleEntranceFee: BigInt;
    let raffleInterval: BigInt;


    beforeEach(async function() {
        await deployments.fixture(["all"]);
        deployerAddress = (await ethers.provider.getSigner()).address;
        const raffleDeployment = await deployments.get(RAFFLE_CONTRACT_NAME);
        raffleContractAddress = raffleDeployment.address;
        const mockCoordinatorDeployment = await deployments.get(VRF_COORDNINATOR_V2_MOCK_NAME);
        raffleContract = await ethers.getContractAt(RAFFLE_CONTRACT_NAME, raffleContractAddress);
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
    }),
    describe("performUpkeep", function(){
        it("it can only run is checkUpkeep is true", async function() {
            await raffleContract.enterRaffle({value: `${raffleEntranceFee}`});
            const addInterval = Number(raffleInterval.valueOf() + BigInt(1));
            await network.provider.send("evm_increaseTime", [addInterval]);
            await network.provider.send("evm_mine");
            const tx = await raffleContract.performUpkeep("0x");
            assert(tx);
        }),
        it("revert if checkUpkeep is false", async function() {
            await expect(raffleContract.performUpkeep("0x")).to.revertedWithCustomError(
                raffleContract,
                "Raffle__UpkeepNotNeeded"
            );
        }),
        it("updates the raffle state, emits an event and calls the VRFCoordinatorV2", async function() {
            await raffleContract.enterRaffle({value: `${raffleEntranceFee}`});
            const addInterval = Number(raffleInterval.valueOf() + BigInt(1));
            await network.provider.send("evm_increaseTime", [addInterval]);
            await network.provider.send("evm_mine");
            const txResponse = await raffleContract.performUpkeep("0x");
            const txReceived = await txResponse.wait(1);
            const requestId = (txReceived!.logs![1] as EventLog).args.requestId;
            const raffleState = await raffleContract.getRaffleState();
            assert(requestId > 0);
            assert.equal(raffleState.toString(),'1');

        })
    }),
    describe("fulfillRandomWords", function(){
        beforeEach(async () => {
            await raffleContract.enterRaffle({ value: `${raffleEntranceFee}` })
            const addInterval = Number(raffleInterval.valueOf() + BigInt(1));
            await network.provider.send("evm_increaseTime", [addInterval])
            await network.provider.send("evm_mine");
        }),
        it("can only be called after performupkeep", async () => {
            await expect(
                mockCoordinatorContract.fulfillRandomWords(0, raffleContractAddress)
            ).to.be.revertedWith("nonexistent request");
            await expect(
                mockCoordinatorContract.fulfillRandomWords(1, raffleContractAddress)
            ).to.be.revertedWith("nonexistent request");
        }),
        it("picks a winner, resets and sends money", async () => {
            const additionalEntrances = 3
            const startingIndex = 2
            const accounts: SignerWithAddress[] = await ethers.getSigners();
            // const startingBalance = await ethers.provider.getBalance(await accounts[2].getAddress());

            for (let i = startingIndex; i < (startingIndex + additionalEntrances); i++) {
                let connectedRaffleAccount = await raffleContract.connect(accounts[i])
                await connectedRaffleAccount.enterRaffle({ value: `${raffleEntranceFee}` })
            }
            const numberOfPlayers = await raffleContract.getNumberOfPlayers();
            assert.equal(numberOfPlayers.toString(), "4");
            const startingTimeStamp = await raffleContract.getLatestTimestamp();
            const promiseWinnerPicked = new Promise<void>((resolve, reject) => {
                raffleContract.once(raffleContract.getEvent('WinnerPicked'), async () => {
                    try{
                        const recentWinner = await raffleContract.getRecentWinner();
                        const raffleState = await raffleContract.getRaffleState();
                        const winnerBalance = await ethers.provider.getBalance(accounts[2].address)
                        const endingTimeStamp = await raffleContract.getLatestTimestamp();
                        await expect(raffleContract.getPlayer(0)).to.be.reverted;
                        assert.equal(recentWinner.toString(), accounts[2].address);
                        assert.equal(raffleState.toString(), '0');
                        // assert.equal(
                        //     winnerBalance.toString(),
                        //     ((startingBalance + BigInt(4 * Number(raffleEntranceFee))).toString()).toString()
                        // );
                        assert(endingTimeStamp > startingTimeStamp);
                        resolve();
                    }catch(e){
                        reject(e)
                    }
                });

            });

            const txResponse = await raffleContract.performUpkeep("0x");
            const txReceived = await txResponse.wait(1);
            await mockCoordinatorContract.fulfillRandomWords(
                (txReceived!.logs![1] as EventLog).args.requestId,
                raffleContractAddress
            );
            await promiseWinnerPicked;
        })
    })
})