import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { 
    CoFundingInterface,
} from "../typechain-types";
import { coFundingUtilsFixture } from "./utils/fixtures";
import { ethers } from "hardhat";
import { faucet } from "./utils/faucet";
import {
    randomHex,
} from "./utils/encoding";
import type { CoFundingUtilsFixtures } from "./utils/fixtures";
import { Wallet } from "ethers";
import { expect } from "chai";
describe("Test all CoFunding function with no marketplace related features.", async function () {

    const { provider } = ethers;
    const owner = new ethers.Wallet(randomHex(32), provider);

    let coFunding: CoFundingInterface;
    let createVaultFunctionDataStructure: CoFundingUtilsFixtures["createVaultFunctionDataStructure"];

    before(async () => {
        await faucet(owner.address, provider);
        ({
            coFunding,
            createVaultFunctionDataStructure 
        } = await coFundingUtilsFixture(owner));
    });

    let account1: Wallet;
    let account2: Wallet;
    let account3: Wallet;

    let sampleSeaport: Wallet;
    let sampleERC721: Wallet;

    beforeEach(async () => {
        // Setup basic buyer/seller wallets with ETH
        account1 = new ethers.Wallet(randomHex(32), provider);
        account2 = new ethers.Wallet(randomHex(32), provider);
        account3 = new ethers.Wallet(randomHex(32), provider);

        sampleSeaport = new ethers.Wallet(randomHex(32), provider);
        sampleERC721 = new ethers.Wallet(randomHex(32), provider);
        
        for (const wallet of [account1, account2, account3, sampleSeaport]) {
            await faucet(wallet.address, provider);
        }
    });

    describe("Create vault", async () => {
        it("Successfully create new vault", async () => {
            let now = Math.floor(new Date().getTime() / 1000.0);
            // const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
            //     1,
            //     sampleERC721.address,
            //     1,
            //     now,
            //     now + 100,
            //     2000,
            //     2500
            // );
            const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
                1,
                sampleERC721.address,
                1,
                1,
                100,
                2000,
                2500
            );
            
            await expect(
                coFunding.createVault(...createVaultParamTuple)
            ).to.be.revertedWith("ErrorTimeRange");

            // const tx = coFunding.createVault(...createVaultParamTuple);
            // const receipt = await (await tx).wait();
            // console.log(receipt);
        });
    });
});