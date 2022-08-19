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

import type {
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

    const convertNumberToBytes32 = (vaultID: number) => {
        let vaultIDString = vaultID.toString();
        let res = "0x";
        for (let i: number = 0; i < (64 - vaultIDString.length); i++){
            res = res.concat("0");
        }
        res = res.concat(vaultIDString);
        return res;
    }

    const createVaultFunctionDataStructure = (
        vaultID: number,
        nftCollection: string,
        nftID: number,
        startFundingTime: number,
        endFundingTime: number,
        initialPrice: number,
        defaultExpectedPrice: number
    ) => {
        let vaultIDBytes32 = convertNumberToBytes32(vaultID);
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
            number,
            number,
            number,
            number,
            number
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
        convertNumberToBytes32,
    };
};
  
export type CoFundingFixtures = Awaited<ReturnType<typeof coFundingFixture>>;  