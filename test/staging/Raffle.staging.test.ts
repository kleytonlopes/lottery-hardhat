import { assert, expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { Address } from "hardhat-deploy/types";
import { Raffle } from "../../typechain-types"
import { RAFFLE_CONTRACT_NAME, developmentChainIds } from "../../helper-hardhat-config";
const chainId = network.config.chainId ?? 1;
const isDevelomentChain = developmentChainIds.includes(chainId);

isDevelomentChain ? describe.skip :
describe("Raffle Staging Tests",function () {
    let deployerAddress: Address;
    let raffleContract: Raffle;
    let raffleContractAddress: Address;
    let raffleEntranceFee: BigInt;


    beforeEach(async function() {
        deployerAddress = (await ethers.provider.getSigner()).address;
        const raffleDeployment = await deployments.get(RAFFLE_CONTRACT_NAME);
        raffleContractAddress = raffleDeployment.address;
        raffleContract = await ethers.getContractAt(RAFFLE_CONTRACT_NAME, raffleContractAddress);
        raffleEntranceFee = await raffleContract.getEntranceFee();
    });

    describe("fulfillRandomWords", function(){
        it("picks a winner, resets and sends money", async () => {
            const startingTimestamp = await raffleContract.getLatestTimestamp();
            const accounts = await ethers.getSigners();
            const promiseWinnerPicked = new Promise<void>(async (resolve, reject) => {
                raffleContract.once(raffleContract.getEvent('WinnerPicked'), async () => {
                    console.log("WinnerPicked event fired!");
                    try{
                        const recentWinner = await raffleContract.getRecentWinner();
                        const raffleState = await raffleContract.getRaffleState();
                        const winnerEndingBalance = await ethers.provider.getBalance(await accounts[0].getAddress());
                        const endingTimestamp = await raffleContract.getLatestTimestamp();
                        
                        await expect(raffleContract.getPlayer(0)).to.be.reverted; 
                        assert.equal(recentWinner.toString(), await accounts[0].getAddress());
                        assert.equal(raffleState.toString(), "0");
                        const expectedEndingValue = winnerStartingBalance.valueOf() + raffleEntranceFee.valueOf();
                        assert.equal(winnerEndingBalance.toString(), expectedEndingValue.toString());
                        assert(endingTimestamp > startingTimestamp);
                        resolve();
                    }catch(e){
                        reject(e)
                    }
                });
                await raffleContract.enterRaffle({value: `${raffleEntranceFee}`});
                const winnerStartingBalance = await ethers.provider.getBalance(await accounts[0].getAddress());
            });
            await promiseWinnerPicked;
        });
    });
});