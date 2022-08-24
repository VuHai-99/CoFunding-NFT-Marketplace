import { expect } from "chai";
// import { Contract, constants } from "ethers";
import hre, { ethers } from "hardhat";

import { deployContract } from "../contracts";

// import type {
//     OfferItemStruct,
//     ConsiderationItemStruct,
//     OrderParametersStruct,
//     OrderStruct,
//     AdditionalRecipientStruct,
//     BasicOrderParametersStruct,
//     UserContributionStruct,
//     VaultInfoStruct
// } from "../../../typechain-types/contracts/CoFunding";

import {
    BigNumber,
    BigNumberish,
    ContractReceipt,
    ContractTransaction,
    Wallet,
} from "ethers";
import { MockCoFunding } from "../../../typechain-types";

const { provider } = ethers;

export const coFundingFixture =  async (
    owner: Wallet
) => {
    let coFunding: MockCoFunding;
    coFunding = await deployContract("MockCoFunding", owner, owner.address);
    let validNewNFTID = 1;
    let validNewVaultID = 1;
    let defaultInitialPrice = 2000;
    let defaultExpectedPrice = 2500;

    const convertBigNumberToBytes32 = (vaultID: BigNumberish) => {
        let vaultIDString = vaultID.toString();
        let res = "0x";
        for (let i: number = 0; i < (64 - vaultIDString.length); i++){
            res = res.concat("0");
        }
        res = res.concat(vaultIDString);
        return res;
    }

    // -)If(Vault_total_amount <= Initial_price)
    //     +) Vaule_expected_selling_price = (User_voted_expected_total_share + Default_voted_expected_total_share ) / Initial_price
    //     +) User_voted_expected_total_share = (User_voted_expected_price * User_DidVote_contribution_amount ) 
    //     +) Default_voted_expected_total_share = (Vault_default_expected_price + User_DidNotVote_contribution_amount ) 
    // -)Else(Vault_total_amount > Initial_price)
    //     +) Vaule_expected_selling_price = (User_voted_expected_total_share) / Vault_total_amount
    //     +) User_voted_expected_total_share = (User_voted_expected_price * User_DidVote_contribution_amount ) 
    const calculateExpectedSellingPrice = async (
        vaultID: string
    ) => {
        let vaultUser = await coFunding.getListOfUserInVault(vaultID);
        let vaultInfo = await coFunding.getVault(vaultID);
        let expectedSellingPrice:BigNumber = BigNumber.from(0);
        let userVotedExpectedTotalShare:BigNumber = BigNumber.from(0);

        if(vaultInfo.totalAmount.lte(vaultInfo.initialPrice)) {
            let userDefaultExpectedTotalShare:BigNumber = BigNumber.from(0);
            for (let i:number = 0; i< vaultUser.length; i++){
                let userContribution = await coFunding.getContributionInVault(vaultID,vaultUser[i]);
                if(!userContribution.expectedSellingPrice.eq(0)){
                    userVotedExpectedTotalShare = userVotedExpectedTotalShare.add(userContribution.expectedSellingPrice.mul(userContribution.contributionAmount));
                }
                userDefaultExpectedTotalShare = (vaultInfo.initialPrice.sub(vaultInfo.totalAmount)).mul(vaultInfo.defaultExpectedPrice);
        
                expectedSellingPrice = (userVotedExpectedTotalShare.add(userDefaultExpectedTotalShare)).div(vaultInfo.initialPrice);
            }
        } else {
            let userDefaultExpected = vaultInfo.totalAmount;
            for (let i:number = 0; i< vaultUser.length; i++){
                let userContribution = await coFunding.getContributionInVault(vaultID,vaultUser[i]);
                if(!userContribution.expectedSellingPrice.eq(0)){
                    userVotedExpectedTotalShare = userVotedExpectedTotalShare.add(userContribution.expectedSellingPrice.mul(userContribution.contributionAmount));
                    userDefaultExpected = userDefaultExpected.sub(userContribution.contributionAmount);
                }
            }
            expectedSellingPrice = (userVotedExpectedTotalShare.add(vaultInfo.defaultExpectedPrice.mul(userDefaultExpected))).div(vaultInfo.totalAmount);
        }

        return expectedSellingPrice;
    };

    const calculateRewardAfterFinishVault = async (
        vaultID: string,
        sellingPrice: BigNumberish
    ) => {
        let vaultUser = await coFunding.getListOfUserInVault(vaultID);
        let vaultInfo = await coFunding.getVault(vaultID);
        let rewardMoney = (vaultInfo.totalAmount.add(sellingPrice)).sub(vaultInfo.boughtPrice);
        let res:Array<{address: string; amount: BigNumber}> = [];
        for (let i:number = 0; i< vaultUser.length; i++){
            let userContribution = await coFunding.getContributionInVault(vaultID,vaultUser[i]);
            let userReward = (rewardMoney.mul(userContribution.contributionAmount)).div(vaultInfo.totalAmount);
            res.push({
                address: vaultUser[i],
                amount: userReward
            });
        }

        return res;
    };

    const createVaultFunctionDataStructure = (
        vaultID: BigNumberish,
        nftCollection: string,
        nftID: BigNumberish,
        startFundingTime: BigNumberish,
        endFundingTime: BigNumberish,
        initialPrice: BigNumberish,
        defaultExpectedPrice: BigNumberish
    ) => {
        let vaultIDBytes32 = convertBigNumberToBytes32(vaultID);
        const createVaultParamObj = {
            vaultID: vaultIDBytes32,
            nftCollection: nftCollection,
            nftID: nftID,
            startFundingTime: startFundingTime,
            endFundingTime: endFundingTime,
            initialPrice: initialPrice,
            defaultExpectedPrice: defaultExpectedPrice
        };
        const createVaultParamTuple:[
            string,
            string,
            BigNumberish,
            BigNumberish,
            BigNumberish,
            BigNumberish,
            BigNumberish
        ] = [
            vaultIDBytes32,
            nftCollection,
            nftID,
            startFundingTime,
            endFundingTime,
            initialPrice,
            defaultExpectedPrice
        ];

        return {
            createVaultParamObj,
            createVaultParamTuple
        }
    };
    

    //All Modifier/Error check function
    async function errorRevertVaultNotInFundingProcess(
        account: Wallet,
        vaultID: string,
        functionData: string,
        value?: BigNumberish,
        timeTravel?: BigNumberish
    ){
        let tx:any;
        if(value === undefined){
            tx = {
                to: coFunding.address,
                data: functionData
            }
        } else {
            tx = {
                to: coFunding.address,
                data: functionData,
                value: value
            }
        }
        
        if((account.address === owner.address) && (timeTravel != null)){
            await expect(
                account.sendTransaction(tx)
            ).to.be.revertedWith("VaultNotInFundingProcess");   
            await coFunding.connect(owner).timeTravelVault(vaultID, timeTravel);
        }

        await coFunding.connect(owner).changeStateVault(vaultID,1);
        await expect(
            account.sendTransaction(tx)
        ).to.be.revertedWith("VaultNotInFundingProcess");        

        await coFunding.connect(owner).changeStateVault(vaultID,2);
        await expect(
            account.sendTransaction(tx)
        ).to.be.revertedWith("VaultNotInFundingProcess");

        await coFunding.connect(owner).changeStateVault(vaultID,3);
        await expect(
            account.sendTransaction(tx)
        ).to.be.revertedWith("VaultNotInFundingProcess");

        
    }

    async function errorRevertIsVaultIDExitedAndInFundingProcess(
        account: Wallet,
        vaultID: string,
        functionData1: string,
        functionData2: string,
        value?: BigNumberish
    ){
        let tx1:any;
        let tx2:any;
        if(value === undefined){
            tx1 = {
                to: coFunding.address,
                data: functionData1
            }
            tx2 = {
                to: coFunding.address,
                data: functionData2
            }
        } else {
            tx1 = {
                to: coFunding.address,
                data: functionData1,
                value: value
            }
            tx2 = {
                to: coFunding.address,
                data: functionData2,
                value: value
            }
        }
        await expect(
            account.sendTransaction(tx1)
        ).to.be.revertedWith("IsVaultIDExitedAndInFundingProcess"); 

        await coFunding.connect(owner).changeStateVault(vaultID,1);
        await expect(
            account.sendTransaction(tx2)
        ).to.be.revertedWith("IsVaultIDExitedAndInFundingProcess");        

        await coFunding.connect(owner).changeStateVault(vaultID,2);
        await expect(
            account.sendTransaction(tx2)
        ).to.be.revertedWith("IsVaultIDExitedAndInFundingProcess");

        await coFunding.connect(owner).changeStateVault(vaultID,3);
        await expect(
            account.sendTransaction(tx2)
        ).to.be.revertedWith("IsVaultIDExitedAndInFundingProcess");
    }

    

    async function errorRevertInvalidMoneyTransfer(
        account: Wallet,
        functionData: string,
        payable: Boolean
    ){
        let tx1: any;
        let tx2: any;
        if(payable === false){
            tx1 = {
                to: coFunding.address,
                data: functionData
            }
        } else {
            tx1 = {
                to: coFunding.address,
                data: functionData,
                value: BigNumber.from(0)
            };

            tx2 = {
                to: coFunding.address,
                data: functionData
            };
            await expect(
                account.sendTransaction(tx2)
            ).to.be.revertedWith("InvalidMoneyTransfer");
        }
        await expect(
            account.sendTransaction(tx1)
        ).to.be.revertedWith("InvalidMoneyTransfer");
    }

    return {
        coFunding,
        createVaultFunctionDataStructure,
        convertBigNumberToBytes32,
        calculateExpectedSellingPrice,
        errorRevertVaultNotInFundingProcess,
        errorRevertIsVaultIDExitedAndInFundingProcess,
        errorRevertInvalidMoneyTransfer,
        calculateRewardAfterFinishVault
    };
};
  
export type CoFundingFixtures = Awaited<ReturnType<typeof coFundingFixture>>;  