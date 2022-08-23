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
import { BigNumber, BigNumberish, ContractTransaction, Wallet } from "ethers";
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
    let balanceCheck: CoFundingUtilsFixtures["balanceCheck"];
    let errorRevertVaultNotInFundingProcess: CoFundingUtilsFixtures["errorRevertVaultNotInFundingProcess"];
    let errorRevertIsVaultIDExitedAndInFundingProcess: CoFundingUtilsFixtures["errorRevertIsVaultIDExitedAndInFundingProcess"];
    let errorRevertInvalidMoneyTransfer: CoFundingUtilsFixtures["errorRevertInvalidMoneyTransfer"];
    
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
            calculateExpectedSellingPrice,
            balanceCheck,

            errorRevertVaultNotInFundingProcess,
            errorRevertIsVaultIDExitedAndInFundingProcess,
            errorRevertInvalidMoneyTransfer

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
            nftOwner
        );
        return {nftId};
    };

    const createSampleVault = async () => {
        const sampleERC721NFT = await createSampleERC721NFT(owner);
        let now = Math.floor(new Date().getTime() / 1000.0);
        const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
            validNewVaultID,
            testERC721.address,
            sampleERC721NFT.nftId,
            now + 1000,
            now + 2000,
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

    /*

    describe("I. Create vault", async () => {
        // Testing Criteria
        //     I.a. Assert (true) create new vault:
        //         - Storage variable: _vaultInfos
        //         - Event: CreateVault
        //     I.b. Assert (false) revert with error VaultIDExisted
        //     I.c. Assert (false) revert with error ErrorTimeRange

        it("I.a. Assert (true) create new vault", async () => {
            let now = Math.floor(new Date().getTime() / 1000.0);
            const sampleERC721NFT = await createSampleERC721NFT(account1);

            const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
                validNewVaultID,
                testERC721.address,
                sampleERC721NFT.nftId,
                now + 10,
                now + 100,
                2000,
                2500
            );
            validNewVaultID = validNewVaultID+1;

            const expectedCreateVaultParamObj = {
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
            const expectedCreateVaultParamOutput = convertStructToOutputStruct(expectedCreateVaultParamObj);
            // await coFunding.createVault(...createVaultParamTuple);
            let tx = coFunding.createVault(...createVaultParamTuple);
            await expect(tx).to.emit(coFunding, "CreateVault").withArgs(
                createVaultParamObj.vaultID, 
                createVaultParamObj.nftCollection, 
                createVaultParamObj.nftID, 
                createVaultParamObj.startFundingTime, 
                createVaultParamObj.endFundingTime, 
                createVaultParamObj.initialPrice, 
                createVaultParamObj.defaultExpectedPrice
            );
            expect(await coFunding.getVault(createVaultParamObj.vaultID)).to.deep.equal(
                expectedCreateVaultParamOutput
            );

        });
        it("I.b. Assert (false) revert with error VaultIDExisted", async () => {
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
        it("I.c. Assert (false) revert with error ErrorTimeRange", async () => {
            let now = Math.floor(new Date().getTime() / 1000.0);
            const sampleERC721NFT = await createSampleERC721NFT(owner);

            let {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
                validNewVaultID,
                testERC721.address,
                sampleERC721NFT.nftId,
                now - 10,
                now + 100,
                2000,
                2500
            );

            await expect(
                coFunding.createVault(...createVaultParamTuple)
            ).to.be.revertedWith("ErrorTimeRange");

            createVaultParamTuple[3] = now + 150;
            
            await expect(
                coFunding.createVault(...createVaultParamTuple)
            ).to.be.revertedWith("ErrorTimeRange");
        });
    });

    describe("II. Set selling price", async () => {
        // Testing Criteria
        //     II.a. Assert (true) set selling price:
        //         II.a.1. Expected Selling Price is not decimal
        //         II.a.2. Expected Selling Price is decimal
        //         II.a.3. Total vault amount not exceed initial buy && All participants set expected price
        //         II.a.4. Total vault amount not exceed initial buy && All participants not set expected price
        //         II.a.5. Total vault amount exceed initial buy && All participants set expected price
        //         II.a.6. Total vault amount exceed initial buy && All participants not set expected price

        //         II.a.x.
        //             - Storage variable: _userContributions 
        //             - Event: UserSetSellingPrice

        //     II.b. Assert (false) revert with error VaultNotExist
        //     II.c. Assert (false) revert with error VaultNotInFundingProcess
        //     II.d. Assert (false) revert with error UserHaveNotParticipatedInVault

        describe("II.a. Assert (true) set selling price", async () => {
            it("II.a.1. Expected Selling Price is not decimal", async () => {
                const {sampleVaultData} = await createSampleVault(); 
                let depositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
                let expectedSellingPrice = BigNumber.from(3000);
                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositDirectlyToSpendingWalletAmount});

                await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, expectedSellingPrice))
                    .to.emit(coFunding, "UserSetSellingPrice")
                    .withArgs(sampleVaultData.vaultID, expectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));


                //check _userContributions[vaultID][msg.sender]
                let expectedUserContribution:UserContributionStruct = {
                    contributionAmount: depositDirectlyToSpendingWalletAmount,
                    expectedSellingPrice: expectedSellingPrice
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    convertStructToOutputStruct(expectedUserContribution)
                );
            });

            it("II.a.2. Expected Selling Price is decimal", async () => {
                const {sampleVaultData} = await createSampleVault(); 
                let depositDirectlyToSpendingWalletAmount = BigNumber.from(999);
                let expectedSellingPrice = BigNumber.from(2999);
                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositDirectlyToSpendingWalletAmount});

                await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, expectedSellingPrice))
                    .to.emit(coFunding, "UserSetSellingPrice")
                    .withArgs(sampleVaultData.vaultID, expectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));

                let expectedUserContribution:UserContributionStruct = {
                    contributionAmount: depositDirectlyToSpendingWalletAmount,
                    expectedSellingPrice: expectedSellingPrice
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    convertStructToOutputStruct(expectedUserContribution)
                );
            });

            it("II.a.3. Total vault amount not exceed initial buy && All participants set expected price", async () => {
                const {sampleVaultData} = await createSampleVault(); 
                let account1DepositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
                let account2DepositDirectlyToSpendingWalletAmount = BigNumber.from(500);
                let account1ExpectedSellingPrice = BigNumber.from(3000);
                let account2ExpectedSellingPrice = BigNumber.from(4000);
                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositDirectlyToSpendingWalletAmount});
                
                
                await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, account1ExpectedSellingPrice))
                    .to.emit(coFunding, "UserSetSellingPrice")
                    .withArgs(sampleVaultData.vaultID, account1ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));
                
                await coFunding.connect(account2).depositDirectlyToVault(sampleVaultData.vaultID,{value: account2DepositDirectlyToSpendingWalletAmount});
                await expect(coFunding.connect(account2).setSellingPrice(sampleVaultData.vaultID, account2ExpectedSellingPrice))
                    .to.emit(coFunding, "UserSetSellingPrice")
                    .withArgs(sampleVaultData.vaultID, account2ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));

                let account1ExpectedUserContribution:UserContributionStruct = {
                    contributionAmount: account1DepositDirectlyToSpendingWalletAmount,
                    expectedSellingPrice: account1ExpectedSellingPrice
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    convertStructToOutputStruct(account1ExpectedUserContribution)
                );
                let account2ExpectedUserContribution:UserContributionStruct = {
                    contributionAmount: account2DepositDirectlyToSpendingWalletAmount,
                    expectedSellingPrice: account2ExpectedSellingPrice
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account2.address)).to.deep.equal(
                    convertStructToOutputStruct(account2ExpectedUserContribution)
                );

            });

            it("II.a.4. Total vault amount not exceed initial buy && All participants not set expected price", async () => {
                const {sampleVaultData} = await createSampleVault(); 
                let account1DepositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
                let account2DepositDirectlyToSpendingWalletAmount = BigNumber.from(500);
                let account1ExpectedSellingPrice = BigNumber.from(3000);
                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositDirectlyToSpendingWalletAmount});
                await coFunding.connect(account2).depositDirectlyToVault(sampleVaultData.vaultID,{value: account2DepositDirectlyToSpendingWalletAmount});
                
                await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, account1ExpectedSellingPrice))
                    .to.emit(coFunding, "UserSetSellingPrice")
                    .withArgs(sampleVaultData.vaultID, account1ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));
                
                let account1ExpectedUserContribution:UserContributionStruct = {
                    contributionAmount: account1DepositDirectlyToSpendingWalletAmount,
                    expectedSellingPrice: account1ExpectedSellingPrice
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    convertStructToOutputStruct(account1ExpectedUserContribution)
                );

            });

            it("II.a.5. Total vault amount exceed initial buy && All participants set expected price", async () => {
                const {sampleVaultData} = await createSampleVault(); 
                let account1DepositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
                let account2DepositDirectlyToSpendingWalletAmount = BigNumber.from(1500);
                let account1ExpectedSellingPrice = BigNumber.from(3000);
                let account2ExpectedSellingPrice = BigNumber.from(4000);
                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositDirectlyToSpendingWalletAmount});   
                await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, account1ExpectedSellingPrice))
                    .to.emit(coFunding, "UserSetSellingPrice")
                    .withArgs(sampleVaultData.vaultID, account1ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));
                
                await coFunding.connect(account2).depositDirectlyToVault(sampleVaultData.vaultID,{value: account2DepositDirectlyToSpendingWalletAmount});
                await expect(coFunding.connect(account2).setSellingPrice(sampleVaultData.vaultID, account2ExpectedSellingPrice))
                    .to.emit(coFunding, "UserSetSellingPrice")
                    .withArgs(sampleVaultData.vaultID, account2ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));

                let account1ExpectedUserContribution:UserContributionStruct = {
                    contributionAmount: account1DepositDirectlyToSpendingWalletAmount,
                    expectedSellingPrice: account1ExpectedSellingPrice
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    convertStructToOutputStruct(account1ExpectedUserContribution)
                );
                let account2ExpectedUserContribution:UserContributionStruct = {
                    contributionAmount: account2DepositDirectlyToSpendingWalletAmount,
                    expectedSellingPrice: account2ExpectedSellingPrice
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account2.address)).to.deep.equal(
                    convertStructToOutputStruct(account2ExpectedUserContribution)
                );
            });

            it("II.a.6. Total vault amount exceed initial buy && All participants not set expected price", async () => {
                const {sampleVaultData} = await createSampleVault(); 
                let account1DepositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
                let account2DepositDirectlyToSpendingWalletAmount = BigNumber.from(1500);
                let account1ExpectedSellingPrice = BigNumber.from(3000);
                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositDirectlyToSpendingWalletAmount});
                await coFunding.connect(account2).depositDirectlyToVault(sampleVaultData.vaultID,{value: account2DepositDirectlyToSpendingWalletAmount});
                
                await expect(coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, account1ExpectedSellingPrice))
                    .to.emit(coFunding, "UserSetSellingPrice")
                    .withArgs(sampleVaultData.vaultID, account1ExpectedSellingPrice, await calculateExpectedSellingPrice(sampleVaultData.vaultID));

                let account1ExpectedUserContribution:UserContributionStruct = {
                    contributionAmount: account1DepositDirectlyToSpendingWalletAmount,
                    expectedSellingPrice: account1ExpectedSellingPrice
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    convertStructToOutputStruct(account1ExpectedUserContribution)
                );
            });
        });
        it("II.b. Assert (false) revert with error VaultNotExist", async () => {
            const {sampleVaultData} = await createSampleVault(); 
            let expectedSellingPrice = BigNumber.from(3000);
            await expect(
                coFunding.connect(account1).setSellingPrice(convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)), expectedSellingPrice)
            ).to.be.revertedWith("VaultNotExist");
        });
        it("II.c. Assert (false) revert with error VaultNotInFundingProcess", async () => {
            const {sampleVaultData} = await createSampleVault(); 
            let expectedSellingPrice = BigNumber.from(3000);

            let functionData = coFunding.interface.encodeFunctionData(
                "setSellingPrice",
                [
                    sampleVaultData.vaultID,
                    expectedSellingPrice
                ]
            );
            
            await errorRevertVaultNotInFundingProcess(account1,sampleVaultData.vaultID,functionData);      
        });
        it("II.d. Assert (false) revert with error UserHaveNotParticipatedInVault", async () => {
            const {sampleVaultData} = await createSampleVault(); 
            let expectedSellingPrice = BigNumber.from(3000);
            await expect(
                coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, expectedSellingPrice)
            ).to.be.revertedWith("UserHaveNotParticipatedInVault");
        });
    });

    describe("III. Deposit Directly To Spending Wallet", async () => {
        // Testing Criteria
        //     III.a. Assert (true) deposit directly into spending wallet
        //         - Storage variable: _userSpendingWallets, (payable).
        //     III.b. Assert (false) revert with error InvalidMoneyTransfer
        //     III.c. Assert (false) revert with error NonReentrant
        it("III.a. Assert (true) deposit directly into spending wallet", async () => {
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('1000');
            let tx = coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            const {
                result
            } = await balanceCheck(
                tx,
                [
                    {
                        address: account1.address,
                        amount: depositDirectlyToSpendingWalletAmount
                    }
                ],
                [
                    {
                        address: coFunding.address,
                        amount: depositDirectlyToSpendingWalletAmount
                    }
                ]
            );
            expect(result).to.equal(
                true
            );
            expect(await coFunding.getUserSpendingWallet(account1.address)).to.equal(
                depositDirectlyToSpendingWalletAmount
            );
        });
        it("III.b. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            let functionData = coFunding.interface.encodeFunctionData(
                "depositDirectlyToSpendingWallet"
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData,true);
        });
        it("III.c. Assert (false) revert with error NonReentrant", async () => {
        });
    });

    describe("IV. Deposit Directly And From Spending Wallet To Vault", async () => {
        // Testing Criteria
        //     IV.a. Assert (true) deposit directly and from spending wallet to vault
        //          - Storage variable: _vaultInfos,_userContributions,_vaultUsers,_userSpendingWallets, (payable)
        //     IV.b. Assert (false) revert with error VaultNotExist
        //     IV.c. Assert (false) revert with error VaultNotInFundingProcess
        //     IV.d. Assert (false) revert with error InvalidMoneyTransfer
        //     IV.e. Assert (false) revert with error NotEnoughMoneyInSpendingWallet
        //     IV.e. Assert (false) revert with error NonReentrant
        it("IV.a. Assert (true) deposit directly and from spending wallet to vault", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('8000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToVaultDirectlyAmount});
            let vaultContributionBefore = await coFunding.getContributionInVault(
                sampleVaultData.vaultID,
                account1.address
            )
            let tx = coFunding.connect(account1).depositDirectlyAndFromSpendingWalletToVault(
                sampleVaultData.vaultID,
                depositToVaultFromSpendingWalletAmount,
                {value: depositToVaultDirectlyAmount}
            );

            const {
                result
            } = await balanceCheck(
                tx,
                [
                    {
                        address: account1.address,
                        amount: depositToVaultDirectlyAmount
                    }
                ],
                [
                    {
                        address: coFunding.address,
                        amount: depositToVaultDirectlyAmount
                    }
                ]
            );
            expect(result).to.equal(
                true
            );

            let expectedUserContribution:UserContributionStruct = {
                contributionAmount: vaultContributionBefore.contributionAmount.add(
                    depositToVaultFromSpendingWalletAmount
                    ).add(depositToVaultDirectlyAmount),
                expectedSellingPrice: BigNumber.from(0)
            }

            expect(
                await coFunding.getContributionInVault(
                sampleVaultData.vaultID,
                account1.address
            )).to.deep.equal(
                convertStructToOutputStruct(expectedUserContribution)
            );
        });
        it("IV.b. Assert (false) revert with error VaultNotExist", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('8000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToVaultDirectlyAmount});
            await expect(
                coFunding.connect(account1).depositDirectlyAndFromSpendingWalletToVault(
                    convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)),
                    depositToVaultFromSpendingWalletAmount,
                    {value: depositToVaultDirectlyAmount}
                )
            ).to.be.revertedWith("VaultNotExist");
        });
        it("IV.c. Assert (false) revert with error VaultNotInFundingProcess", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('8000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToVaultDirectlyAmount});
            let functionData = coFunding.interface.encodeFunctionData(
                "depositDirectlyAndFromSpendingWalletToVault",
                [
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount,
                ]
            );
            
            await errorRevertVaultNotInFundingProcess(account1,sampleVaultData.vaultID,functionData, depositToVaultDirectlyAmount);      
        });
        it("IV.d. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('8000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToVaultDirectlyAmount});
            let functionData = coFunding.interface.encodeFunctionData(
                "depositDirectlyAndFromSpendingWalletToVault",
                [
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount,
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData,true);
        });
        it("IV.e. Assert (false) revert with error NotEnoughMoneyInSpendingWallet", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('18000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToVaultDirectlyAmount});
            await expect(
                coFunding.connect(account1).depositDirectlyAndFromSpendingWalletToVault(
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount,
                    {value: depositToVaultDirectlyAmount}
                )
            ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet");
        });
        it("IV.e. Assert (false) revert with error NonReentrant", async () => {
        });
    });
    
    describe("V. Deposit To Vault From Spending Wallet", async () => {
        // Testing Criteria
        //     V.a. Assert (true) deposit to vault from spending wallet
        //         V.a.1 Single deposit
        //         V.a.2 Multiple deposits
        //
        //         V.a.x
        //              - Storage variable: _vaultInfos,_userContributions,_vaultUsers,_userSpendingWallets
        //     V.b. Assert (false) revert with error VaultNotExist
        //     V.c. Assert (false) revert with error VaultNotInFundingProcess
        //     V.d. Assert (false) revert with error InvalidMoneyTransfer
        //     V.e. Assert (false) revert with error NotEnoughMoneyInSpendingWallet

        describe("V.a Assert (true) deposit to vault from spending wallet", async () => {
            it("V.a.1 Single deposit", async () => {
                const {sampleVaultData} = await createSampleVault();
                
                let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
                await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
                const spendingWalletBefore = await coFunding.getUserSpendingWallet(account1.address);
                let depositToVaultFromSpendingWalletAmount = BigNumber.from(6000);
                await coFunding.connect(account1).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, depositToVaultFromSpendingWalletAmount);
                
                //_userSpendingWallets
                expect(await coFunding.getUserSpendingWallet(account1.address)).to.equal(
                    spendingWalletBefore.sub(depositToVaultFromSpendingWalletAmount)
                );
                //_userContributions
                const expectedUserContributionInVault = {
                    contributionAmount: depositToVaultFromSpendingWalletAmount,
                    expectedSellingPrice: BigNumber.from(0)
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    convertStructToOutputStruct(expectedUserContributionInVault)
                );
                //_vaultUsers
                const expectedUserListInVault = [account1.address];
                expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                    expectedUserListInVault
                );
                //_vaultInfos
                expect(await coFunding.getVaultTotalContribution(sampleVaultData.vaultID)).to.deep.equal(
                    depositToVaultFromSpendingWalletAmount
                );
            });
    
            it("V.a.2 Multiple deposits", async () => {
                const {sampleVaultData} = await createSampleVault();
                
                let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
                await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
                const spendingWalletBefore = await coFunding.getUserSpendingWallet(account1.address);
                let depositToVaultFromSpendingWalletAmount = BigNumber.from(3000);
                
                await coFunding.connect(account1).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, depositToVaultFromSpendingWalletAmount);
                const expectedUserListInVault = [account1.address];
                expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                    expectedUserListInVault
                );
    
                await coFunding.connect(account1).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, depositToVaultFromSpendingWalletAmount);
                expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                    expectedUserListInVault
                );
            });
        });
        it("V.b. Assert (false) revert with error VaultNotExist", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(20000);
            await expect(
                coFunding.connect(account1).depositToVaultFromSpendingWallet(convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)), depositToVaultFromSpendingWalletAmount)
            ).to.be.revertedWith("VaultNotExist");
        });
        it("V.c. Assert (false) revert with error VaultNotInFundingProcess", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('10000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('200');

            let functionData = coFunding.interface.encodeFunctionData(
                "depositToVaultFromSpendingWallet",
                [
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount
                ]
            );
            
            await errorRevertVaultNotInFundingProcess(account1,sampleVaultData.vaultID,functionData);      
        });
        it("V.d. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(0);

            let functionData = coFunding.interface.encodeFunctionData(
                "depositToVaultFromSpendingWallet",
                [
                    sampleVaultData.vaultID, 
                    depositToVaultFromSpendingWalletAmount
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData,false);
        });
        it("V.e. Assert (false) revert with error NotEnoughMoneyInSpendingWallet", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(20000);
            await expect(
                coFunding.connect(account1).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, depositToVaultFromSpendingWalletAmount)
            ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet");
        });
        
    });

    describe("VI. Deposit To Vault From Spending Wallet And Set Selling Price", async () => {
        // Testing Criteria
        //     VI.a. Assert (true) deposit to vault from spending wallet and set selling price
        //          - Storage variable: _vaultInfos,_userContributions,_vaultUsers,_userSpendingWallets
        //     VI.b. Assert (false) revert with error VaultNotExist
        //     VI.c. Assert (false) revert with error VaultNotInFundingProcess
        //     VI.d. Assert (false) revert with error InvalidMoneyTransfer
        //     VI.e. Assert (false) revert with error NotEnoughMoneyInSpendingWallet
        //     VI.f. Assert (false) revert with error NonReentrant

        it("VI.a. Assert (true) deposit to vault from spending wallet and set selling price", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            const spendingWalletBefore = await coFunding.getUserSpendingWallet(account1.address);
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(200);
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);
            await coFunding.connect(account1).depositToVaultFromSpendingWalletAndSetSellingPrice(
                sampleVaultData.vaultID,
                depositToVaultFromSpendingWalletAmount,
                expectedSellingPrice
            );

            //userSpendingWallet
            expect(await coFunding.getUserSpendingWallet(account1.address)).to.equal(
                spendingWalletBefore.sub(depositToVaultFromSpendingWalletAmount)
            );
            const expectedUserContributionInVault = {
                contributionAmount: depositToVaultFromSpendingWalletAmount,
                expectedSellingPrice: expectedSellingPrice
            }
            //_userContributions
            const expectedUserContributionInVaultOutput = convertStructToOutputStruct(expectedUserContributionInVault);
            expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                expectedUserContributionInVaultOutput
            );
            //_vaultUsers
            const expectedUserListInVault = [account1.address];
            expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                expectedUserListInVault
            );
            //_vaultInfos
            expect(await coFunding.getVaultTotalContribution(sampleVaultData.vaultID)).to.deep.equal(
                depositToVaultFromSpendingWalletAmount
            );
        });
        it("VI.b. Assert (false) revert with error VaultNotExist", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('10000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('2000');
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);
            await expect(
                coFunding.connect(account1).depositToVaultFromSpendingWalletAndSetSellingPrice(
                    convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)),
                    depositToVaultFromSpendingWalletAmount,
                    expectedSellingPrice
                )
            ).to.be.revertedWith("VaultNotExist");
        });
        it("VI.c. Assert (false) revert with error VaultNotInFundingProcess", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('10000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('200');
            let expectedSellingPrice = BigNumber.from('4999');

            let functionData = coFunding.interface.encodeFunctionData(
                "depositToVaultFromSpendingWalletAndSetSellingPrice",
                [
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount,
                    expectedSellingPrice
                ]
            );
            
            await errorRevertVaultNotInFundingProcess(account1,sampleVaultData.vaultID,functionData);      
        });
        it("VI.d. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('0');
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);

            let functionData = coFunding.interface.encodeFunctionData(
                "depositToVaultFromSpendingWalletAndSetSellingPrice",
                [
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount,
                    expectedSellingPrice
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData,false);
        });
        it("VI.e. Assert (false) revert with error NotEnoughMoneyInSpendingWallet", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('10000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('20000');
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);
            await expect(
                coFunding.connect(account1).depositToVaultFromSpendingWalletAndSetSellingPrice(
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount,
                    expectedSellingPrice
                )
            ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet");
        });
        it("VI.f. Assert (false) revert with error NonReentrant", async () => {
        });
    });

    describe("VII. Deposit Directly To Vault", async () => {
        // Testing Criteria
        //     VII.a. Assert (true) deposit directly to vault
        //          - Storage variable: _vaultInfos,_userContributions,_vaultUsers, (payable)
        //     VII.b. Assert (false) revert with error VaultNotInFundingProcess&VaultNotExist
        //     VII.c. Assert (false) revert with error InvalidMoneyTransfer
        //     VII.d. Assert (false) revert with error NonReentrant
        describe("VII.a. Assert (true) deposit directly to vault", async () => {
            it("VII.a.1 Single deposit", async () => {
                const {sampleVaultData} = await createSampleVault();
                let depositToVaultDirectlyAmount = BigNumber.from('10000');

                let tx = coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});
                const {
                    result
                } = await balanceCheck(
                    tx,
                    [
                        {
                            address: account1.address,
                            amount: depositToVaultDirectlyAmount
                        }
                    ],
                    [
                        {
                            address: coFunding.address,
                            amount: depositToVaultDirectlyAmount
                        }
                    ]
                );
                expect(result).to.equal(
                    true
                );

                //_userContributions
                let expectedUserContribution:UserContributionStruct = {
                    contributionAmount: depositToVaultDirectlyAmount,
                    expectedSellingPrice: BigNumber.from(0)
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    convertStructToOutputStruct(expectedUserContribution)
                );

                //_vaultInfos
                expect(await coFunding.getVaultTotalContribution(sampleVaultData.vaultID)).to.equal(
                    depositToVaultDirectlyAmount
                );

                //_vaultUsers
                const expectedUserListInVault = [account1.address];
                expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                    expectedUserListInVault
                );
            });

            it("VII.a.2 Multiple deposit", async () => {
                const {sampleVaultData} = await createSampleVault();
                let account1DepositToVaultDirectlyAmount = BigNumber.from('10000');
                let account2DepositToVaultDirectlyAmount = BigNumber.from('8000');

                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositToVaultDirectlyAmount});
                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositToVaultDirectlyAmount});
                await coFunding.connect(account2).depositDirectlyToVault(sampleVaultData.vaultID,{value: account2DepositToVaultDirectlyAmount});
                let account1ExpectedUserContribution:UserContributionStruct = {
                    contributionAmount: account1DepositToVaultDirectlyAmount.add(account1DepositToVaultDirectlyAmount),
                    expectedSellingPrice: BigNumber.from(0)
                }
                let account2ExpectedUserContribution:UserContributionStruct = {
                    contributionAmount: account2DepositToVaultDirectlyAmount,
                    expectedSellingPrice: BigNumber.from(0)
                }
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    convertStructToOutputStruct(account1ExpectedUserContribution)
                );
                expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account2.address)).to.deep.equal(
                    convertStructToOutputStruct(account2ExpectedUserContribution)
                );

                expect(await coFunding.getVaultTotalContribution(sampleVaultData.vaultID)).to.equal(
                    account1DepositToVaultDirectlyAmount.add(account1DepositToVaultDirectlyAmount.add(account2DepositToVaultDirectlyAmount))
                );


                const expectedUserListInVault = [account1.address,account2.address];
                expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                    expectedUserListInVault
                );
            });
        });
        

        it("VII.b. Assert (false) revert with error VaultNotInFundingProcess&VaultNotExist", async () => {
            const {sampleVaultData} = await createSampleVault();
            let functionData1 = coFunding.interface.encodeFunctionData(
                "depositDirectlyToVault",
                [
                    convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2))
                ]
            );

            let functionData2 = coFunding.interface.encodeFunctionData(
                "depositDirectlyToVault",
                [
                    sampleVaultData.vaultID
                ]
            );
            
            await errorRevertIsVaultIDExitedAndInFundingProcess(account1,sampleVaultData.vaultID,functionData1,functionData2,BigNumber.from(1000));
        });
        it("VII.c. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            let functionData = coFunding.interface.encodeFunctionData(
                "depositDirectlyToVault",
                [
                    sampleVaultData.vaultID
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData,true);
        });
        it("VII.d. Assert (false) revert with error NonReentrant", async () => {
        });
    });

    describe("VIII. Deposit Directly And From Spending Wallet To Vault And Set Selling Price", async () => {
        // Testing Criteria
        //     VIII.a. Assert (true) deposit directly and from spending wallet to vault and set selling price
        //          - Storage variable: _vaultInfos,_userContributions,_vaultUsers,_userSpendingWallets, (payable)
        //     VIII.b. Assert (false) revert with error VaultNotExist
        //     VIII.c. Assert (false) revert with error VaultNotInFundingProcess
        //     VIII.d. Assert (false) revert with error InvalidMoneyTransfer
        //     VIII.e. Assert (false) revert with error NotEnoughMoneyInSpendingWallet
        //     VIII.f. Assert (false) revert with error NonReentrant

        it("VIII.a. Assert (true) deposit directly and from spending wallet to vault and set selling price", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            const spendingWalletBefore = await coFunding.getUserSpendingWallet(account1.address);
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(2000);
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);

            let tx = coFunding.connect(account1).depositDirectlyAndFromSpendingWalletToVaultAndSetSellingPrice(
                sampleVaultData.vaultID,
                depositToVaultFromSpendingWalletAmount,
                expectedSellingPrice,
                {value: depositDirectlyToSpendingWalletAmount}
            );
            const {
                result
            } = await balanceCheck(
                tx,
                [
                    {
                        address: coFunding.address,
                        amount: depositDirectlyToSpendingWalletAmount
                    }
                ],
                [
                    {
                        address: account1.address,
                        amount: depositDirectlyToSpendingWalletAmount
                    }
                ],
            );
            expect(result).to.equal(
                true
            );

            //userSpendingWallet
            expect(await coFunding.getUserSpendingWallet(account1.address)).to.equal(
                spendingWalletBefore.sub(depositToVaultFromSpendingWalletAmount)
            );
            const expectedUserContributionInVault = {
                contributionAmount: depositToVaultFromSpendingWalletAmount.add(depositDirectlyToSpendingWalletAmount),
                expectedSellingPrice: expectedSellingPrice
            }
            //_userContributions
            const expectedUserContributionInVaultOutput = convertStructToOutputStruct(expectedUserContributionInVault);
            expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                expectedUserContributionInVaultOutput
            );
            //_vaultUsers
            const expectedUserListInVault = [account1.address];
            expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                expectedUserListInVault
            );
            //_vaultInfos
            expect(await coFunding.getVaultTotalContribution(sampleVaultData.vaultID)).to.deep.equal(
                depositToVaultFromSpendingWalletAmount.add(depositDirectlyToSpendingWalletAmount)
            );
        });
        it("VIII.b. Assert (false) revert with error VaultNotExist", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            const spendingWalletBefore = await coFunding.getUserSpendingWallet(account1.address);
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(2000);
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);

            await expect(
                coFunding.connect(account1).depositDirectlyAndFromSpendingWalletToVaultAndSetSellingPrice(
                    convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)),
                    depositToVaultFromSpendingWalletAmount,
                    expectedSellingPrice,
                    {value: depositDirectlyToSpendingWalletAmount}
                )
            ).to.be.revertedWith("VaultNotExist");
        });
        it("VIII.c. Assert (false) revert with error VaultNotInFundingProcess", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            const spendingWalletBefore = await coFunding.getUserSpendingWallet(account1.address);
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(2000);
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);

            let functionData = coFunding.interface.encodeFunctionData(
                "depositDirectlyAndFromSpendingWalletToVaultAndSetSellingPrice",
                [
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount,
                    expectedSellingPrice
                ]
            );
            
            await errorRevertVaultNotInFundingProcess(account1,sampleVaultData.vaultID,functionData,depositDirectlyToSpendingWalletAmount);
        });
        it("VIII.d. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            const spendingWalletBefore = await coFunding.getUserSpendingWallet(account1.address);
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(2000);
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);

            let functionData = coFunding.interface.encodeFunctionData(
                "depositDirectlyAndFromSpendingWalletToVaultAndSetSellingPrice",
                [
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount,
                    expectedSellingPrice
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData,true);
        });
        it("VIII.e. Assert (false) revert with error NotEnoughMoneyInSpendingWallet", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(1000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            const spendingWalletBefore = await coFunding.getUserSpendingWallet(account1.address);
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(2000);
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);

            await expect(
                coFunding.connect(account1).depositDirectlyAndFromSpendingWalletToVaultAndSetSellingPrice(
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount,
                    expectedSellingPrice,
                    {value: depositDirectlyToSpendingWalletAmount}
                )
            ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet");
        });
        it("VIII.f. Assert (false) revert with error NonReentrant", async () => {
        });
    });

    describe("IX. Deposit Directly To Vault And Set Selling Price", async () => {
        // Testing Criteria
        //     IX.a. Assert (true) deposit directly to vault and set selling price
        //          - Storage variable: _vaultInfos,_userContributions,_vaultUsers, (payable)
        //     IX.b. Assert (false) revert with error VaultNotExist
        //     IX.c. Assert (false) revert with error VaultNotInFundingProcess
        //     IX.d. Assert (false) revert with error InvalidMoneyTransfer
        //     IX.e. Assert (false) revert with error NonReentrant

        it("IX.a. Assert (true) deposit directly to vault and set selling price", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);

            let tx = coFunding.connect(account1).depositDirectlyToVaultAndSetSellingPrice(
                sampleVaultData.vaultID,
                expectedSellingPrice,
                {value: depositDirectlyToSpendingWalletAmount}
            );
            const {
                result
            } = await balanceCheck(
                tx,
                [
                    {
                        address: coFunding.address,
                        amount: depositDirectlyToSpendingWalletAmount
                    }
                ],
                [
                    {
                        address: account1.address,
                        amount: depositDirectlyToSpendingWalletAmount
                    }
                ],
            );
            expect(result).to.equal(
                true
            );

            const expectedUserContributionInVault = {
                contributionAmount: depositDirectlyToSpendingWalletAmount,
                expectedSellingPrice: expectedSellingPrice
            }
            //_userContributions
            const expectedUserContributionInVaultOutput = convertStructToOutputStruct(expectedUserContributionInVault);
            expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                expectedUserContributionInVaultOutput
            );
            //_vaultUsers
            const expectedUserListInVault = [account1.address];
            expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                expectedUserListInVault
            );
            //_vaultInfos
            expect(await coFunding.getVaultTotalContribution(sampleVaultData.vaultID)).to.deep.equal(
                depositDirectlyToSpendingWalletAmount
            );
        });
        it("IX.b. Assert (false) revert with error VaultNotExist", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);
            await expect(
                coFunding.connect(account1).depositDirectlyToVaultAndSetSellingPrice(
                    convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)),
                    expectedSellingPrice,
                    {value: depositDirectlyToSpendingWalletAmount}
                )
            ).to.be.revertedWith("VaultNotExist");
        });
        it("IX.c. Assert (false) revert with error VaultNotInFundingProcess", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);

            let functionData = coFunding.interface.encodeFunctionData(
                "depositDirectlyToVaultAndSetSellingPrice",
                [
                    sampleVaultData.vaultID,
                    expectedSellingPrice
                ]
            );
            
            await errorRevertVaultNotInFundingProcess(account1,sampleVaultData.vaultID,functionData,depositDirectlyToSpendingWalletAmount);
        });
        it("IX.d. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);
            let functionData = coFunding.interface.encodeFunctionData(
                "depositDirectlyToVaultAndSetSellingPrice",
                [
                    sampleVaultData.vaultID,
                    expectedSellingPrice
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData,true);
        });
        it("IX.f. Assert (false) revert with error NonReentrant", async () => {
        });
    });

    describe("X. Withdraw Directly From Spending Wallet", async () => {
        // Testing Criteria
        //     X.a. Assert (true) withdraw directly from spending wallet
        //         - Storage variable: _userSpendingWallets, (payable).
        //     X.b. Assert (false) revert with error InvalidMoneyTransfer
        //     X.c. Assert (false) revert with error NotEnoughMoneyInSpendingWallet
        //     X.d. Assert (false) revert with error NonReentrant
        it("X.a. Assert (true) withdraw directly from spending wallet", async () => {
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('1000');
            let withdrawDirectlyFromSpendingWalletAmount = BigNumber.from('500');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let tx = coFunding.connect(account1).withdrawDirectlyFromSpendingWallet(withdrawDirectlyFromSpendingWalletAmount);
            const {
                result
            } = await balanceCheck(
                tx,
                [
                    {
                        address: coFunding.address,
                        amount: withdrawDirectlyFromSpendingWalletAmount
                    }
                ],
                [
                    {
                        address: account1.address,
                        amount: withdrawDirectlyFromSpendingWalletAmount
                    }
                ],
            );
            expect(result).to.equal(
                true
            );
            expect(await coFunding.getUserSpendingWallet(account1.address)).to.equal(
                depositDirectlyToSpendingWalletAmount.sub(withdrawDirectlyFromSpendingWalletAmount)
            );
        });
        it("X.b. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('1000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let withdrawDirectlyFromSpendingWalletAmount = BigNumber.from('0');
            let functionData = coFunding.interface.encodeFunctionData(
                "withdrawDirectlyFromSpendingWallet",
                [
                    withdrawDirectlyFromSpendingWalletAmount
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData,false);
        });
        it("X.c. Assert (false) revert with error NotEnoughMoneyInSpendingWallet", async () => {
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('1000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let withdrawDirectlyFromSpendingWalletAmount = BigNumber.from('2000');
            await expect(
                coFunding.connect(account1).withdrawDirectlyFromSpendingWallet(withdrawDirectlyFromSpendingWalletAmount)
            ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet");
        });
        it("X.d. Assert (false) revert with error NonReentrant", async () => {
        });
    });

    describe("XI. Withdraw From Vault To Spending Wallet", async () => {
        // Testing Criteria
        //     XI.a. Assert (true) withdraw from vault to spending wallet
        //          XI.a.1 Single withdraws
        //          XI.a.1 Multiple withdraws
        //
        //          XI.a.x 
        //              - Storage variable:  _vaultInfos,_userContributions,_vaultUsers,_userSpendingWallets
        //     XI.b. Assert (false) revert with error VaultNotExist
        //     XI.c. Assert (false) revert with error VaultNotInFundingProcess
        //     XI.d. Assert (false) revert with error InvalidMoneyTransfer
        //     XI.e. Assert (false) revert with error UserHaveNotParticipatedInVault
        //     XI.f. Assert (false) revert with error NotEnoughMoneyInUserVault
        describe("XI.a. Assert (true) withdraw from vault to spending wallet", async () => {
            it("XI.a.1 Single withdraw", async () => {
                const {sampleVaultData} = await createSampleVault();
                let depositToVaultDirectlyAmount = BigNumber.from('10000');
                let withdrawFromVaultToSpendingWalletAmount = BigNumber.from('7000');
                let spendingWalletBefore = await coFunding.connect(account1).getUserSpendingWallet(account1.address);
    
                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});
    
                await coFunding.connect(account1).withdrawFromVaultToSpendingWallet(sampleVaultData.vaultID, withdrawFromVaultToSpendingWalletAmount);
    
                //userSpendingWallet
                expect(await coFunding.connect(account1).getUserSpendingWallet(account1.address)).to.equal(
                    spendingWalletBefore.add(withdrawFromVaultToSpendingWalletAmount)
                );
                const expectedUserContributionInVault = {
                    contributionAmount: depositToVaultDirectlyAmount.sub(withdrawFromVaultToSpendingWalletAmount),
                    expectedSellingPrice: BigNumber.from(0)
                }
                //_userContributions
                const expectedUserContributionInVaultOutput = convertStructToOutputStruct(expectedUserContributionInVault);
                expect(await coFunding.connect(account1).getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    expectedUserContributionInVaultOutput
                );
                //_vaultUsers
                const expectedUserListInVault = [account1.address];
                expect(await coFunding.connect(account1).getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                    expectedUserListInVault
                );
                //_vaultInfos
                expect(await coFunding.connect(account1).getVaultTotalContribution(sampleVaultData.vaultID)).to.deep.equal(
                    depositToVaultDirectlyAmount.sub(withdrawFromVaultToSpendingWalletAmount)
                );
            });
            it("XI.a.1 Multiple withdraws", async () => {
                const {sampleVaultData} = await createSampleVault();
                
                let account1DepositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
                await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: account1DepositDirectlyToSpendingWalletAmount});
                let account1DepositToVaultFromSpendingWalletAmount = BigNumber.from(6000);
                await coFunding.connect(account1).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, account1DepositToVaultFromSpendingWalletAmount);
                
                let account2DepositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
                await coFunding.connect(account2).depositDirectlyToSpendingWallet({value: account2DepositDirectlyToSpendingWalletAmount});
                let account2DepositToVaultFromSpendingWalletAmount = BigNumber.from(8000);
                await coFunding.connect(account2).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, account2DepositToVaultFromSpendingWalletAmount);
            
                let account3DepositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
                await coFunding.connect(account3).depositDirectlyToSpendingWallet({value: account3DepositDirectlyToSpendingWalletAmount});
                let account3DepositToVaultFromSpendingWalletAmount = BigNumber.from(8000);
                await coFunding.connect(account3).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, account3DepositToVaultFromSpendingWalletAmount);
                
                let expectedUserListInVault = [account1.address,account2.address,account3.address];
                expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                    expectedUserListInVault
                );
            
                await coFunding.connect(account1).withdrawFromVaultToSpendingWallet(sampleVaultData.vaultID, account1DepositToVaultFromSpendingWalletAmount);
                await coFunding.connect(account2).withdrawFromVaultToSpendingWallet(sampleVaultData.vaultID, account2DepositToVaultFromSpendingWalletAmount.div(2));
                
                //_vaultUsers
                expectedUserListInVault = [account3.address,account2.address];

                expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                    expectedUserListInVault
                );
                //_userContributions
                const expectedAccount1ContributionInVault = {
                    contributionAmount: BigNumber.from(0),
                    expectedSellingPrice: BigNumber.from(0)
                }
                expect(await coFunding.connect(account1).getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    convertStructToOutputStruct(expectedAccount1ContributionInVault)
                );
                const expectedAccount2ContributionInVault = {
                    contributionAmount: account2DepositToVaultFromSpendingWalletAmount.div(2),
                    expectedSellingPrice: BigNumber.from(0)
                }

                expect(await coFunding.connect(account2).getContributionInVault(sampleVaultData.vaultID, account2.address)).to.deep.equal(
                    convertStructToOutputStruct(expectedAccount2ContributionInVault)
                );
                //userSpendingWallet
                expect(await coFunding.connect(account1).getUserSpendingWallet(account1.address)).to.equal(
                    account1DepositDirectlyToSpendingWalletAmount
                );
                expect(await coFunding.connect(account2).getUserSpendingWallet(account2.address)).to.equal(
                    account2DepositDirectlyToSpendingWalletAmount.sub(account2DepositToVaultFromSpendingWalletAmount.div(2))
                );

                //_vaultInfos
                expect(await coFunding.connect(account3).getVaultTotalContribution(sampleVaultData.vaultID)).to.deep.equal(
                    account3DepositToVaultFromSpendingWalletAmount.add(account2DepositToVaultFromSpendingWalletAmount.div(2))
                );
            });
        });
        
        it("XI.b. Assert (false) revert with error VaultNotExist", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let withdrawFromVaultToSpendingWalletAmount = BigNumber.from('7000');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});

            await expect(
                coFunding.connect(account1).withdrawFromVaultToSpendingWallet(
                    convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)), 
                    withdrawFromVaultToSpendingWalletAmount
                )
            ).to.be.revertedWith("VaultNotExist");
        });
        it("XI.c. Assert (false) revert with error VaultNotInFundingProcess", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let withdrawFromVaultToSpendingWalletAmount = BigNumber.from('7000');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});

            let functionData = coFunding.interface.encodeFunctionData(
                "withdrawFromVaultToSpendingWallet",
                [
                    sampleVaultData.vaultID,
                    withdrawFromVaultToSpendingWalletAmount
                ]
            );
            
            await errorRevertVaultNotInFundingProcess(account1,sampleVaultData.vaultID,functionData);
        });
        it("XI.d. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let withdrawFromVaultToSpendingWalletAmount = BigNumber.from('0');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});

            let functionData = coFunding.interface.encodeFunctionData(
                "withdrawFromVaultToSpendingWallet",
                [
                    sampleVaultData.vaultID,
                    withdrawFromVaultToSpendingWalletAmount
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData,false);
        });
        it("XI.e. Assert (false) revert with error UserHaveNotParticipatedInVault", async () => {
            const {sampleVaultData} = await createSampleVault();
            let withdrawFromVaultToSpendingWalletAmount = BigNumber.from('7000');

            await expect(
                coFunding.connect(account1).withdrawFromVaultToSpendingWallet(
                    sampleVaultData.vaultID, 
                    withdrawFromVaultToSpendingWalletAmount
                )
            ).to.be.revertedWith("UserHaveNotParticipatedInVault");
        });
        it("XI.f. Assert (false) revert with error NotEnoughMoneyInUserVault", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('1000');
            let withdrawFromVaultToSpendingWalletAmount = BigNumber.from('10000');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});

            await expect(
                coFunding.connect(account1).withdrawFromVaultToSpendingWallet(
                    sampleVaultData.vaultID, 
                    withdrawFromVaultToSpendingWalletAmount
                )
            ).to.be.revertedWith("NotEnoughMoneyInUserVault");
        });
    });

    describe("XII. Withdraw Directly From Vault", async () => {
        // Testing Criteria
        //     XII.a. Assert (true) withdraw directly from vault
        //          XII.a.1. Single withdraw
        //          XII.a.2. Multiple withdraws
        //
        //          XII.a.x. 
        //              - Storage variable:  _vaultInfos,_userContributions,_vaultUsers,(payable)
        //     XII.b. Assert (false) revert with error VaultNotExist
        //     XII.c. Assert (false) revert with error VaultNotInFundingProcess
        //     XII.d. Assert (false) revert with error InvalidMoneyTransfer
        //     XII.e. Assert (false) revert with error UserHaveNotParticipatedInVault
        //     XII.f. Assert (false) revert with error NotEnoughMoneyInUserVault
        //     XII.g. Assert (false) revert with error NonReentrant
        describe("XII.a. Assert (true) withdraw directly from vault", async () => {
            it("XII.a.1. Single withdraw", async () => {
                const {sampleVaultData} = await createSampleVault();
                let depositToVaultDirectlyAmount = BigNumber.from('10000');
                let withdrawFromVaultDirectlyAmount = BigNumber.from('7000');
    
                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});
    
                let tx = coFunding.connect(account1).withdrawDirectlyFromVault(sampleVaultData.vaultID, withdrawFromVaultDirectlyAmount);
                const {
                    result
                } = await balanceCheck(
                    tx,
                    [
                        {
                            address: account1.address,
                            amount: withdrawFromVaultDirectlyAmount
                        }
                    ],
                    [
                        {
                            address: coFunding.address,
                            amount: withdrawFromVaultDirectlyAmount
                        }
                    ]
                );
                expect(result).to.equal(
                    true
                );
    
                //_userContributions
                const expectedUserContributionInVault = {
                    contributionAmount: depositToVaultDirectlyAmount.sub(withdrawFromVaultDirectlyAmount),
                    expectedSellingPrice: BigNumber.from(0)
                }
                const expectedUserContributionInVaultOutput = convertStructToOutputStruct(expectedUserContributionInVault);
                expect(await coFunding.connect(account1).getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    expectedUserContributionInVaultOutput
                );
                //_vaultUsers
                const expectedUserListInVault = [account1.address];
                expect(await coFunding.connect(account1).getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                    expectedUserListInVault
                );
                //_vaultInfos
                expect(await coFunding.connect(account1).getVaultTotalContribution(sampleVaultData.vaultID)).to.deep.equal(
                    depositToVaultDirectlyAmount.sub(withdrawFromVaultDirectlyAmount)
                );
    
            });

            it("XII.a.2. Multiple withdraw", async () => {
                const {sampleVaultData} = await createSampleVault();
                let account1DepositToVaultDirectlyAmount = BigNumber.from('10000');
                let account1WithdrawFromVaultDirectlyAmount = BigNumber.from('10000');
                let account2DepositToVaultDirectlyAmount = BigNumber.from('10000');
                let account2WithdrawFromVaultDirectlyAmount = BigNumber.from('7000');
    
                await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: account1DepositToVaultDirectlyAmount});
                await coFunding.connect(account2).depositDirectlyToVault(sampleVaultData.vaultID,{value: account2DepositToVaultDirectlyAmount});
    
                await coFunding.connect(account1).withdrawDirectlyFromVault(sampleVaultData.vaultID, account1WithdrawFromVaultDirectlyAmount);
                await coFunding.connect(account2).withdrawDirectlyFromVault(sampleVaultData.vaultID, account2WithdrawFromVaultDirectlyAmount);

                //_userContributions
                const account1ExpectedUserContributionInVault = {
                    contributionAmount: account1DepositToVaultDirectlyAmount.sub(account1WithdrawFromVaultDirectlyAmount),
                    expectedSellingPrice: BigNumber.from(0)
                }
                const account1ExpectedUserContributionInVaultOutput = convertStructToOutputStruct(account1ExpectedUserContributionInVault);
                expect(await coFunding.connect(account1).getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                    account1ExpectedUserContributionInVaultOutput
                );
                const account2ExpectedUserContributionInVault = {
                    contributionAmount: account2DepositToVaultDirectlyAmount.sub(account2WithdrawFromVaultDirectlyAmount),
                    expectedSellingPrice: BigNumber.from(0)
                }
                const account2ExpectedUserContributionInVaultOutput = convertStructToOutputStruct(account2ExpectedUserContributionInVault);
                expect(await coFunding.connect(account2).getContributionInVault(sampleVaultData.vaultID, account2.address)).to.deep.equal(
                    account2ExpectedUserContributionInVaultOutput
                );
                //_vaultUsers
                const expectedUserListInVault = [account2.address];
                expect(await coFunding.connect(account1).getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                    expectedUserListInVault
                );
                //_vaultInfos
                expect(await coFunding.connect(account1).getVaultTotalContribution(sampleVaultData.vaultID)).to.deep.equal(
                    account2DepositToVaultDirectlyAmount.sub(account2WithdrawFromVaultDirectlyAmount)
                );
    
            });
        });
        it("XII.b. Assert (false) revert with error VaultNotExist", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let withdrawFromVaultDirectlyAmount = BigNumber.from('7000');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});

            await expect(
                coFunding.connect(account1).withdrawDirectlyFromVault(
                    convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)), 
                    withdrawFromVaultDirectlyAmount
                )
            ).to.be.revertedWith("VaultNotExist");
        });
        it("XII.c. Assert (false) revert with error VaultNotInFundingProcess", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let withdrawFromVaultDirectlyAmount = BigNumber.from('7000');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});

            let functionData = coFunding.interface.encodeFunctionData(
                "withdrawDirectlyFromVault",
                [
                    sampleVaultData.vaultID,
                    withdrawFromVaultDirectlyAmount
                ]
            );
            
            await errorRevertVaultNotInFundingProcess(account1,sampleVaultData.vaultID,functionData);
        });
        it("XII.d. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let withdrawFromVaultDirectlyAmount = BigNumber.from('0');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});

            let functionData = coFunding.interface.encodeFunctionData(
                "withdrawDirectlyFromVault",
                [
                    sampleVaultData.vaultID,
                    withdrawFromVaultDirectlyAmount
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData,true);
        });
        it("XII.e. Assert (false) revert with error UserHaveNotParticipatedInVault", async () => {
            const {sampleVaultData} = await createSampleVault();
            let withdrawFromVaultDirectlyAmount = BigNumber.from('10000');

            await expect(
                coFunding.connect(account1).withdrawDirectlyFromVault(
                    sampleVaultData.vaultID, 
                    withdrawFromVaultDirectlyAmount
                )
            ).to.be.revertedWith("UserHaveNotParticipatedInVault");
        });
        it("XII.f. Assert (false) revert with error NotEnoughMoneyInUserVault", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let withdrawFromVaultDirectlyAmount = BigNumber.from('17000');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});

            await expect(
                coFunding.connect(account1).withdrawDirectlyFromVault(
                    sampleVaultData.vaultID, 
                    withdrawFromVaultDirectlyAmount
                )
            ).to.be.revertedWith("NotEnoughMoneyInUserVault");
        });
        it("XII.g. Assert (false) revert with error NonReentrant", async () => {
        });
    });

    describe("XIII. Withdraw Directly From Spending Wallet And Vault", async () => {
        // Testing Criteria
        //     XIII.a. Assert (true) withdraw directly from spending wallet and vault
        //         - Storage variable:  _vaultInfos,_userContributions,_vaultUsers,_userSpendingWallets,(payable)
        //     XIII.b. Assert (false) revert with error VaultNotExist
        //     XIII.c. Assert (false) revert with error VaultNotInFundingProcess
        //     XIII.d. Assert (false) revert with error InvalidMoneyTransfer
        //     XIII.e. Assert (false) revert with error UserHaveNotParticipatedInVault
        //     XIII.f. Assert (false) revert with error NotEnoughMoneyInUserVault
        //     XIII.g. Assert (false) revert with error NonReentrant
        it("XIII.a. Assert (true) withdraw directly from spending wallet and vault", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let depositToSpendingWalletDirectlyAmount = BigNumber.from('15000');
            let withdrawFromVaultDirectlyAmount = BigNumber.from('7000');
            let withdrawFromSpendingWalletDirectlyAmount = BigNumber.from('9000');
            let spendingWalletBefore = await coFunding.getUserSpendingWallet(account1.address);

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToSpendingWalletDirectlyAmount});

            let tx = coFunding.connect(account1).withdrawDirectlyFromSpendingWalletAndVault(
                sampleVaultData.vaultID, 
                withdrawFromSpendingWalletDirectlyAmount,
                withdrawFromVaultDirectlyAmount
            );
            const {
                result
            } = await balanceCheck(
                tx,
                [
                    {
                        address: account1.address,
                        amount: withdrawFromVaultDirectlyAmount.add(withdrawFromSpendingWalletDirectlyAmount)
                    }
                ],
                [
                    {
                        address: coFunding.address,
                        amount: withdrawFromVaultDirectlyAmount.add(withdrawFromSpendingWalletDirectlyAmount)
                    }
                ]
            );
            expect(result).to.equal(
                true
            );

            //_userContributions
            const expectedUserContributionInVault = {
                contributionAmount: depositToVaultDirectlyAmount.sub(withdrawFromVaultDirectlyAmount),
                expectedSellingPrice: BigNumber.from(0)
            }
            const expectedUserContributionInVaultOutput = convertStructToOutputStruct(expectedUserContributionInVault);
            expect(await coFunding.connect(account1).getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                expectedUserContributionInVaultOutput
            );

            //_vaultUsers
            const expectedUserListInVault = [account1.address];
            expect(await coFunding.connect(account1).getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                expectedUserListInVault
            );

            //_vaultInfos
            expect(await coFunding.connect(account1).getVaultTotalContribution(sampleVaultData.vaultID)).to.deep.equal(
                depositToVaultDirectlyAmount.sub(withdrawFromVaultDirectlyAmount)
            );

            //_userSpendingWallets
            expect(await coFunding.getUserSpendingWallet(account1.address)).to.equal(
                spendingWalletBefore.add(depositToSpendingWalletDirectlyAmount.sub(withdrawFromSpendingWalletDirectlyAmount))
            );
        });
        it("XIII.b. Assert (false) revert with error VaultNotExist", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let depositToSpendingWalletDirectlyAmount = BigNumber.from('15000');
            let withdrawFromVaultDirectlyAmount = BigNumber.from('7000');
            let withdrawFromSpendingWalletDirectlyAmount = BigNumber.from('9000');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToSpendingWalletDirectlyAmount});

            await expect(
                coFunding.connect(account1).withdrawDirectlyFromSpendingWalletAndVault(
                    convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)), 
                    withdrawFromSpendingWalletDirectlyAmount,
                    withdrawFromVaultDirectlyAmount
                )
            ).to.be.revertedWith("VaultNotExist");
        });
        it("XIII.c. Assert (false) revert with error VaultNotInFundingProcess", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let depositToSpendingWalletDirectlyAmount = BigNumber.from('15000');
            let withdrawFromVaultDirectlyAmount = BigNumber.from('7000');
            let withdrawFromSpendingWalletDirectlyAmount = BigNumber.from('9000');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToSpendingWalletDirectlyAmount});

            let functionData = coFunding.interface.encodeFunctionData(
                "withdrawDirectlyFromSpendingWalletAndVault",
                [
                    sampleVaultData.vaultID,
                    withdrawFromSpendingWalletDirectlyAmount,
                    withdrawFromVaultDirectlyAmount
                ]
            );
            
            await errorRevertVaultNotInFundingProcess(account1,sampleVaultData.vaultID,functionData);
        });
        it("XIII.d. Assert (false) revert with error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let depositToSpendingWalletDirectlyAmount = BigNumber.from('15000');
            let withdrawFromVaultDirectlyAmount = BigNumber.from('7000');
            let withdrawFromSpendingWalletDirectlyAmount = BigNumber.from('0');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToSpendingWalletDirectlyAmount});

            let functionData1 = coFunding.interface.encodeFunctionData(
                "withdrawDirectlyFromSpendingWalletAndVault",
                [
                    sampleVaultData.vaultID,
                    withdrawFromSpendingWalletDirectlyAmount,
                    withdrawFromVaultDirectlyAmount
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData1,false);
            withdrawFromVaultDirectlyAmount = BigNumber.from('0');
            withdrawFromSpendingWalletDirectlyAmount = BigNumber.from('9000');
            let functionData2 = coFunding.interface.encodeFunctionData(
                "withdrawDirectlyFromSpendingWalletAndVault",
                [
                    sampleVaultData.vaultID,
                    withdrawFromSpendingWalletDirectlyAmount,
                    withdrawFromVaultDirectlyAmount
                ]
            );
            
            await errorRevertInvalidMoneyTransfer(account1,functionData2,false);
        });
        it("XIII.e. Assert (false) revert with error UserHaveNotParticipatedInVault", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToSpendingWalletDirectlyAmount = BigNumber.from('15000');
            let withdrawFromVaultDirectlyAmount = BigNumber.from('7000');
            let withdrawFromSpendingWalletDirectlyAmount = BigNumber.from('9000');

            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToSpendingWalletDirectlyAmount});

            await expect(
                coFunding.connect(account1).withdrawDirectlyFromSpendingWalletAndVault(
                    sampleVaultData.vaultID, 
                    withdrawFromSpendingWalletDirectlyAmount,
                    withdrawFromVaultDirectlyAmount
                )
            ).to.be.revertedWith("UserHaveNotParticipatedInVault");
        });
        it("XIII.f. Assert (false) revert with error NotEnoughMoneyInUserVault", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultDirectlyAmount = BigNumber.from('10000');
            let depositToSpendingWalletDirectlyAmount = BigNumber.from('15000');
            let withdrawFromVaultDirectlyAmount = BigNumber.from('17000');
            let withdrawFromSpendingWalletDirectlyAmount = BigNumber.from('9000');

            await coFunding.connect(account1).depositDirectlyToVault(sampleVaultData.vaultID,{value: depositToVaultDirectlyAmount});
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositToSpendingWalletDirectlyAmount});

            await expect(
                coFunding.connect(account1).withdrawDirectlyFromSpendingWalletAndVault(
                    sampleVaultData.vaultID, 
                    withdrawFromSpendingWalletDirectlyAmount,
                    withdrawFromVaultDirectlyAmount
                )
            ).to.be.revertedWith("NotEnoughMoneyInUserVault");
        });
        it("XIII.g. Assert (false) revert with error NonReentrant", async () => {
        });
    });

    */
   
    // describe("", async () => {
    //     it("Assert (true)", async () => {
    //     });
    //     it("Assert (false)", async () => {
    //     });
    // });

});

