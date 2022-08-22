import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { CoFunding, TestERC721 } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { UserContributionStruct, UserContributionStructOutput, CoFundingInterface } from "../typechain-types/contracts/CoFunding";


const { parseEther } = ethers.utils;

describe("CoFunding with no marketplace features", async function () {
    let owner: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let zone: SignerWithAddress;
    let seaport: SignerWithAddress;

    let testERC721:TestERC721;
    let coFunding: CoFunding;

    const testERC721_ID_Owner = 1;
    const testERC721_ID_Account1 = 2;
    const testERC721_ID_Account2 = 3;
    const testERC721_ID_Account3 = 4;

    async function currentTestcaseTime(msg: string){
        let now = Math.floor(new Date().getTime() / 1000.0);
        // console.log(msg," at: ", now);
      }
    async function timeout(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function deployTestERC721(){
        let TestERC721 = await ethers.getContractFactory("TestERC721");
        let testERC721 = await TestERC721.connect(owner).deploy();
        return { testERC721 };
    }

    async function deployCoFunding(){
        let CoFunding = await ethers.getContractFactory("CoFunding");
        let coFunding = await CoFunding.connect(owner).deploy(seaport.address);
        return { coFunding };
    }

    before(async () => {
        [owner, account1, account2, zone, seaport] = await ethers.getSigners();
        ({testERC721} = await loadFixture(deployTestERC721));
        // ({coFunding} = await loadFixture(deployCoFunding));

        await testERC721.connect(owner).mint(owner.address, testERC721_ID_Owner);
        await testERC721.connect(owner).mint(account1.address, testERC721_ID_Account1);
        await testERC721.connect(owner).mint(account2.address, testERC721_ID_Account2);

        // await testERC721.connect(owner).approve(seaport.address, testERC721_ID_Owner);
        // await testERC721.connect(account1).approve(seaport.address, testERC721_ID_Account1);
        
    });

    describe("Basic Deployment", function () {
        it("User Address", async function () {
            console.log("Owner address: ", owner.address);
            console.log("Account1 address: ", account1.address);
            console.log("Account2 address: ", account2.address);
            console.log("Zone address: ", zone.address);
            console.log("Seaport address: ", seaport.address);

            console.log("testERC721 address: ", testERC721.address);
            console.log("CoFunding address: ", coFunding.address);
        });
        // it("Mint (ERC721;ID=1;Owner) (ERC721;ID=2;Account1) (ERC721;ID=3;Account2) (ERC721;ID=4;Account3)", async function () {
        //     console.log("TestERC721 deployed address: ", testERC721.address);
        //     expect(await testERC721.connect(owner).ownerOf(testERC721_ID_Owner)).to.equal(
        //         owner.address
        //     );
        //     expect(await testERC721.connect(owner).ownerOf(testERC721_ID_Account1)).to.equal(
        //         account1.address
        //     );
        //     expect(await testERC721.connect(owner).ownerOf(testERC721_ID_Account2)).to.equal(
        //         account2.address
        //     );
        //     expect(await testERC721.connect(owner).ownerOf(testERC721_ID_Account3)).to.equal(
        //         zone.address
        //     );
        // });
    });


    describe("Testing CoFunding functions", function () {
        it("Create_Vault", async function () {
            /* Scenerio
            1. Create vault.
            */

            /* Result
            1. Create successful vault
            2. Create vault error with duplicate vaultID 
            3. Create vault error with error startFundingTime < block.timestamp
            4. Create vault error with error endFundingTime < startFundingTime
            */

            //1. Create successful vault
            let now = Math.floor(new Date().getTime() / 1000.0);

            let vaultID = "0x0000000000000000000000000000000000000000000000000000000000000001";
            let nftCollection = testERC721.address;
            let nftID = testERC721_ID_Account1;
            let startFundingTime = now + 100;
            let endFundingTime = now + 1000;
            let initialPrice = 100;

            let tx = coFunding.connect(account1).createVault(
                vaultID,nftCollection,nftID,startFundingTime,endFundingTime,initialPrice
            );
            let receipt = await (await tx).wait();
            // console.log(receipt.events);

            let onchain_vault = await coFunding.connect(account1).getVault(vaultID);
            // console.log(onchain_vault.nftCollection);
            expect(onchain_vault.nftCollection).to.equal(
                nftCollection
            );
            expect(onchain_vault.nftID).to.equal(
                nftID
            );
            expect(onchain_vault.startFundingTime).to.equal(
                startFundingTime
            );
            expect(onchain_vault.endFundingTime).to.equal(
                endFundingTime
            );
            expect(onchain_vault.initialPrice).to.equal(
                initialPrice
            );

            //2. Create vault error with duplicate vaultID 
            // await expect(coFunding.connect(account1).createVault(vaultID,nftCollection,nftID,startFundingTime,endFundingTime,initialPrice)
            // ).to.be.revertedWith("VaultIDExisted");
            await expect(coFunding.connect(account1).createVault(vaultID,nftCollection,nftID,startFundingTime,endFundingTime,initialPrice)
            ).to.be.reverted;

            //3. Create vault error with error startFundingTime < block.timestamp
            let vaultID3 = "0x0000000000000000000000000000000000000000000000000000000000000002";
            let startFundingTime3 = now - 100;
            // await expect(coFunding.connect(account1).createVault(vaultID3,nftCollection,nftID,startFundingTime3,endFundingTime,initialPrice)
            // ).to.be.revertedWith("ErrorTimeRange()");
            await expect(coFunding.connect(account1).createVault(vaultID3,nftCollection,nftID,startFundingTime3,endFundingTime,initialPrice)
            ).to.be.reverted;
            // await coFunding.connect(account1).createVault(vaultID3,nftCollection,nftID,startFundingTime3,endFundingTime,initialPrice);

            //4. Create vault error with error endFundingTime < startFundingTime
            let startFundingTime4 = now + 100;
            let endFundingTime4 = now + 50;
            // await expect(coFunding.connect(account1).createVault(vaultID3,nftCollection,nftID,startFundingTime4,endFundingTime4,initialPrice)
            // ).to.be.revertedWith("ErrorTimeRange()");
            await expect(coFunding.connect(account1).createVault(vaultID3,nftCollection,nftID,startFundingTime4,endFundingTime4,initialPrice)
            ).to.be.reverted;
            // await coFunding.connect(account1).createVault(vaultID3,nftCollection,nftID,startFundingTime4,endFundingTime4,initialPrice);            
        });
        it("Set_Selling_Price", async function () {
            /* Scenerio
            1. Create vault.
            2. Deposit money into spending wallet.
            3. Deposit money into vault.
            */

            /* Result
            1. Successfully set selling price
            2. Set selling price with error vaultID not valid
            3. Set selling price with error vaultID not in funding process.
            4. Set selling price with error participant have not deposit money.
            */

            //1. Successfully set selling price
            let now = Math.floor(new Date().getTime() / 1000.0);

            let vaultID = "0x0000000000000000000000000000000000000000000000000000000000000010";
            let nftCollection = testERC721.address;
            let nftID = testERC721_ID_Account1;
            let startFundingTime = now + 100;
            let endFundingTime = now + 1000;
            let initialPrice = 100;
            let depositDirectlyToSpendingWalletAmount = 10000;
            let depositToVaultAmount = 5000;
            let expectedSellingPrice = 30000;
            await coFunding.connect(account1).createVault(
                vaultID,nftCollection,nftID,startFundingTime,endFundingTime,initialPrice
            );
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({ value: depositDirectlyToSpendingWalletAmount });
            await coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID, depositToVaultAmount);
            let tx = coFunding.connect(account1).setSellingPrice(vaultID, expectedSellingPrice);
            let receipt = await (await tx).wait();
            // console.log(receipt);

            let onchain_contributionInfo = await coFunding.connect(account1).getContributionInVault(vaultID,account1.address);
            // console.log(onchain_contributionInfo);
            expect(onchain_contributionInfo.contributionAmount).to.equal(
                depositToVaultAmount
            );
            expect(onchain_contributionInfo.expectedSellingPrice).to.equal(
                expectedSellingPrice
            );

            //2. Set selling price with error vaultID not valid
            let vaultID2 = "0x0000000000000000000000000000000000000000000000000000000000000009";
            // await coFunding.connect(account1).setSellingPrice(vaultID2, expectedSellingPrice);
            // await expect(coFunding.connect(account1).setSellingPrice(vaultID2, expectedSellingPrice)
            // ).to.be.revertedWith("ErrorTimeRange()");
            await expect(coFunding.connect(account1).setSellingPrice(vaultID2, expectedSellingPrice)
            ).to.be.reverted;

            //3. Set selling price with error vaultID not in funding process.
            await coFunding.connect(owner).changeStateVault(vaultID, 1) //funded
            // await coFunding.connect(account1).setSellingPrice(vaultID, expectedSellingPrice);
            // await coFunding.connect(owner).changeStateVault(vaultID, 2) //Ended
            // await coFunding.connect(account1).setSellingPrice(vaultID, expectedSellingPrice);
            // await coFunding.connect(owner).changeStateVault(vaultID, 3) //Disable
            // await coFunding.connect(account1).setSellingPrice(vaultID, expectedSellingPrice);
            // await expect(coFunding.connect(account1).setSellingPrice(vaultID, expectedSellingPrice)
            // ).to.be.revertedWith("ErrorTimeRange()");
            await expect(coFunding.connect(account1).setSellingPrice(vaultID, expectedSellingPrice)
            ).to.be.reverted;

            //4. Set selling price with error participant have not deposit money.
            await coFunding.connect(owner).changeStateVault(vaultID, 0)
            // await coFunding.connect(account2).setSellingPrice(vaultID, expectedSellingPrice);
            await expect(coFunding.connect(account2).setSellingPrice(vaultID, expectedSellingPrice)
            ).to.be.reverted;

        });
        it("Deposit_Directly_To_Spending_Wallet", async function () {
            /* Scenerio
            */

            /* Result
            1. Successfully deposit into spending wallet. ( Check _vaultUsers)
            2. Deposit to spending wallet error InvalidMoneyTransfer
            */

            //1. Successfully deposit into spending wallet. ( Check _vaultUsers)
            let depositDirectlyToSpendingWalletAmount = 10000;
            let userSpendingWalletBefore = await coFunding.connect(account1).getUserSpendingWallet(account1.address);
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({ value: depositDirectlyToSpendingWalletAmount });
            let userSpendingWalletAfter = await coFunding.connect(account1).getUserSpendingWallet(account1.address);
            expect(userSpendingWalletAfter.sub(userSpendingWalletBefore)).to.equal(
                depositDirectlyToSpendingWalletAmount
            );
        
            //2. Deposit to spending wallet error InvalidMoneyTransfer
            // await coFunding.connect(account1).depositDirectlyToSpendingWallet({ value: 0 });
            // await expect(coFunding.connect(account1).depositDirectlyToSpendingWallet({ value: 0 })
            // ).to.be.revertedWith("InvalidMoneyTransfer()");
            await expect(coFunding.connect(account1).depositDirectlyToSpendingWallet({ value: 0 })
            ).to.be.reverted;
        });
        it("Withdraw_Directly_From_Spending_Wallet", async function () {
            /* Scenerio
            */

            /* Result
            1. Successfully withdraw from spending wallet. ( Check _vaultUsers)
            2. Withdraw from spending wallet error InvalidMoneyTransfer
            3. Withdraw from spending wallet error NotEnoughMoneyInSpendingWallet
            */
           
            
            let userSpendingWalletBefore = await coFunding.connect(account1).getUserSpendingWallet(account1.address);
            let withdrawAmount = userSpendingWalletBefore.div(2);

            //1. Successfully withdraw from spending wallet. ( Check _vaultUsers)
            await coFunding.connect(account1).withdrawDirectlyFromSpendingWallet(withdrawAmount);
            expect(await coFunding.connect(account1).getUserSpendingWallet(account1.address)).to.equal(
                userSpendingWalletBefore.sub(withdrawAmount)
            );

            //2. Withdraw from spending wallet error InvalidMoneyTransfer
            // await coFunding.connect(account1).withdrawDirectlyFromSpendingWallet(0);
            // await expect(coFunding.connect(account1).depositDirectlyToSpendingWallet({ value: 0 })
            // ).to.be.revertedWith("InvalidMoneyTransfer()");
            await expect(coFunding.connect(account1).withdrawDirectlyFromSpendingWallet(0)
            ).to.be.reverted;

            //3. Withdraw from spending wallet error NotEnoughMoneyInSpendingWallet
            // await coFunding.connect(account1).withdrawDirectlyFromSpendingWallet(userSpendingWalletBefore);
            // await expect(coFunding.connect(account1).withdrawDirectlyFromSpendingWallet(userSpendingWalletBefore)
            // ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet()");
            await expect(coFunding.connect(account1).withdrawDirectlyFromSpendingWallet(userSpendingWalletBefore)
            ).to.be.reverted;
        });
        it("Deposit_To_Vault_From_Spending_Wallet", async function () {
            /* Scenerio
            1. Create vault.
            2. Deposit money into spending wallet.
            */

            /* Result
            1. Successfully deposit to vault from spending wallet. ( Check _userContributions and _vaultUsers and _vaultInfos and _userSpendingWallets)
            2. Deposit to vault from spending wallet error InvalidMoneyTransfer
            3. Deposit to vault from spending wallet error NotEnoughMoneyInSpendingWallet
            4. Successfully deposit to vault from spending wallet then deposit second time. Check that first time _vaultUsers have new item and second dont.
            5. Deposit to vault from spending wallet with error vaultID not valid
            6. Deposit to vault from spending wallet with error vaultID not in funding process.
            */

            let now = Math.floor(new Date().getTime() / 1000.0);

            let vaultID = "0x0000000000000000000000000000000000000000000000000000000000000100";
            let nftCollection = testERC721.address;
            let nftID = testERC721_ID_Account1;
            let startFundingTime = now + 100;
            let endFundingTime = now + 1000;
            let initialPrice = 100;
            let depositDirectlyToSpendingWalletAmount = 10000;
            let depositToVaultAmount = 5000;
            // let expectedSellingPrice = 30000;
            await coFunding.connect(account1).createVault(
                vaultID,nftCollection,nftID,startFundingTime,endFundingTime,initialPrice
            );
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({ value: depositDirectlyToSpendingWalletAmount });

            //1. Successfully deposit to vault from spending wallet. ( Check _userContributions and _vaultUsers and _vaultInfos and _userSpendingWallets)
            let userSpendingWalletBefore = await coFunding.connect(account1).getUserSpendingWallet(account1.address);
            await coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID,depositToVaultAmount);
            let userSpendingWalletAfter = await coFunding.connect(account1).getUserSpendingWallet(account1.address);
            let account1VaultWalletAmount = await coFunding.connect(account1).getContributionInVault(vaultID,account1.address);
            let vaultTotalWallet = await coFunding.connect(account1).getVaultTotalContribution(vaultID);
            expect(userSpendingWalletBefore.sub(depositToVaultAmount)).to.equal(
                userSpendingWalletAfter
            );
            // console.log(account1VaultWalletAmount);
            expect(account1VaultWalletAmount.contributionAmount).to.equal(
                depositToVaultAmount
            );
            expect(vaultTotalWallet).to.equal(
                depositToVaultAmount
            );
            await coFunding.connect(account2).depositDirectlyToVault(vaultID,{ value: depositToVaultAmount });
            let account2VaultWalletAmount = await coFunding.connect(account1).getContributionInVault(vaultID,account2.address);
            expect(account2VaultWalletAmount.contributionAmount).to.equal(
                depositToVaultAmount
            );
            expect(await coFunding.connect(account1).getVaultTotalContribution(vaultID)).to.equal(
                depositToVaultAmount*2
            );

            //2. Deposit to vault from spending wallet error InvalidMoneyTransfer
            // await coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID,0);
            // await expect(coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID,0)
            // ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet()");
            await expect(coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID,0)
            ).to.be.reverted;

            //3. Deposit to vault wallet error NotEnoughMoneyInSpendingWallet
            // await coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID,userSpendingWalletAfter.mul(2));
            // await expect(coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID,userSpendingWalletAfter.mul(2))
            // ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet");
            await expect(coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID,userSpendingWalletAfter.mul(2))
            ).to.be.reverted;

            //4. Successfully deposit to vault from spending wallet then deposit second time. Check that first time _vaultUsers have new item and second dont.
            let userListInVault = await coFunding.connect(account2).getListOfUserInVault(vaultID);
            await coFunding.connect(account2).depositDirectlyToVault(vaultID,{ value: depositToVaultAmount });
            let userListInVaultAfterDepositTwice = await coFunding.connect(account2).getListOfUserInVault(vaultID); 
            expect(userListInVaultAfterDepositTwice).to.deep.equal(
                userListInVault
            );

            //5. Deposit to vault from spending wallet with error vaultID not valid
            let vaultID5 = "0x0000000000000000000000000000000000000000000000000000000000000101";
            // await coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID5,userSpendingWalletAfter.div(2));
            // await expect(coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID5,userSpendingWalletAfter.div(2))
            // ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet");
            await expect(coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID5,userSpendingWalletAfter.div(2))
            ).to.be.reverted;

            //6. Deposit to vault from spending wallet with error vaultID not in funding process.
            await coFunding.connect(owner).changeStateVault(vaultID,1);
            // await coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID,userSpendingWalletAfter.div(2));
            // await expect(coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID5,userSpendingWalletAfter.div(2))
            // ).to.be.revertedWith("NotEnoughMoneyInSpendingWallet");
            await expect(coFunding.connect(account1).depositToVaultFromSpendingWallet(vaultID5,userSpendingWalletAfter.div(2))
            ).to.be.reverted;

        });
        it("Deposit_To_Vault_And_Set_Selling_Price", async function () {
            /* Scenerio
            1. Create vault.
            2. Deposit money into spending wallet.
            */

            /* Result
            1. Successfully deposit to vault and set selling price from spending wallet. ( Check _userContributions and _vaultUsers and _vaultInfos and _userSpendingWallets)
            2. Withdraw from spending wallet error InvalidMoneyTransfer
            3. Withdraw from spending wallet error NotEnoughMoneyInSpendingWallet
            4. Set selling price with error vaultID not valid
            5. Set selling price with error vaultID not in funding process.
            6. Successfully deposit to vault from spending wallet then deposit second time. Check that first time _vaultUsers have new item and second dont.
            */

            let now = Math.floor(new Date().getTime() / 1000.0);

            let vaultID = "0x0000000000000000000000000000000000000000000000000000000000001000";
            let nftCollection = testERC721.address;
            let nftID = testERC721_ID_Account1;
            let startFundingTime = now + 100;
            let endFundingTime = now + 1000;
            let initialPrice = 100;
            let depositDirectlyToSpendingWalletAmount = 10000;
            let depositToVaultAmount = 5000;
            let expectedSellingPrice = 30000;
            await coFunding.connect(account1).createVault(
                vaultID,nftCollection,nftID,startFundingTime,endFundingTime,initialPrice
            );
            await coFunding.connect(account1).depositDirectlyToSpendingWallet({ value: depositDirectlyToSpendingWalletAmount });

            //1. Successfully deposit to vault and set selling price from spending wallet. ( Check _userContributions and _vaultUsers and _vaultInfos and _userSpendingWallets)
            await coFunding.connect(account1).depositToVaultFromSpendingWalletAndSetSellingPrice(vaultID, depositToVaultAmount, expectedSellingPrice);
            let userContribution = await coFunding.connect(account1).getContributionInVault(vaultID,account1.address);
            expect(userContribution.contributionAmount).to.equal(
                depositToVaultAmount
            );
            expect(userContribution.expectedSellingPrice).to.equal(
                expectedSellingPrice
            );


            // let userContribution: UserContributionStructOutput = await coFunding.connect(account1).getContributionInVault(vaultID,account1.address);
            // let expectedUserContribution: UserContributionStructOutput = {
            //     contributionAmount: depositDirectlyToSpendingWalletAmount-depositToVaultAmount,
            //     expectedSellingPrice: expectedSellingPrice
            // }
            // console.log(userContribution);
         
            // expect(userContribution).to.deep.equal(
            //     expectedUserContribution
            // );

        });
        it("Deposit_Directly_To_Vault", async function () {
            /* Scenerio
            1. Create vault.
            */

            /* Result
            1. Successfully deposit to vault directly. (check _userContributions, _vaultInfos)
            2. Error IsVaultIDExitedAndInFundingProcess
            3. Error InvalidMoneyTransfer
            4. Successfully deposit to vault directly then deposit second time. Check that first time _vaultUsers have new item and second dont.
            */
        });
        it("Deposit_Directly_And_From_Spending_Wallet_To_Vault", async function () {
            /* Scenerio
            1. Create vault.
            2. Deposit to spending wallet
            */

            /* Result
            1. Successfully deposit to vault directly and spending wallet. (check _userContributions, _vaultInfos)
            2. Error IsVaultIDExitedAndInFundingProcess
            3. Error InvalidMoneyTransfer
            4. Successfully deposit to vault directly then deposit second time. Check that first time _vaultUsers have new item and second dont.
            6. Deposit to vault from spending wallet error NotEnoughMoneyInSpendingWallet
            7. Deposit to vault from spending wallet with error vaultID not valid
            8. Deposit to vault from spending wallet with error vaultID not in funding process.
            */
        });
        it("Withdraw_Directly_And_From_Spending_Wallet_To_Vault", async function () {
            
        });     
        it("Withdraw_From_Vault_To_Spending_Wallet", async function () {
            /* Scenerio
            1. Create vault.
            2. Deposit money into spending wallet.
            2. Deposit money into vault.
            */

            /* Result
            1. Successfully withdraw from vault to spending wallet. ( Check _userContributions and _vaultUsers and _vaultInfos and _userSpendingWallets)
            2. Withdraw from spending wallet error NotEnoughMoneyInUserVault
            3. Withdraw from spending wallet error UserHaveNotParticipatedInVault
            4. Withdraw from spending wallet error NotEnoughMoneyInTotalVault
            5. Successfully withdraw half money from vault to spending wallet then withdraw other half second time. Check that first time _vaultUsers still have old item and second dont.
            6. Set selling price with error vaultID not valid
            7. Set selling price with error vaultID not in funding process.
            */
        });
        it("Withdraw_Directly_From_Vault", async function () {
            
        });
        it("End_Funding_Phase", async function () {
            /* Scenerio
            1. Create vault.
            2. Account 1 Deposit money into spending wallet.
            3. Account 2 Deposit money into spending wallet.
            4. Account 1 Deposit money into vault.
            5. Account 2 Deposit money into vault.
            */

            /* Result
            1. Successfully end funding phase when boughtPrice <= vaultInfo.initialPrice. ( Check _vaultInfos[vaultID])
            2. Successfully end funding phase when boughtPrice > vaultInfo.initialPrice. ( Check _vaultInfos[vaultID])
            3. End funding phase with error vaultID not valid
            4. End funding phase with error vaultID not in funding process.
            5. End funding phase with error not owner.
            */
        });
        it("Finish_Vault", async function () {
            /* Scenerio
            1. Create vault.
            2. Account 1 Deposit money into spending wallet.
            3. Account 2 Deposit money into spending wallet.
            4. Account 1 Deposit money into vault.
            5. Account 2 Deposit money into vault.
            6. Vault endFundingPhase()
            7. Deposit x2 money
            */

            /* Result
            1. Successfully Finish vault. Check if everybody money x2
            2. Finish vault with error vaultID not valid
            3. Finish vault with error VaultCannotBeFinish
            */
        });
        it("Change_State_Vault", async function () {
            /* Scenerio
            1. Create vault.
            2. Account 1 Deposit money into spending wallet.
            3. Account 1 Deposit money into vault.
            */

            /* Result
            1. Successfully change state vault to Eisable. Check call every external function xem co duoc khong
            2. Successfully change state vault to End. Check call every external function xem co duoc khong
            3. End funding phase with error vaultID not valid
            4. End funding phase with error not owner.
            */
        });
    });
});
