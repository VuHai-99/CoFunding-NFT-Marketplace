// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {CoFundingInterface} from "./interfaces/CoFundingInterface.sol";
import {VaultInfo, UserContribution} from "./lib/CoFundingStructs.sol";
import {VaultState} from "./lib/CoFundingEnums.sol";
import {CoFundingInternal} from "./lib/CoFundingInternal.sol";
import { Order, BasicOrderParameters } from "./seaport/contracts/lib/ConsiderationStructs.sol";

/**
 * @title CoFunding
 * @author 0xHenry
 * @custom:version 1.0
 * @notice CoFunding is a protocol for multiple users co-buying an NFT on 
 *         specific NFT-Marketplace ( currently Opensea ).
 */ 

contract CoFunding is CoFundingInterface, CoFundingInternal {

    /**
     * @param marketplace Define marketplace protocol address.
     */
    constructor(address marketplace) CoFundingInternal(marketplace){}

    /**
     * @notice Create an vault to co-funding buying an specific NFT. Can be 
     * call by everybody ( usually user ). 1 NFT can have many vault. Our system
     * will track if NFT still available to buy on the market, if not the vault
     * automatically cancel.
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
    ) external override{

        _createVault(vaultID, nftCollection, nftID, startFundingTime, endFundingTime, initialPrice, defaultExpectedPrice);
    }

    /**
     * @notice Set expected selling price to the vault. Call by vault participant only.
     *
     * @param vaultID ID of selected vault.
     * @param expectedSellingPrice Expected selling price set individually.
     */
    function setSellingPrice(
        bytes32 vaultID, uint expectedSellingPrice
    ) external override{

        _setSellingPrice(vaultID, expectedSellingPrice);
    }


    /**
     * @notice Deposit money into the wallet (currently only accept eth - native token). 
     *         Call by user want to participate in the vault.
     */
    function depositDirectlyToSpendingWallet()
        external
        payable 
        override{

        _depositDirectlyToSpendingWallet();
    }

    /**
     * @notice Withdraw money from smart contract to address (currently only accept eth - native token). 
     *
     * @param amount withdrawal amount.
     */
    function withdrawDirectlyFromSpendingWallet(uint amount)
        external
        payable
        override{

        _withdrawDirectlyFromSpendingWallet(amount);
    }

    /**
     * @notice Money being locked (deposit) into vault. Locked money cannot be withdraw to user address. 
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     */
    function depositToVaultFromSpendingWallet(bytes32 vaultID, uint amount)
        external
        override{

        _depositToVaultFromSpendingWallet(vaultID,amount);
    }

    /**
     * @notice Combination of deposit money from spending wallet to vault and set expected selling price 
     *         at the same time.
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     * @param expectedSellingPrice deposit amount.
     */
    function depositToVaultFromSpendingWalletAndSetSellingPrice(bytes32 vaultID, uint amount, uint expectedSellingPrice)
        external
        override{

        _depositToVaultFromSpendingWallet(vaultID,amount);
        _setSellingPrice(vaultID, expectedSellingPrice);
    }

    /**
     * @notice Combination of deposit money directly to vault and set expected selling price 
     *         at the same time.
     *
     * @param vaultID ID of selected vault.
     * @param expectedSellingPrice deposit amount.
     */
    function depositDirectlyToVaultAndSetSellingPrice(bytes32 vaultID, uint expectedSellingPrice)
        external
        payable
        override{

        _depositDirectlyToVault(vaultID);
        _setSellingPrice(vaultID, expectedSellingPrice);
    }

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
        payable
        override {

        _depositDirectlyToVault(vaultID);
        _depositToVaultFromSpendingWallet(vaultID,amountFromSpendingWallet);
        _setSellingPrice(vaultID, expectedSellingPrice);
    }

    /**
     * @notice Money being deposited and locked (deposit) into vault directly.
     *
     * @param vaultID ID of selected vault.
     */
    function depositDirectlyToVault(bytes32 vaultID)
        external
        payable
        override{
            
        _depositDirectlyToVault(vaultID);
    }

    /**
     * @notice Money being deposited and locked (deposit) into vault 
     *         both directly and from spending wallet.
     *
     * @param vaultID ID of selected vault.
     * @param amountFromSpendingWallet withdraw amount.
     */
    function depositDirectlyAndFromSpendingWalletToVault(bytes32 vaultID, uint amountFromSpendingWallet)
        external
        payable
        override{
        
        _depositDirectlyToVault(vaultID);
        _depositToVaultFromSpendingWallet(vaultID,amountFromSpendingWallet);
    }

    /**
     * @notice Money being withdraw both directly and from spending wallet.
     *
     * @param vaultID ID of selected vault.
     * @param amountFromSpendingWallet withdraw from spending wallet amount.
     * @param amountFromVault withdraw from vault amount.
     */
    function withdrawDirectlyFromSpendingWalletAndVault(bytes32 vaultID, uint amountFromSpendingWallet, uint amountFromVault)
        external
        payable 
        override{
        _withdrawDirectlyFromVault(vaultID, amountFromVault);
        _withdrawDirectlyFromSpendingWallet(amountFromSpendingWallet);
    }

    /**
     * @notice Money being unlocked amount (withdraw) from vault. Unlocked money so user can withdraw to user address.
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     */
    function withdrawFromVaultToSpendingWallet(bytes32 vaultID, uint amount)
        external
        override{

        _withdrawFromVaultToSpendingWallet(vaultID,amount);
    }

    /**
     * @notice Money being withdraw from vault to user address directly.
     *
     * @param vaultID ID of selected vault.
     * @param amount withdraw amount.
     */
    function withdrawDirectlyFromVault(bytes32 vaultID, uint amount)
        external
        payable
        override{
        _withdrawDirectlyFromVault(vaultID, amount);
    }


    /**
     * @notice End of funding phase:
     *      +) If raise enough money, smart contract will buy
     *         NFT from market place, NFT being own by an external address.
     *         Change state of vault to Funded. Refund surplus money to user.
     *      +) Else refund (locked) money from vault to user spending wallet.
     *         Change state of vault to Ended.
     *         
     *         1.0 ver only support basic order from seaport.
     * @param vaultID ID of selected vault.
     * @param boughtPrice Price of NFT when smart contract buy from marketplace.
     */
    function endFundingPhase(
        bytes32 vaultID, 
        uint boughtPrice,
        Order[] calldata orders,
        BasicOrderParameters calldata parameters
    )
        external 
        override
        onlyOwner()
        {

        _endFundingPhase(vaultID,boughtPrice);
        _seaportFulfillBasicOrder(parameters);
        _seaportValidate(orders);
    }

    /**
     * @notice Finish vault is being call by admin when selling NFT being bought by someone on the market.
     *         Reward being divided to user due to % of contribution to the pool. Change state of vault to Ended.
     *
     * @param vaultID ID of selected vault.
     */
    function finishVault(bytes32 vaultID)
        external
        override
        onlyOwner() 
        {

        _finishVault(vaultID);
    }

    /**
     * @notice Only being call by admin in emergency case.
     *
     * @param vaultID ID of selected vault.
     * @param vaultState ID of selected vault.
     */
    function changeStateVault(bytes32 vaultID, VaultState vaultState)
        external
        override 
        onlyOwner()
        {

        _changeStateVault(vaultID,vaultState);
    }

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
        override
        returns (VaultInfo memory vaultInfo) {

        vaultInfo = _getVault(vaultID);
    }

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
        override
        returns (UserContribution memory userContributions) {

        userContributions = _getContributionInVault(vaultID,user);
    }
    
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
        override
        returns (uint totalContributionAmount){

        totalContributionAmount = _getVaultTotalContribution(vaultID);
    }

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
        override
        returns (uint spendingWalletAmount){
        
        spendingWalletAmount = _getUserSpendingWallet(user);
    }

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
        returns (address[] memory userListInVault){

        userListInVault = _getListOfUserInVault(vaultID);
    }

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
        returns (uint expectedSellingPrice){

        expectedSellingPrice = _getVaultExpectedSellingPrice(vaultID);
    }
}
 