import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { 
    CoFundingInterface
} from "../typechain-types";

import { 
    UserContributionStruct
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
    let convertBigNumberToBytes32: CoFundingUtilsFixtures["convertBigNumberToBytes32"];
    let calculateExpectedSellingPrice: CoFundingUtilsFixtures["calculateExpectedSellingPrice"];
    
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
            convertBigNumberToBytes32,
            calculateExpectedSellingPrice

        } = await coFundingUtilsFixture(owner));
    });

    let account1: Wallet;
    let account2: Wallet;
    let account3: Wallet;

    let validNewNFTID = 1;
    let validNewVaultID = 1;
    let defaultInitialPrice = 2000;
    let defaultExpectedPrice = 2500;
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
            now + 50,
            now + 100,
            defaultInitialPrice,
            defaultExpectedPrice
        );
        await coFunding.createVault(...createVaultParamTuple);
        validNewVaultID = validNewVaultID+1;
        const sampleVaultData = {
            vaultID: convertBigNumberToBytes32(validNewVaultID - 1),
            vaultIDBigInt: BigNumber.from(validNewVaultID - 1),
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

    // describe("Create vault", async () => {
    //     it("Assert (true) create new vault", async () => {
    //         let now = Math.floor(new Date().getTime() / 1000.0);
    //         const nftId = await mint721(
    //             owner,
    //             validNewNFTID
    //         );
    //         validNewNFTID = validNewNFTID + 1;

    //         const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
    //             validNewVaultID,
    //             testERC721.address,
    //             nftId.toNumber(),
    //             now + 10,
    //             now + 100,
    //             2000,
    //             2500
    //         );
    //         validNewVaultID = validNewVaultID+1;

    //         const expectedCreateVaultParamObj = {
    //             nftCollection: testERC721.address,
    //             nftID: nftId,
    //             startFundingTime: BigNumber.from(createVaultParamObj.startFundingTime),
    //             endFundingTime: BigNumber.from(createVaultParamObj.endFundingTime),
    //             initialPrice: BigNumber.from(createVaultParamObj.initialPrice),
    //             boughtPrice: BigNumber.from(0),
    //             sellingPrice: BigNumber.from(0),
    //             defaultExpectedPrice: BigNumber.from(createVaultParamObj.defaultExpectedPrice),
    //             totalAmount: BigNumber.from(0),
    //             vaultState: 0,
    //         }
    //         const expectedCreateVaultParamOutput = convertStructToOutputStruct(expectedCreateVaultParamObj);
    //         await coFunding.createVault(...createVaultParamTuple);

    //         expect(await coFunding.getVault(createVaultParamObj.vaultID)).to.deep.equal(
    //             expectedCreateVaultParamOutput
    //         );

    //     });
    //     it("Assert (false) revert with error duplicate vaultID", async () => {
    //         let oldVaultID = validNewVaultID - 1;
    //         let now = Math.floor(new Date().getTime() / 1000.0);
    //         let oldNFTID = validNewNFTID - 1;
    //         const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
    //             oldVaultID,
    //             testERC721.address,
    //             oldNFTID,
    //             now + 10,
    //             now + 100,
    //             2000,
    //             2500
    //         );

    //         await expect(
    //             coFunding.createVault(...createVaultParamTuple)
    //         ).to.be.revertedWith("VaultIDExisted");
    //     });
    //     it("Assert (false) revert with error startFundingTime < block.timestamp", async () => {
    //         let now = Math.floor(new Date().getTime() / 1000.0);
    //         const nftId = await mintAndApprove721(
    //             owner,
    //             sampleSeaport.address,
    //             validNewNFTID
    //         );
    //         validNewNFTID = validNewNFTID + 1;

    //         const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
    //             validNewVaultID,
    //             testERC721.address,
    //             nftId.toNumber(),
    //             now - 10,
    //             now + 100,
    //             2000,
    //             2500
    //         );

    //         await expect(
    //             coFunding.createVault(...createVaultParamTuple)
    //         ).to.be.revertedWith("ErrorTimeRange");

    //     });
    //     it("Assert (false) revert with error endFundingTime < startFundingTime", async () => {
    //         let now = Math.floor(new Date().getTime() / 1000.0);
    //         const nftId = await mintAndApprove721(
    //             owner,
    //             sampleSeaport.address,
    //             validNewNFTID
    //         );

    //         const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
    //             validNewVaultID,
    //             testERC721.address,
    //             nftId.toNumber(),
    //             now + 150,
    //             now + 100,
    //             2000,
    //             2500
    //         );

    //         await expect(
    //             coFunding.createVault(...createVaultParamTuple)
    //         ).to.be.revertedWith("ErrorTimeRange");
    //     });
    // });

    describe("Set selling price", async () => {
        // describe("Assert (true) set selling price", async () => {
        //     it("Expected Selling Price is not decimal", async () => {
        //         const {sampleVaultData} = await createSampleVault(); 
        //         let depositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
        //         let expectedSellingPrice = BigNumber.from(3000);
        //         await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositDirectlyToSpendingWalletAmount});
    
        //         await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, expectedSellingPrice))
        //             .to.emit(coFunding, "UserSetSellingPrice")
        //             .withArgs(sampleVaultData.vaultID, expectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));
    
    
        //         //check _userContributions[vaultID][msg.sender]
        //         let expectedUserContribution:UserContributionStruct = {
        //             contributionAmount: depositDirectlyToSpendingWalletAmount,
        //             expectedSellingPrice: expectedSellingPrice
        //         }
        //         expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
        //             convertStructToOutputStruct(expectedUserContribution)
        //         );
    
        //         //(Vault_total_amount <= Initial_price) && (Full set expected price)
    
        //         //(Vault_total_amount <= Initial_price) && (Not full set expected price)
    
        //         //(Vault_total_amount > Initial_price) && (Full set expected price)
                
        //         //(Vault_total_amount > Initial_price) && (Not full set expected price)
        //     });

        //     it("Expected Selling Price is decimal", async () => {
        //         const {sampleVaultData} = await createSampleVault(); 
        //         let depositDirectlyToSpendingWalletAmount = BigNumber.from(999);
        //         let expectedSellingPrice = BigNumber.from(2999);
        //         await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositDirectlyToSpendingWalletAmount});
    
        //         await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, expectedSellingPrice))
        //             .to.emit(coFunding, "UserSetSellingPrice")
        //             .withArgs(sampleVaultData.vaultID, expectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));

        //         let expectedUserContribution:UserContributionStruct = {
        //             contributionAmount: depositDirectlyToSpendingWalletAmount,
        //             expectedSellingPrice: expectedSellingPrice
        //         }
        //         expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
        //             convertStructToOutputStruct(expectedUserContribution)
        //         );
        //     });

        //     it("Total vault amount not exceed initial buy && All participants set expected price", async () => {
        //         const {sampleVaultData} = await createSampleVault(); 
        //         let account1DepositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
        //         let account2DepositDirectlyToSpendingWalletAmount = BigNumber.from(500);
        //         let account1ExpectedSellingPrice = BigNumber.from(3000);
        //         let account2ExpectedSellingPrice = BigNumber.from(4000);
        //         await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositDirectlyToSpendingWalletAmount});
                
                
        //         await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, account1ExpectedSellingPrice))
        //             .to.emit(coFunding, "UserSetSellingPrice")
        //             .withArgs(sampleVaultData.vaultID, account1ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));
                
        //         await coFunding.connect(account2).depositDirectlyToVault(sampleVaultData.vaultID,{value: account2DepositDirectlyToSpendingWalletAmount});
        //         await expect(coFunding.connect(account2).setSellingPrice(sampleVaultData.vaultID, account2ExpectedSellingPrice))
        //             .to.emit(coFunding, "UserSetSellingPrice")
        //             .withArgs(sampleVaultData.vaultID, account2ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));
    
        //         let account1ExpectedUserContribution:UserContributionStruct = {
        //             contributionAmount: account1DepositDirectlyToSpendingWalletAmount,
        //             expectedSellingPrice: account1ExpectedSellingPrice
        //         }
        //         expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
        //             convertStructToOutputStruct(account1ExpectedUserContribution)
        //         );
        //         let account2ExpectedUserContribution:UserContributionStruct = {
        //             contributionAmount: account2DepositDirectlyToSpendingWalletAmount,
        //             expectedSellingPrice: account2ExpectedSellingPrice
        //         }
        //         expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account2.address)).to.deep.equal(
        //             convertStructToOutputStruct(account2ExpectedUserContribution)
        //         );

        //     });

        //     it("Total vault amount not exceed initial buy && All participants not set expected price", async () => {
        //         const {sampleVaultData} = await createSampleVault(); 
        //         let account1DepositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
        //         let account2DepositDirectlyToSpendingWalletAmount = BigNumber.from(500);
        //         let account1ExpectedSellingPrice = BigNumber.from(3000);
        //         await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositDirectlyToSpendingWalletAmount});
        //         await coFunding.connect(account2).depositDirectlyToVault(sampleVaultData.vaultID,{value: account2DepositDirectlyToSpendingWalletAmount});
                
        //         await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, account1ExpectedSellingPrice))
        //             .to.emit(coFunding, "UserSetSellingPrice")
        //             .withArgs(sampleVaultData.vaultID, account1ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));
                
        //         let account1ExpectedUserContribution:UserContributionStruct = {
        //             contributionAmount: account1DepositDirectlyToSpendingWalletAmount,
        //             expectedSellingPrice: account1ExpectedSellingPrice
        //         }
        //         expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
        //             convertStructToOutputStruct(account1ExpectedUserContribution)
        //         );

        //     });

        //     it("Total vault amount exceed initial buy && All participants set expected price", async () => {
        //         const {sampleVaultData} = await createSampleVault(); 
        //         let account1DepositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
        //         let account2DepositDirectlyToSpendingWalletAmount = BigNumber.from(1500);
        //         let account1ExpectedSellingPrice = BigNumber.from(3000);
        //         let account2ExpectedSellingPrice = BigNumber.from(4000);
        //         await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositDirectlyToSpendingWalletAmount});   
        //         await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, account1ExpectedSellingPrice))
        //             .to.emit(coFunding, "UserSetSellingPrice")
        //             .withArgs(sampleVaultData.vaultID, account1ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));
                
        //         await coFunding.connect(account2).depositDirectlyToVault(sampleVaultData.vaultID,{value: account2DepositDirectlyToSpendingWalletAmount});
        //         await expect(coFunding.connect(account2).setSellingPrice(sampleVaultData.vaultID, account2ExpectedSellingPrice))
        //             .to.emit(coFunding, "UserSetSellingPrice")
        //             .withArgs(sampleVaultData.vaultID, account2ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));
    
        //         let account1ExpectedUserContribution:UserContributionStruct = {
        //             contributionAmount: account1DepositDirectlyToSpendingWalletAmount,
        //             expectedSellingPrice: account1ExpectedSellingPrice
        //         }
        //         expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
        //             convertStructToOutputStruct(account1ExpectedUserContribution)
        //         );
        //         let account2ExpectedUserContribution:UserContributionStruct = {
        //             contributionAmount: account2DepositDirectlyToSpendingWalletAmount,
        //             expectedSellingPrice: account2ExpectedSellingPrice
        //         }
        //         expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account2.address)).to.deep.equal(
        //             convertStructToOutputStruct(account2ExpectedUserContribution)
        //         );
        //     });

        //     it("Total vault amount exceed initial buy && All participants not set expected price", async () => {
        //         const {sampleVaultData} = await createSampleVault(); 
        //         let account1DepositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
        //         let account2DepositDirectlyToSpendingWalletAmount = BigNumber.from(1500);
        //         let account1ExpectedSellingPrice = BigNumber.from(3000);
        //         await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositDirectlyToSpendingWalletAmount});
        //         await coFunding.connect(account2).depositDirectlyToVault(sampleVaultData.vaultID,{value: account2DepositDirectlyToSpendingWalletAmount});
                
        //         await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, account1ExpectedSellingPrice))
        //             .to.emit(coFunding, "UserSetSellingPrice")
        //             .withArgs(sampleVaultData.vaultID, account1ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));
                
        //         let account1ExpectedUserContribution:UserContributionStruct = {
        //             contributionAmount: account1DepositDirectlyToSpendingWalletAmount,
        //             expectedSellingPrice: account1ExpectedSellingPrice
        //         }
        //         expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
        //             convertStructToOutputStruct(account1ExpectedUserContribution)
        //         );
        //     });
        // });
        // it("Assert (false) when vaultID not exist", async () => {
        //     const {sampleVaultData} = await createSampleVault(); 
        //     let expectedSellingPrice = BigNumber.from(3000);
        //     await expect(
        //         coFunding.connect(account1).setSellingPrice(convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)), expectedSellingPrice)
        //     ).to.be.revertedWith("VaultNotExist");
        // });
        it("Assert (false) when vault is not in funding process", async () => {
            const {sampleVaultData} = await createSampleVault(); 
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
            let expectedSellingPrice = BigNumber.from(3000);
            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositDirectlyToSpendingWalletAmount});
            await coFunding.connect(owner).changeStateVault(sampleVaultData.vaultID,1)
            await expect(
                coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, expectedSellingPrice)
            ).to.be.revertedWith("VaultNotInFundingProcess");
            await coFunding.connect(owner).changeStateVault(sampleVaultData.vaultID,2)
            await expect(
                coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, expectedSellingPrice)
            ).to.be.revertedWith("VaultNotInFundingProcess");
            await coFunding.connect(owner).changeStateVault(sampleVaultData.vaultID,3)
            await expect(
                coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, expectedSellingPrice)
            ).to.be.revertedWith("VaultNotInFundingProcess");
        });
        it("Assert (false) when participant have not deposit money inside vault", async () => {
            const {sampleVaultData} = await createSampleVault(); 
            let expectedSellingPrice = BigNumber.from(3000);
            await expect(
                coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, expectedSellingPrice)
            ).to.be.revertedWith("UserHaveNotParticipatedInVault");
        });
    });

    // describe("", async () => {
    //     it("Assert (true)", async () => {
    //     });
    //     it("Assert (false)", async () => {
    //     });
    // });
});