// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {VaultInfo, UserContribution} from "../lib/CoFundingStructs.sol";
import {VaultState} from "../lib/CoFundingEnums.sol";
import {CoFundingErrorsAndEvents} from "../interfaces/CoFundingErrorsAndEvents.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract CoFundingInternal is Ownable, CoFundingErrorsAndEvents {
    //Track status of each Vault Info
    mapping(bytes32 => VaultInfo) private _vaultInfos;
    //Track status of each User infomation in each Vault
    mapping(bytes32 => mapping(address => UserContribution)) private _userContributions;
    //Track user spending wallet
    mapping(address => uint) private _userSpendingWallets;
    //Marketplace protocol address ( currently only supporting opensea protocol _ seaport)
    address private _marketplace;

    /**
     * @param marketplace Define marketplace protocol address.
     */
    constructor(address marketplace) {
        _marketplace = marketplace;
    }

    /**
     * @dev Internal function to create an vault to 
     *      co-funding buying an specific NFT.
     *
     * @param vaultID New vault ID.
     * @param nftCollection Address of the target NFT Collection to buy in this vault.
     * @param nftID ID of target NFT in the collection.
     * @param startFundingTime Start funding time.
     * @param endFundingTime End funding time.
     * @param initialPrice Price of the NFT in the marketplace when created the vault.
     */
    function _createVault(
        bytes32 vaultID,
        address nftCollection,
        uint nftID,
        uint startFundingTime,
        uint endFundingTime,
        uint initialPrice
    ) internal {
        VaultInfo storage vaultInfo = _vaultInfos[vaultID];
        // If vaultID already existed
        if(vaultInfo.nftCollection != address(0)){
            revert VaultIDExisted();
        }

        //Initiate new vault
        vaultInfo.nftCollection = nftCollection;
        vaultInfo.nftID = nftID;
        vaultInfo.startFundingTime = startFundingTime;
        vaultInfo.endFundingTime = endFundingTime;
        vaultInfo.initialPrice = initialPrice;
        // Default value: vaultInfo.boughtPrice = 0;
        // Default value: vaultInfo.sellingPrice = 0;
        // Default value: vaultInfo.totalAmount = 0;
        // Default value: vaultInfo.vaultState = VaultState.CREATED;
    }

    /**
     * @dev Internal function to set expected selling 
     *      price to the vault. Call by vault participant only.
     *
     * @param vaultID ID of selected vault.
     * @param expectedSellingPrice Expected selling price set individually.
     */
    function _setSellingPrice(
        bytes32 vaultID, uint expectedSellingPrice
    ) internal IsVaultIDExitedAndInFundingProcess(vaultID){
        UserContribution storage usercontribution = _userContributions[vaultID][msg.sender];
        usercontribution.expectedSellingPrice = expectedSellingPrice;
    }

    /**
     * @dev Internal function to deposit money into the wallet (currently only accept eth - native token). 
     *      Call by user want to participate in the vault.
     */
    function _depositToSpendingWallet()
        internal {
        //Check if value sent is valid. Valid is >0
        if (msg.value <= 0){
            revert InvalidMoneyTransfer();
        }

        _userSpendingWallets[msg.sender] += msg.value;
    }

    /**
     * @dev Internal function to withdraw money from smart contract to address (currently only accept eth - native token). 
     *
     * @param amount withdrawal amount.
     */
    function _withdrawFromSpendingWallet(uint amount)
        internal {
        //Check if value sent is valid. Valid is >0
        if (amount <= 0){
            revert InvalidMoneyTransfer();
        }
        //Check if withdraw value is more than in spending wallet
        if(amount > _userSpendingWallets[msg.sender]){
            revert NotEnoughMoneyInSpendingWallet();
        }
        //Update storage value
        _userSpendingWallets[msg.sender] -= amount;
        //Actual tranfer
        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev Internal function. Money being locked (deposit) 
     *      into vault. Locked money cannot be withdraw to user address. 
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     */
    function _depositToVaultFromSpendingWallet(bytes32 vaultID, uint amount)
        internal IsVaultIDExitedAndInFundingProcess(vaultID){

        //Check if value sent is valid. Valid is >0
        if (amount <= 0){
            revert InvalidMoneyTransfer();
        }

        //Check if enough money in spending wallet
        if (amount > _userSpendingWallets[msg.sender]){
            revert NotEnoughMoneyInSpendingWallet();
        }

        //Update storage value
        _userSpendingWallets[msg.sender] -= amount;
        _userContributions[vaultID][msg.sender].contributionAmount += amount;
        _vaultInfos[vaultID].totalAmount += amount;
    }

    /**
     * @dev Internal function. Money being unlocked amount (withdraw) from vault. Unlocked money so user can withdraw to user address.
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     */
    function _withdrawFromVaultFromSpendingWallet(bytes32 vaultID, uint amount)
        internal IsVaultIDExitedAndInFundingProcess(vaultID){

        //Check if enough money in user's vault
        if (amount > _userContributions[vaultID][msg.sender].contributionAmount){
            revert NotEnoughMoneyInUserVault();
        }

        //Check if enough money in total vault
        if (amount > _vaultInfos[vaultID].totalAmount){
            revert NotEnoughMoneyInTotalVault(); 
        }

        //Update storage value
        _userSpendingWallets[msg.sender] += amount;
        _userContributions[vaultID][msg.sender].contributionAmount -= amount;
        _vaultInfos[vaultID].totalAmount -= amount;
    }

    /**
     * @dev Internal function. End of funding phase:
     *      +) If raise enough money, smart contract will buy
     *         NFT from market place, NFT being own by an external address.
     *         Change state of vault to Funded. Refund surplus money to user.
     *      +) Else refund (locked) money from vault to user spending wallet.
     *         Change state of vault to Ended.
     *         
     * @param vaultID ID of selected vault.
     * @param boughtPrice Price of NFT when smart contract buy from marketplace.
     */
    function _endFundingPhase(bytes32 vaultID, uint boughtPrice)
        internal {
        //Check if vaultID existed
        VaultInfo storage vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }

        //Check if vault is in Funding process
        if(vaultInfo.vaultState != VaultState.CREATED){
            revert VaultNotInFundingProcess();
        }

        if(boughtPrice <= vaultInfo.initialPrice){
            vaultInfo.vaultState = VaultState.FUNDED;
            // Call inner function to buy nft then refund surplus money
        } else {
            // Call inner function to refund surplus money
            vaultInfo.vaultState = VaultState.ENDED;
        }
    }

    /**
     * @dev Internal function to finish vault is being 
     *         call by admin when selling NFT being bought by someone on the market.
     *         Reward being divided to user due to % of contribution to the pool. 
     *         Change state of vault to Ended.
     *
     * @param vaultID ID of selected vault.
     */
    function _finishVault(bytes32 vaultID)
        internal{

        //Check if vaultID existed
        VaultInfo storage vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }

        if(vaultInfo.vaultState == VaultState.FUNDED){
            //Call inner function to divide reward
        } else {
            revert VaultCannotBeFinish();
        }

    }

    /**
     * @dev Internal function only being call by admin in emergency case.
     *
     * @param vaultID ID of selected vault.
     * @param vaultState ID of selected vault.
     */
    function _changeStateVault(bytes32 vaultID, VaultState vaultState)
        internal onlyOwner() {
        //Check if vaultID existed
        VaultInfo storage vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }
        //Update storage value
        vaultInfo.vaultState = vaultState;
    }

    /**
     * @dev Internal function to retrieve specific vault infomation.
     *
     * @param vaultID ID of selected vault.
     *
     * @return vaultInfo The vault struct of vault information.
     */
    function _getVault(bytes32 vaultID)
        internal
        view 
        IsVaultIDExist(vaultID)
        returns (VaultInfo memory vaultInfo) {
        vaultInfo = _vaultInfos[vaultID];
    }

    /**
     * @notice Internal function to retrieve specific user contribution of specific vault.
     *
     * @param vaultID ID of selected vault.
     * @param user User address.
     *
     * @return contributionAmount The contribution amount
     */
    function _getContributionInVault(bytes32 vaultID, address user)
        internal
        view
        IsVaultIDExist(vaultID) 
        returns (uint contributionAmount) {

        contributionAmount = _userContributions[vaultID][user].contributionAmount;
    }

    /**
     * @dev Internal function to retrieve specific user contribution of specific vault.
     *
     * @param vaultID ID of selected vault.
     *
     * @return totalContributionAmount The contribution amount
     */
    function _getVaultTotalContribution(bytes32 vaultID)
        internal
        view
        returns (uint totalContributionAmount){
        //Check if vaultID existed
        VaultInfo memory vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }

        totalContributionAmount = vaultInfo.totalAmount;
    }

    modifier IsVaultIDExist(bytes32 vaultID) {
        VaultInfo memory vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }
        _;
    }

    modifier IsVaultIDExitedAndInFundingProcess(bytes32 vaultID) {
        VaultInfo memory vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }
        if(vaultInfo.vaultState != VaultState.CREATED){
            revert VaultNotInFundingProcess();
        }
        _;
    }
}