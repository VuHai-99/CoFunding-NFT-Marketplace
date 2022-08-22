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

            errorRevertVaultNotInFundingProcess

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

    describe("Create vault", async () => {
        it("Assert (true) create new vault", async () => {
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
            const sampleERC721NFT = await createSampleERC721NFT(owner);

            const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
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

        });
        it("Assert (false) revert with error endFundingTime < startFundingTime", async () => {
            let now = Math.floor(new Date().getTime() / 1000.0);
            const sampleERC721NFT = await createSampleERC721NFT(account1);

            const {createVaultParamObj, createVaultParamTuple} = createVaultFunctionDataStructure(
                validNewVaultID,
                testERC721.address,
                sampleERC721NFT.nftId,
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
        describe("Assert (true) set selling price", async () => {
            it("Expected Selling Price is not decimal", async () => {
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

            it("Expected Selling Price is decimal", async () => {
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

            it("Total vault amount not exceed initial buy && All participants set expected price", async () => {
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

            it("Total vault amount not exceed initial buy && All participants not set expected price", async () => {
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

            it("Total vault amount exceed initial buy && All participants set expected price", async () => {
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

            it("Total vault amount exceed initial buy && All participants not set expected price", async () => {
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
        it("Assert (false) when vaultID not exist", async () => {
            const {sampleVaultData} = await createSampleVault(); 
            let expectedSellingPrice = BigNumber.from(3000);
            await expect(
                coFunding.connect(account1).setSellingPrice(convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)), expectedSellingPrice)
            ).to.be.revertedWith("VaultNotExist");
        });
        it("Assert (false) error VaultNotInFundingProcess", async () => {
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
        it("Assert (false) when participant have not deposit money inside vault", async () => {
            const {sampleVaultData} = await createSampleVault(); 
            let expectedSellingPrice = BigNumber.from(3000);
            await expect(
                coFunding.connect(account1).setSellingPrice(sampleVaultData.vaultID, expectedSellingPrice)
            ).to.be.revertedWith("UserHaveNotParticipatedInVault");
        });
    });

    describe("Deposit Directly To Spending Wallet", async () => {
        it("Assert (true) deposit into spending wallet", async () => {
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
        it("Assert (false) error InvalidMoneyTransfer", async () => {
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('0');
            await expect(
                coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount})
            ).to.be.revertedWith("InvalidMoneyTransfer");
            await expect(
                coFunding.connect(account1).depositDirectlyToSpendingWallet()
            ).to.be.revertedWith("InvalidMoneyTransfer");
        });
    });

    describe("Withdraw Directly From Spending Wallet", async () => {
        it("Assert (true) withdraw directly from spending wallet", async () => {
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
        it("Assert (false) error InvalidMoneyTransfer", async () => {
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('1000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let withdrawDirectlyFromSpendingWalletAmount = BigNumber.from('0');
            await expect(
                coFunding.connect(account1).withdrawDirectlyFromSpendingWallet(withdrawDirectlyFromSpendingWalletAmount)
            ).to.be.revertedWith("InvalidMoneyTransfer");
        });
        it("Assert (false) error NotEnoughMoneyInSpendingWallet", async () => {
            let depositDirectlyToSpendingWalletAmount = BigNumber.from('1000');
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let withdrawDirectlyFromSpendingWalletAmount = BigNumber.from('2000');
            await expect(
                coFunding.connect(account1).withdrawDirectlyFromSpendingWallet(withdrawDirectlyFromSpendingWalletAmount)
            ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet");
        });
    });
    

    describe("Deposit To Vault From Spending Wallet", async () => {
        it("Assert (true) deposit to vault from spending wallet", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            const spendingWalletBefore = await coFunding.getUserSpendingWallet(account1.address);
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(6000);
            await coFunding.connect(account1).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, depositToVaultFromSpendingWalletAmount);
            
            expect(await coFunding.getUserSpendingWallet(account1.address)).to.equal(
                spendingWalletBefore.sub(depositToVaultFromSpendingWalletAmount)
            );
            const expectedUserContributionInVault = {
                contributionAmount: depositToVaultFromSpendingWalletAmount,
                expectedSellingPrice: BigNumber.from(0)
            }
            const expectedUserContributionInVaultOutput = convertStructToOutputStruct(expectedUserContributionInVault);
            expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                expectedUserContributionInVaultOutput
            );
            expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                expectedUserContributionInVaultOutput
            );
            const expectedUserListInVault = [account1.address];
            expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                expectedUserListInVault
            );
        });

        it("Assert (true) userlist when user deposit twice to vault", async () => {
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
        it("Assert (false) InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(0);
            await expect(
                coFunding.connect(account1).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, depositToVaultFromSpendingWalletAmount)
            ).to.be.revertedWith("InvalidMoneyTransfer");
        });
        it("Assert (false) NotEnoughMoneyInSpendingWallet", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(20000);
            await expect(
                coFunding.connect(account1).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, depositToVaultFromSpendingWalletAmount)
            ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet");
        });
        it("Assert (false) with error vaultID not valid", async () => {
            const {sampleVaultData} = await createSampleVault();
            
            let depositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: depositDirectlyToSpendingWalletAmount});
            let depositToVaultFromSpendingWalletAmount = BigNumber.from(20000);
            await expect(
                coFunding.connect(account1).depositToVaultFromSpendingWallet(convertBigNumberToBytes32(sampleVaultData.vaultIDBigInt.add(2)), depositToVaultFromSpendingWalletAmount)
            ).to.be.revertedWith("VaultNotExist");
        });
        it("Assert (false) error VaultNotInFundingProcess", async () => {
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
    });



    describe("Deposit To Vault From Spending Wallet And Set Selling Price", async () => {
        it("Assert (true) deposit to vault and set selling price", async () => {
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

            expect(await coFunding.getUserSpendingWallet(account1.address)).to.equal(
                spendingWalletBefore.sub(depositToVaultFromSpendingWalletAmount)
            );
            const expectedUserContributionInVault = {
                contributionAmount: depositToVaultFromSpendingWalletAmount,
                expectedSellingPrice: expectedSellingPrice
            }
            const expectedUserContributionInVaultOutput = convertStructToOutputStruct(expectedUserContributionInVault);
            expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                expectedUserContributionInVaultOutput
            );
            expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                expectedUserContributionInVaultOutput
            );
            const expectedUserListInVault = [account1.address];
            expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                expectedUserListInVault
            );
        });
        it("Assert (true) deposit to vault and set selling price", async () => {
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

            expect(await coFunding.getUserSpendingWallet(account1.address)).to.equal(
                spendingWalletBefore.sub(depositToVaultFromSpendingWalletAmount)
            );
            const expectedUserContributionInVault = {
                contributionAmount: depositToVaultFromSpendingWalletAmount,
                expectedSellingPrice: expectedSellingPrice
            }
            const expectedUserContributionInVaultOutput = convertStructToOutputStruct(expectedUserContributionInVault);
            expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                expectedUserContributionInVaultOutput
            );
            expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                expectedUserContributionInVaultOutput
            );
            const expectedUserListInVault = [account1.address];
            expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                expectedUserListInVault
            );
        });
        it("Assert (false) error InvalidMoneyTransfer", async () => {
            const {sampleVaultData} = await createSampleVault();
            let depositToVaultFromSpendingWalletAmount = BigNumber.from('0');
            let expectedSellingPrice = sampleVaultData.defaultExpectedPrice.add(1000);
            await expect(
                coFunding.connect(account1).depositToVaultFromSpendingWalletAndSetSellingPrice(
                    sampleVaultData.vaultID,
                    depositToVaultFromSpendingWalletAmount,
                    expectedSellingPrice
                )
            ).to.be.revertedWith("InvalidMoneyTransfer");
        });
        it("Assert (false) error NotEnoughMoneyInSpendingWallet", async () => {
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
        it("Assert (false) error VaultNotExist", async () => {
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
        it("Assert (false) error VaultNotInFundingProcess", async () => {
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
        
    });

    */

    describe("Deposit Directly To Vault", async () => {
        it("Assert (true) deposit directly to vault", async () => {
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

            let expectedUserContribution:UserContributionStruct = {
                contributionAmount: depositToVaultDirectlyAmount,
                expectedSellingPrice: BigNumber.from(0)
            }
            expect(await coFunding.getContributionInVault(sampleVaultData.vaultID, account1.address)).to.deep.equal(
                convertStructToOutputStruct(expectedUserContribution)
            );

            expect(await coFunding.getVaultTotalContribution(sampleVaultData.vaultID)).to.equal(
                depositToVaultDirectlyAmount
            );

            const expectedUserListInVault = [account1.address];
            expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
                expectedUserListInVault
            );
        });
        // it("Assert (false)", async () => {
        // });
    });

    // describe("", async () => {
    //     it("Assert (true)", async () => {
    //     });
    //     it("Assert (false)", async () => {
    //     });
    // });
});

// it("Assert (true) userlist when withdraw all money from vault", async () => {
//     const {sampleVaultData} = await createSampleVault();
    
//     let account1DepositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
//     await coFunding.connect(account1).depositDirectlyToSpendingWallet({value: account1DepositDirectlyToSpendingWalletAmount});
//     let account1DepositToVaultFromSpendingWalletAmount = BigNumber.from(6000);
//     await coFunding.connect(account1).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, account1DepositToVaultFromSpendingWalletAmount);
    
//     let account2DepositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
//     await coFunding.connect(account2).depositDirectlyToSpendingWallet({value: account2DepositDirectlyToSpendingWalletAmount});
//     let account2DepositToVaultFromSpendingWalletAmount = BigNumber.from(8000);
//     await coFunding.connect(account2).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, account2DepositToVaultFromSpendingWalletAmount);

//     let account3DepositDirectlyToSpendingWalletAmount = BigNumber.from(10000);
//     await coFunding.connect(account3).depositDirectlyToSpendingWallet({value: account3DepositDirectlyToSpendingWalletAmount});
//     let account3DepositToVaultFromSpendingWalletAmount = BigNumber.from(8000);
//     await coFunding.connect(account3).depositToVaultFromSpendingWallet(sampleVaultData.vaultID, account3DepositToVaultFromSpendingWalletAmount);
    
//     let expectedUserListInVault = [account1.address,account2.address,account3.address];
//     expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
//         expectedUserListInVault
//     );

//     await coFunding.connect(account1).withdrawFromVaultToSpendingWallet(sampleVaultData.vaultID, account1DepositToVaultFromSpendingWalletAmount);
//     expectedUserListInVault = [account2.address,account3.address];
//     expect(await coFunding.getListOfUserInVault(sampleVaultData.vaultID)).to.deep.equal(
//         expectedUserListInVault
//     );
    
// });