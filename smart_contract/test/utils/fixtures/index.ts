import { expect } from "chai";
import { Contract, constants } from "ethers";
import { ethers } from "hardhat";

import { deployContract } from "../contracts";
import { tokensFixture } from "./tokens";

import {
    BigNumber,
    BigNumberish,
    ContractReceipt,
    ContractTransaction,
    Wallet,
} from "ethers";
import { coFundingFixture } from "./cofunding";
import { flattenProject } from "@ethereum-waffle/compiler";
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
        convertBigNumberToBytes32,
        calculateExpectedSellingPrice,

        errorRevertVaultNotInFundingProcess,
        errorRevertIsVaultIDExitedAndInFundingProcess,
        errorRevertInvalidMoneyTransfer
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

    const balanceCheck = async (
        tx: Promise<ContractTransaction>,
        from: {address: string, amount: BigNumber}[],
        to: {address: string, amount: BigNumber}[]
    ) => {
        let fromBalanceBefore: {address: string, balance: BigNumber}[] = [];
        let toBalanceBefore: {address: string, balance: BigNumber}[] = [];
        let fromBalanceAfter: {address: string, balance: BigNumber}[] = [];
        let toBalanceAfter: {address: string, balance: BigNumber}[] = [];
        let result = false;
        for (let i:number = 0; i< from.length; i++){
            let indexBalanceBefore = await provider.getBalance(
                from[i].address
            );
            fromBalanceBefore.push({
                address: from[i].address,
                balance: indexBalanceBefore
            });
        }
        for (let i:number = 0; i< to.length; i++){
            let indexBalanceBefore = await provider.getBalance(
                to[i].address
            );
            toBalanceBefore.push({
                address: to[i].address,
                balance: indexBalanceBefore
            });
        }
        const receipt = await (await tx).wait();
        const etherLoss = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        for (let i:number = 0; i< from.length; i++){
            let indexBalanceAfter = await provider.getBalance(
                from[i].address
            );
            fromBalanceAfter.push({
                address: from[i].address,
                balance: indexBalanceAfter
            });
        }
        for (let i:number = 0; i< to.length; i++){
            let indexBalanceAfter = await provider.getBalance(
                to[i].address
            );
            toBalanceAfter.push({
                address: to[i].address,
                balance: indexBalanceAfter
            });
        }
        let totalFromDifferentAmount:BigNumber = BigNumber.from(0);
        for (let i:number = 0; i< from.length; i++){
            totalFromDifferentAmount = totalFromDifferentAmount.add(
                fromBalanceBefore[0].balance.sub(fromBalanceAfter[0].balance)
            );
        }
        let totalToDifferentAmount:BigNumber = BigNumber.from(0);
        for (let i:number = 0; i< from.length; i++){
            totalToDifferentAmount = totalToDifferentAmount.add(
                toBalanceAfter[0].balance.sub(toBalanceBefore[0].balance)
            );
        }

        if((totalFromDifferentAmount.sub(etherLoss)).eq(totalToDifferentAmount)){
            result = true;
        }

        return {
            result
        }
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
        convertBigNumberToBytes32,
        calculateExpectedSellingPrice,
        balanceCheck,

        errorRevertVaultNotInFundingProcess,
        errorRevertIsVaultIDExitedAndInFundingProcess,
        errorRevertInvalidMoneyTransfer
    }

};
  
export type CoFundingUtilsFixtures = Awaited<ReturnType<typeof coFundingUtilsFixture>>;  