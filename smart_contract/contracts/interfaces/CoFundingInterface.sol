// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {VaultInfo, UserContribution} from "../lib/CoFundingStructs.sol";
import {VaultState} from "../lib/CoFundingEnums.sol";
import { Order, BasicOrderParameters } from "../seaport/contracts/lib/ConsiderationStructs.sol";


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
     * @param defaultExpectedPrice Default expected price to sell NFT applies for user who have not 
     * submit voted expected price.
     */
    function createVault(
        bytes32 vaultID,
        address nftCollection,
        uint nftID,
        uint startFundingTime,
        uint endFundingTime,
        uint initialPrice,
        uint defaultExpectedPrice
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
    function depositDirectlyToSpendingWallet()
        external
        payable;

    /**
     * @notice Withdraw money from smart contract to address (currently only accept eth - native token). 
     *
     * @param amount withdrawal amount.
     */
    function withdrawDirectlyFromSpendingWallet(uint amount)
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
     * @notice Combination of deposit money from spending wallet to vault and set expected selling price 
     *         at the same time.
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     * @param expectedSellingPrice deposit amount.
     */
    function depositToVaultFromSpendingWalletAndSetSellingPrice(bytes32 vaultID, uint amount, uint expectedSellingPrice)
        external;

    /**
     * @notice Combination of deposit money directly and from spending wallet to vault and set expected selling price 
     *         at the same time.
     *
     * @param vaultID ID of selected vault.
     * @param expectedSellingPrice deposit direct amount direct.
     * @param amountFromSpendingWallet deposit amount from spending wallet.
     */
    function depositDirectlyAndFromSpendingWalletToVaultAndSetSellingPrice(bytes32 vaultID, uint amountFromSpendingWallet, uint expectedSellingPrice)
        external
        payable;

    /**
     * @notice Combination of deposit money directly to vault and set expected selling price 
     *         at the same time.
     *
     * @param vaultID ID of selected vault.
     * @param expectedSellingPrice deposit amount.
     */
    function depositDirectlyToVaultAndSetSellingPrice(bytes32 vaultID, uint expectedSellingPrice)
        external
        payable;

    /**
     * @notice Money being deposited and locked (deposit) into vault directly.
     *
     * @param vaultID ID of selected vault.
     */
    function depositDirectlyToVault(bytes32 vaultID)
        external
        payable;

    /**
     * @notice Money being unlocked amount (withdraw) from vault. Unlocked money so user can withdraw to user address.
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     */
    function withdrawFromVaultToSpendingWallet(bytes32 vaultID, uint amount)
        external;

    /**
     * @notice Money being withdraw from vault to user address directly.
     *
     * @param vaultID ID of selected vault.
     * @param amount withdraw amount.
     */
    function withdrawDirectlyFromVault(bytes32 vaultID, uint amount)
        external
        payable;

    /**
     * @notice Money being deposited and locked (deposit) into vault 
     *         both directly and from spending wallet.
     *
     * @param vaultID ID of selected vault.
     * @param amountFromSpendingWallet withdraw amount.
     */
    function depositDirectlyAndFromSpendingWalletToVault(bytes32 vaultID, uint amountFromSpendingWallet)
        external
        payable;

    /**
     * @notice Money being withdraw both directly and from spending wallet.
     *
     * @param vaultID ID of selected vault.
     * @param amountFromSpendingWallet withdraw from spending wallet amount.
     * @param amountFromVault withdraw from vault amount.
     */
    function withdrawDirectlyFromSpendingWalletAndVault(bytes32 vaultID, uint amountFromSpendingWallet, uint amountFromVault)
        external
        payable;

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
    function endFundingPhase(
        bytes32 vaultID, 
        uint boughtPrice,
        Order[] calldata orders,
        BasicOrderParameters calldata parameters
    ) external;


    /**
     * @notice Finish vault is being call by admin when selling NFT being bought by someone on the market.
     *         Reward being divided to user due to % of contribution to the pool. Change state of vault to Ended.
     *
     * @param vaultID ID of selected vault.
     * @param sellingPrice NFT price when selling the NFT.
     */
    function finishVault(bytes32 vaultID, uint sellingPrice)
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
     * @return userContributions The contribution info
     */
    function getContributionInVault(bytes32 vaultID, address user)
        external
        view
        returns (UserContribution memory userContributions);
        
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

    /**
     * @notice Retrieve specific user contribution of specific vault.
     *
     * @param user User address
     *
     * @return spendingWalletAmount The contribution amount
     */
    function getUserSpendingWallet(address user)
        external
        view
        returns (uint spendingWalletAmount);

    /**
     * @notice Retrieve list of pariticipant in vault.
     *
     * @param vaultID ID of selected vault.
     *
     * @return userListInVault The contribution amount
     */
    function getListOfUserInVault(bytes32 vaultID)
        external
        view
        returns (address[] memory userListInVault);

    /**
     * @notice Retrieve calculated expected selling price.
     *        
     * @param vaultID ID of selected vault.
     *
     * @return expectedSellingPrice Return the calculated expected selling price. 
     */
    function getVaultExpectedSellingPrice(bytes32 vaultID)
        external
        view
        returns (uint expectedSellingPrice);
}