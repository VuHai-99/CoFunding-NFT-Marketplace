import { expect } from "chai";
import { Contract, constants } from "ethers";
import { ethers } from "hardhat";

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
import { coFundingFixture } from "./cofunding";

const { provider } = ethers;

export const coFundingUtilsFixture = async (owner: Wallet) => {
    const {
        coFunding,
        createVaultFunctionDataStructure
    } = await coFundingFixture(
        owner
    );

    return {
        coFunding,
        createVaultFunctionDataStructure
    }
};
  
export type CoFundingUtilsFixtures = Awaited<ReturnType<typeof coFundingUtilsFixture>>;  