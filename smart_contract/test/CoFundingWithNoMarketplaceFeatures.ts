import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { 
    CoFundingInterface
} from "../typechain-types";

import { 
    VaultInfoStruct,
    VaultInfoStructOutput
} from "../typechain-types/contracts/CoFunding";

import { coFundingUtilsFixture } from "./utils/fixtures";
import { ethers } from "hardhat";
import { faucet } from "./utils/faucet";
import {
    randomHex,
} from "./utils/encoding";
import type { CoFundingUtilsFixtures } from "./utils/fixtures";
import { BigNumber, Wallet } from "ethers";
import { expect } from "chai";
describe("Test all CoFunding function with no marketplace related features.", async function () {

    const { provider } = ethers;
    const owner = new ethers.Wallet(randomHex(32), provider);

    let coFunding: CoFundingInterface;
    let createVaultFunctionDataStructure: CoFundingUtilsFixtures["createVaultFunctionDataStructure"];

    let getTestItem721: CoFundingUtilsFixtures["getTestItem721"];
    let mint721: CoFundingUtilsFixtures["mint721"];
    let mintAndApprove721: CoFundingUtilsFixtures["mintAndApprove721"];
    let set721ApprovalForAll: CoFundingUtilsFixtures["set721ApprovalForAll"];
    let testERC721: CoFundingUtilsFixtures["testERC721"];


    let convertStructToOutputStruct: CoFundingUtilsFixtures["convertStructToOutputStruct"];
    let convertNumberToBytes32: CoFundingUtilsFixtures["convertNumberToBytes32"];
    
    before(async () => {
        await faucet(owner.address, provider);
        ({
            coFunding,
            createVaultFunctionDataStructure,
            getTestItem721,
            mint721,
            mintAndApprove721,
            set721ApprovalForAll,
            testERC721,

            convertStructToOutputStruct,
            convertNumberToBytes32
        } = await coFundingUtilsFixture(owner));
    });

    let account1: Wallet;
    let account2: Wallet;
    let account3: Wallet;

    let validNewNFTID = 1;
    let validNewVaultID = 1;

    let sampleSeaport: Wallet;
    
    const createSampleERC721NFT = async (nftOwner: Wallet) => {
        const nftId = await mint721(
            nftOwner,
            validNewNFTID
        );
        validNewNFTID = validNewNFTID + 1;
        return {nftId};
    };

    const createSampleVault = async () => {
        const sampleERC721NFT = await createSampleERC721NFT(owner);
        let now = Math.floor(new Date().getTime() / 1000.0);
        const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
            validNewVaultID,
            testERC721.address,
            sampleERC721NFT.nftId.toNumber(),
            now + 10,
            now + 100,
            2000,
            2500
        );
        await coFunding.createVault(...createVaultParamTuple);
        validNewVaultID = validNewVaultID+1;
        const sampleVaultData = {
            vaultID: validNewVaultID - 1,
            nftCollection: testERC721.address,
            nftID: sampleERC721NFT.nftId,
            startFundingTime: BigNumber.from(createVaultParamObj.startFundingTime),
            endFundingTime: BigNumber.from(createVaultParamObj.endFundingTime),
            initialPrice: BigNumber.from(createVaultParamObj.initialPrice),
            boughtPrice: BigNumber.from(0),
            sellingPrice: BigNumber.from(0),
            defaultExpectedPrice: BigNumber.from(createVaultParamObj.defaultExpectedPrice),
            totalAmount: BigNumber.from(0),
            vaultState: 0,
        }
        return{
            sampleVaultData,
            sampleERC721NFT
        };
    };

    beforeEach(async () => {
        // Setup basic buyer/seller wallets with ETH
        account1 = new ethers.Wallet(randomHex(32), provider);
        account2 = new ethers.Wallet(randomHex(32), provider);
        account3 = new ethers.Wallet(randomHex(32), provider);

        sampleSeaport = new ethers.Wallet(randomHex(32), provider);
        
        for (const wallet of [account1, account2, account3, sampleSeaport]) {
            await faucet(wallet.address, provider);
        }
    });

    describe("Create vault", async () => {
        it("Assert (true) create new vault", async () => {
            let now = Math.floor(new Date().getTime() / 1000.0);
            const nftId = await mint721(
                owner,
                validNewNFTID
            );
            validNewNFTID = validNewNFTID + 1;

            const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
                validNewVaultID,
                testERC721.address,
                nftId.toNumber(),
                now + 10,
                now + 100,
                2000,
                2500
            );
            validNewVaultID = validNewVaultID+1;

            const expectedCreateVaultParamObj = {
                nftCollection: testERC721.address,
                nftID: nftId,
                startFundingTime: BigNumber.from(createVaultParamObj.startFundingTime),
                endFundingTime: BigNumber.from(createVaultParamObj.endFundingTime),
                initialPrice: BigNumber.from(createVaultParamObj.initialPrice),
                boughtPrice: BigNumber.from(0),
                sellingPrice: BigNumber.from(0),
                defaultExpectedPrice: BigNumber.from(createVaultParamObj.defaultExpectedPrice),
                totalAmount: BigNumber.from(0),
                vaultState: 0,
            }
            const expectedCreateVaultParamOutput = convertStructToOutputStruct(expectedCreateVaultParamObj);
            await coFunding.createVault(...createVaultParamTuple);

            expect(await coFunding.getVault(createVaultParamObj.vaultID)).to.deep.equal(
                expectedCreateVaultParamOutput
            );

        });
        it("Assert (false) revert with error duplicate vaultID", async () => {
            let oldVaultID = validNewVaultID - 1;
            let now = Math.floor(new Date().getTime() / 1000.0);
            let oldNFTID = validNewNFTID - 1;
            const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
                oldVaultID,
                testERC721.address,
                oldNFTID,
                now + 10,
                now + 100,
                2000,
                2500
            );

            await expect(
                coFunding.createVault(...createVaultParamTuple)
            ).to.be.revertedWith("VaultIDExisted");
        });
        it("Assert (false) revert with error startFundingTime < block.timestamp", async () => {
            let now = Math.floor(new Date().getTime() / 1000.0);
            const nftId = await mintAndApprove721(
                owner,
                sampleSeaport.address,
                validNewNFTID
            );
            validNewNFTID = validNewNFTID + 1;

            const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
                validNewVaultID,
                testERC721.address,
                nftId.toNumber(),
                now - 10,
                now + 100,
                2000,
                2500
            );

            await expect(
                coFunding.createVault(...createVaultParamTuple)
            ).to.be.revertedWith("ErrorTimeRange");

        });
        it("Assert (false) revert with error endFundingTime < startFundingTime", async () => {
            let now = Math.floor(new Date().getTime() / 1000.0);
            const nftId = await mintAndApprove721(
                owner,
                sampleSeaport.address,
                validNewNFTID
            );

            const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
                validNewVaultID,
                testERC721.address,
                nftId.toNumber(),
                now + 150,
                now + 100,
                2000,
                2500
            );

            await expect(
                coFunding.createVault(...createVaultParamTuple)
            ).to.be.revertedWith("ErrorTimeRange");
        });
    });

    describe("Set selling price", async () => {
        const {sampleVaultData,sampleERC721NFT} = await createSampleVault(); 
        it("Assert (true) set selling price", async () => {
            let depositDirectlyToSpendingWalletAmount = 10000;
            let expectedSellingPrice = 99999;
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            await coFunding.connect(account1).setSellingPrice(convertNumberToBytes32(sampleVaultData.vaultID), expectedSellingPrice);

            //check _userContributions[vaultID][msg.sender]
            // expect(await coFunding.getContributionInVault(convertNumberToBytes32(sampleVaultData.vaultID), account1.address)).to.deep.equal(
            //     expectedCreateVaultParamOutput
            // );
            //check vaultSellingPrice
            //check emit UserSetSellingPrice
        });
    });
    // describe("", async () => {
    //     it("Assert (true)", async () => {
    //     });
    //     it("Assert (false)", async () => {
    //     });
    // });
});