import { expect } from "chai";
import { Contract, constants } from "ethers";
import { ethers } from "hardhat";

import { deployContract } from "../contracts";
import { tokensFixture } from "./tokens";

import type {
    BigNumber,
    BigNumberish,
    ContractReceipt,
    ContractTransaction,
    Wallet,
} from "ethers";
import { coFundingFixture } from "./cofunding";
export {
    fixtureERC20,
    fixtureERC721,
    fixtureERC1155,
    tokensFixture,
  } from "./tokens";

const { provider } = ethers;

export const coFundingUtilsFixture = async (owner: Wallet) => {
    const {
        coFunding,
        createVaultFunctionDataStructure,
        convertNumberToBytes32
    } = await coFundingFixture(
        owner
    );

    const {
        getTestItem721,
        mint721,
        mintAndApprove721,
        set721ApprovalForAll,
        testERC721
    } = await tokensFixture(owner as any);
    
    const convertStructToOutputStruct = (struct:Object) => {
        let arrValue = Object["values"](struct);
        return Object.assign(arrValue,struct);
    }

    return {
        coFunding,

        createVaultFunctionDataStructure,
        getTestItem721,
        mint721,
        mintAndApprove721,
        set721ApprovalForAll,
        testERC721,

        convertStructToOutputStruct,
        convertNumberToBytes32
    }

};
  
export type CoFundingUtilsFixtures = Awaited<ReturnType<typeof coFundingUtilsFixture>>;  