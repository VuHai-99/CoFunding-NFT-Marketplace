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

    return {
        coFunding
    }
};
  
export type CoFundingFixtures = Awaited<ReturnType<typeof coFundingFixture>>;  