// import { expect } from "chai";
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
import { CoFundingInterface } from "../../../typechain-types";

const { provider } = ethers;

export const coFundingFixture =  async (
    owner: Wallet
) => {
    let coFunding: CoFundingInterface;
    coFunding = await deployContract("CoFunding", owner, owner.address);

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
                if(userContribution.expectedSellingPrice != BigNumber.from(0)){
                    userVotedExpectedTotalShare = userVotedExpectedTotalShare.add(userContribution.expectedSellingPrice.mul(userContribution.contributionAmount));
                }
                userDefaultExpectedTotalShare = (vaultInfo.initialPrice.sub(vaultInfo.totalAmount)).mul(vaultInfo.defaultExpectedPrice);
        
                expectedSellingPrice = (userVotedExpectedTotalShare.add(userDefaultExpectedTotalShare)).div(vaultInfo.initialPrice);
            }
        } else {
            let userDefaultExpected = vaultInfo.totalAmount;
            for (let i:number = 0; i< vaultUser.length; i++){
                let userContribution = await coFunding.getContributionInVault(vaultID,vaultUser[i]);
                if(userContribution.expectedSellingPrice != BigNumber.from(0)){
                    userVotedExpectedTotalShare = userVotedExpectedTotalShare.add(userContribution.expectedSellingPrice.mul(userContribution.contributionAmount));
                    userDefaultExpected = userDefaultExpected.sub(userContribution.contributionAmount);
                }
            }
            expectedSellingPrice = (userVotedExpectedTotalShare.add(vaultInfo.defaultExpectedPrice.mul(userDefaultExpected))).div(vaultInfo.totalAmount);
        }
        return expectedSellingPrice;
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
    }

    return {
        coFunding,
        createVaultFunctionDataStructure,
        convertBigNumberToBytes32,
        calculateExpectedSellingPrice,
    };
};
  
export type CoFundingFixtures = Awaited<ReturnType<typeof coFundingFixture>>;  