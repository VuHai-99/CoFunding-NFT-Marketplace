// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {VaultInfo} from "../lib/CoFundingStructs.sol";
import {VaultState} from "../lib/CoFundingEnums.sol";

/**
 * @title CoFundingInterface
 * @author 0xHenry
 * @custom:version 1.0
 * @notice CoFunding is a protocol for multiple users co-buying an NFT on 
 *         specific NFT-Marketplace ( currently Opensea).
 *
 * @dev CoFundingInterface contains all external function interfaces for
 *      CoFunding.
 */
interface CoFundingInterface {
    /**
     * @notice Create an vault to co-funding buying an specific NFT. Can be call by everybody ( usually user to )
     *
     * @param vaultID New vault ID.
     * @param nftCollection Address of the target NFT Collection to buy in this vault.
     * @param nftID ID of target NFT in the collection.
     * @param startFundingTime Start funding time.
     * @param endFundingTime End funding time.
     * @param initialPrice Price of the NFT in the marketplace when created the vault.
     */
    function createVault(
        bytes32 vaultID,
        address nftCollection,
        uint nftID,
        uint startFundingTime,
        uint endFundingTime,
        uint initialPrice
    ) external;

    /**
     * @notice Set expected selling price to the vault. Call by vault participant only.
     *
     * @param vaultID ID of selected vault.
     * @param expectedSellingPrice Expected selling price set individually.
     */
    function setSellingPrice(bytes32 vaultID, uint expectedSellingPrice)
        external;

    /**
     * @notice Deposit money into the wallet (currently only accept eth - native token). 
     *         Call by user want to participate in the vault.
     */
    function depositToSpendingWallet()
        external
        payable;

    /**
     * @notice Withdraw money from smart contract to address (currently only accept eth - native token). 
     *
     * @param amount withdrawal amount.
     */
    function withdrawFromSpendingWallet(uint amount)
        external
        payable;

    /**
     * @notice Money being locked (deposit) into vault. Locked money cannot be withdraw to user address. 
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     */
    function depositToVaultFromSpendingWallet(bytes32 vaultID, uint amount)
        external;

    /**
     * @notice Money being unlocked amount (withdraw) from vault. Unlocked money so user can withdraw to user address.
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     */
    function withdrawFromVaultFromSpendingWallet(bytes32 vaultID, uint amount)
        external;

    /**
     * @notice End of funding phase:
     *      +) If raise enough money, smart contract will buy
     *         NFT from market place, NFT being own by an external address.
     *         Change state of vault to Funded. Refund surplus money to user.
     *      +) Else refund (locked) money from vault to user spending wallet.
     *         Change state of vault to Ended.
     *         
     * @param vaultID ID of selected vault.
     * @param boughtPrice Price of NFT when smart contract buy from marketplace.
     */
    function endFundingPhase(bytes32 vaultID, uint boughtPrice)
        external;

    /**
     * @notice Finish vault is being call by admin when selling NFT being bought by someone on the market.
     *         Reward being divided to user due to % of contribution to the pool. Change state of vault to Ended.
     *
     * @param vaultID ID of selected vault.
     */
    function finishVault(bytes32 vaultID)
        external;

    /**
     * @notice Only being call by admin in emergency case.
     *
     * @param vaultID ID of selected vault.
     * @param vaultState ID of selected vault.
     */
    function changeStateVault(bytes32 vaultID, VaultState vaultState)
        external;

    /**
     * @notice Retrieve specific vault infomation.
     *
     * @param vaultID ID of selected vault.
     *
     * @return vaultInfo The vault struct of vault information.
     */
    function getVault(bytes32 vaultID)
        external
        view 
        returns (VaultInfo memory vaultInfo);

    /**
     * @notice Retrieve specific user contribution of specific vault.
     *
     * @param vaultID ID of selected vault.
     * @param user User address.
     *
     * @return contributionAmount The contribution amount
     */
    function getContributionInVault(bytes32 vaultID, address user)
        external
        view
        returns (uint contributionAmount);
        
    /**
     * @notice Retrieve specific user contribution of specific vault.
     *
     * @param vaultID ID of selected vault.
     *
     * @return totalContributionAmount The contribution amount
     */
    function getVaultTotalContribution(bytes32 vaultID)
        external
        view
        returns (uint totalContributionAmount);

}