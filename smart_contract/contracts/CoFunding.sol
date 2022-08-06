// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {CoFundingInterface} from "./interfaces/CoFundingInterface.sol";
import {VaultInfo, UserContribution} from "./lib/CoFundingStructs.sol";
import {VaultState} from "./lib/CoFundingEnums.sol";
import {CoFundingErrorsAndEvents} from "./interfaces/CoFundingErrorsAndEvents.sol";

/**
 * @title CoFunding
 * @author 0xHenry
 * @custom:version 1.0
 * @notice CoFunding is a protocol for multiple users co-buying an NFT on 
 *         specific NFT-Marketplace ( currently Opensea ).
 */

contract CoFunding is CoFundingInterface, CoFundingErrorsAndEvents {
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
     */
    function createVault(
        bytes32 vaultID,
        address nftCollection,
        uint nftID,
        uint startFundingTime,
        uint endFundingTime,
        uint initialPrice
    ) external {
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
     * @notice Set expected selling price to the vault. Call by vault participant only.
     *
     * @param vaultID ID of selected vault.
     * @param expectedSellingPrice Expected selling price set individually.
     */
    function setSellingPrice(
        bytes32 vaultID, uint expectedSellingPrice
    ) external {
        //Check if vaultID existed
        VaultInfo memory vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }

        //Check if vault is still not Ended or Disable
        if(vaultInfo.vaultState != VaultState.ENDED && vaultInfo.vaultState != VaultState.DISABLE){
            revert VaultEndedOrDisabled();
        }

        UserContribution storage usercontribution = _userContributions[vaultID][msg.sender];
        usercontribution.expectedSellingPrice = expectedSellingPrice;
    }

    /**
     * @notice Deposit money into the wallet (currently only accept eth - native token). 
     *         Call by user want to participate in the vault.
     */
    function depositToSpendingWallet()
        external
        payable {
        //Check if value sent is valid. Valid is >0
        if (msg.value <= 0){
            revert InvalidMoneyTransfer();
        }

        _userSpendingWallets[msg.sender] += msg.value;
    }

    /**
     * @notice Withdraw money from smart contract to address (currently only accept eth - native token). 
     *
     * @param amount withdrawal amount.
     */
    function withdrawFromSpendingWallet(uint amount)
        external
        payable{
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
     * @notice Money being locked (deposit) into vault. Locked money cannot be withdraw to user address. 
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     */
    function depositToVaultFromSpendingWallet(bytes32 vaultID, uint amount)
        external {

        //Check if vaultID existed
        VaultInfo memory vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }

        //Check if vault is in Funding process
        if(vaultInfo.vaultState != VaultState.CREATED){
            revert VaultNotInFundingProcess();
        }

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
     * @notice Money being unlocked amount (withdraw) from vault. Unlocked money so user can withdraw to user address.
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     */
    function withdrawFromVaultFromSpendingWallet(bytes32 vaultID, uint amount)
        external {
        //Check if vaultID existed
        VaultInfo memory vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }

        //Check if vault is in Funding process
        if(vaultInfo.vaultState != VaultState.CREATED){
            revert VaultNotInFundingProcess();
        }

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
     * @notice Only being call by admin in emergency case.
     *
     * @param vaultID ID of selected vault.
     * @param vaultState ID of selected vault.
     */
    function changeStateVault(bytes32 vaultID, VaultState vaultState)
        external {
        //Check if vaultID existed
        VaultInfo storage vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }
        //Update storage value
        vaultInfo.vaultState = vaultState;
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
        returns (VaultInfo memory vaultInfo) {
        //Check if vaultID existed
        vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }
    }

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
        returns (uint contributionAmount){
        //Check if vaultID existed
        VaultInfo memory vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }
        contributionAmount = _userContributions[vaultID][user].contributionAmount;
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
        returns (uint totalContributionAmount){
        //Check if vaultID existed
        VaultInfo memory vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }

        totalContributionAmount = vaultInfo.totalAmount;
    }
}
 