// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {VaultInfo, UserContribution} from "../lib/CoFundingStructs.sol";
import {VaultState} from "../lib/CoFundingEnums.sol";
import {CoFundingErrorsAndEvents} from "../interfaces/CoFundingErrorsAndEvents.sol";
import {ArrayHelpers} from "../helpers/ArrayHelpers.sol";
import { SeaportInterface } from "../seaport/contracts/interfaces/SeaportInterface.sol";
import { Order, BasicOrderParameters } from "../seaport/contracts/lib/ConsiderationStructs.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract CoFundingInternal is Ownable, CoFundingErrorsAndEvents, ArrayHelpers, ReentrancyGuard  {
    //Track status of each Vault Info
    mapping(bytes32 => VaultInfo) private _vaultInfos;
    //Track status of each User infomation in each Vault
    mapping(bytes32 => mapping(address => UserContribution)) private _userContributions;
    //Track list of user in each vault
    mapping(bytes32 => address[]) _vaultUsers;
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
     * @param defaultExpectedPrice Default expected price to sell NFT applies for user who have not 
     * submit voted expected price.
     */
    function _createVault(
        bytes32 vaultID,
        address nftCollection,
        uint nftID,
        uint startFundingTime,
        uint endFundingTime,
        uint initialPrice,
        uint defaultExpectedPrice
    ) internal {
        VaultInfo storage vaultInfo = _vaultInfos[vaultID];
        // If vaultID already existed
        if(vaultInfo.nftCollection != address(0)){
            revert VaultIDExisted();
        }
        // If funding time is not right
        if((startFundingTime < block.timestamp) || (endFundingTime < startFundingTime)){
            revert ErrorTimeRange();
        }

        //Initiate new vault
        vaultInfo.nftCollection = nftCollection;
        vaultInfo.nftID = nftID;
        vaultInfo.startFundingTime = startFundingTime;
        vaultInfo.endFundingTime = endFundingTime;
        vaultInfo.initialPrice = initialPrice;
        vaultInfo.defaultExpectedPrice = defaultExpectedPrice;
        // Default value: vaultInfo.boughtPrice = 0;
        // Default value: vaultInfo.sellingPrice = 0;
        // Default value: vaultInfo.totalAmount = 0;
        // Default value: vaultInfo.vaultState = VaultState.CREATED;
        emit CreateVault(vaultID,nftCollection,nftID,startFundingTime,endFundingTime,initialPrice);
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

        if(_userContributions[vaultID][msg.sender].contributionAmount == 0){
            revert UserHaveNotParticipatedInVault();
        }

        UserContribution storage usercontribution = _userContributions[vaultID][msg.sender];
        usercontribution.expectedSellingPrice = expectedSellingPrice;
    }

    /**
     * @dev Internal function to deposit money into the wallet (currently only accept eth - native token). 
     *      Call by user want to participate in the vault.
     */
    function _depositDirectlyToSpendingWallet()
        internal 
        nonReentrant {
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
    function _withdrawDirectlyFromSpendingWallet(uint amount)
        internal 
        nonReentrant {
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
        _addUserToVault(vaultID);
    }

    /**
     * @dev Internal function. When user deposit into vault, add 
     *      user into list of user in that vault.
     *
     * @param vaultID ID of selected vault.
     */
    function _addUserToVault(bytes32 vaultID)
        internal {
        if(_userContributions[vaultID][msg.sender].contributionAmount > 0){
            _addAddressToUniqueAddressArray(msg.sender,_vaultUsers[vaultID]);
        }
    }

    /**
     * @dev Internal function. Money being unlocked amount (withdraw) from vault. Unlocked money so user can withdraw to user address.
     *
     * @param vaultID ID of selected vault.
     * @param amount deposit amount.
     */
    function _withdrawFromVaultToSpendingWallet(bytes32 vaultID, uint amount)
        internal IsVaultIDExitedAndInFundingProcess(vaultID){
        //Check if value sent is valid. Valid is >0
        if (amount <= 0){
            revert InvalidMoneyTransfer();
        }

        //Check if enough money in user's vault
        if (amount > _userContributions[vaultID][msg.sender].contributionAmount){
            revert NotEnoughMoneyInUserVault();
        }

        //Check if user already deposit into vault
        if (_userContributions[vaultID][msg.sender].contributionAmount == 0){
            revert UserHaveNotParticipatedInVault();
        }

        //Check if enough money in total vault
        if (amount > _vaultInfos[vaultID].totalAmount){
            revert NotEnoughMoneyInTotalVault(); 
        }

        //Update storage value
        _userSpendingWallets[msg.sender] += amount;
        _userContributions[vaultID][msg.sender].contributionAmount -= amount;
        _vaultInfos[vaultID].totalAmount -= amount;
        _removeUserFromVault(vaultID);
    }

    /**
     * @dev Internal function. Remove user from list of user in specific vault
     *      if they withdraw all the money from vault.
     *
     * @param vaultID ID of selected vault.
     */
    function _removeUserFromVault(bytes32 vaultID)
        internal {
        if(_userContributions[vaultID][msg.sender].contributionAmount == 0){
            _removeAddressFromUniqueAddressArray(msg.sender,_vaultUsers[vaultID]);
        }
    }

    /**
     * @dev Internal function. Money being deposited and locked (deposit) into vault directly.
     *
     * @param vaultID ID of selected vault.
     */
    function _depositDirectlyToVault(bytes32 vaultID)
        internal
        IsVaultIDExitedAndInFundingProcess(vaultID) 
        nonReentrant{
        
        //Check if value sent is valid. Valid is >0
        if (msg.value <= 0){
            revert InvalidMoneyTransfer();
        }
        
        //Update storage value
        _userContributions[vaultID][msg.sender].contributionAmount += msg.value ;
        _vaultInfos[vaultID].totalAmount += msg.value ;
        _addUserToVault(vaultID);
    }


    /**
     * @dev Internal function. Money being withdraw from vault to user address directly.
     *
     * @param vaultID ID of selected vault.
     * @param amount withdraw amount.
     */
    function _withdrawDirectlyFromVault(bytes32 vaultID, uint amount)
        internal
        nonReentrant {
        //Check if value sent is valid. Valid is >0
        if (amount <= 0){
            revert InvalidMoneyTransfer();
        }
        //Check if withdraw value is more than in vault wallet
        if (amount > _userContributions[vaultID][msg.sender].contributionAmount){
            revert NotEnoughMoneyInUserVault();
        }
        //Check if enough money in total vault
        if (amount > _vaultInfos[vaultID].totalAmount){
            revert NotEnoughMoneyInTotalVault(); 
        }

        //Update storage value
        _userContributions[vaultID][msg.sender].contributionAmount -= amount;
        _vaultInfos[vaultID].totalAmount -= amount;
        _removeUserFromVault(vaultID);

        //Actual money tranfer
        payable(msg.sender).transfer(amount);
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
        if(
            vaultInfo.vaultState != VaultState.CREATED ||
            block.timestamp <= vaultInfo.endFundingTime
        ){
            revert VaultNotInFundingProcess();
        }

        //Ver 1.0 only processes to Funded Phase if bought price <= initialPrice
        if(boughtPrice <= vaultInfo.initialPrice){
            vaultInfo.vaultState = VaultState.FUNDED;
            // Call inner function to buy nft from backend.
        } else 
        {
            vaultInfo.vaultState = VaultState.ENDED;
            _refundEndVault(vaultID);
        }
    }
    
    /**
     * @dev Internal function. Call validate function from seaport protocol.
     *      This action is listing an order on-chain. Order must be signed by
     *      owner of this smart contract. ( owner represents the key pair for
     *      the smart contract to signed transaction, received NFT and transfer/approve
     *      NFT)
     *
     * @param orders List of Orders being validated by seaport.
     *
     * @return result Boolean result return.
     */
    function _seaportValidate(Order[] calldata orders)
        internal
        returns (bool result){

        result = SeaportInterface(_marketplace).validate(orders);
    }

    /**
     * @dev Internal function. Call FulfillBasicOrder function from seaport protocol.
     *      This action is buying an NFT. All data must be signed by owner.
     * @param parameters List of param by seaport.
     *
     * @return result Boolean result return.
     */
    function _seaportFulfillBasicOrder(BasicOrderParameters calldata parameters)
        internal
        returns (bool result){

        result = SeaportInterface(_marketplace).fulfillBasicOrder{value: msg.value}(parameters);
    }
    
    /**
     * @dev Internal function to refund money to user's spending
     *      wallet when vault is cancelled.
     *
     * @param vaultID ID of selected vault.
     */
    function _refundEndVault(bytes32 vaultID)
        internal {
        address[] memory vaultUser = _vaultUsers[vaultID];
        //Refund to user's spending wallet all money deposited into vault
        for(uint i = 0; i< vaultUser.length; i++){
            _userSpendingWallets[vaultUser[i]] += _userContributions[vaultID][vaultUser[i]].contributionAmount;
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
            _divideRewardInFinishedVault(vaultID);
        } else {
            revert VaultCannotBeFinish();
        }

    }

    /**
     * @dev Internal function to divide reward money getting back from 
     *      successfully sold the NFT ( according to % contribution ).
     *      Formula: Reward_Money = Surplus_Money + Sold_NFT_Money
     *          +) Surplus_Money:
                    - Money being substracted when totalMoney > boughtPrice.
                    - Surplus_Money = contributionAmount - ((contributionAmount / totalMoney ) * boughtPrice)
     *          +) Sold_NFT_Money:
                    - Money getting back from sold NFT. Divide according 
                      to % of contribution
                    - Sold_NFT_Money = (contributionAmount / totalMoney ) * sellingPrice
     * @param vaultID ID of selected vault.
     */
    function _divideRewardInFinishedVault(bytes32 vaultID)
        internal {
        address[] memory vaultUser = _vaultUsers[vaultID];
        //Refund to user's spending wallet all money deposited into vault
        for(uint i = 0; i< vaultUser.length; i++){
            uint contributionAmount = _userContributions[vaultID][vaultUser[i]].contributionAmount;
            uint totalMoney = _vaultInfos[vaultID].totalAmount;
            uint boughtPrice = _vaultInfos[vaultID].boughtPrice;
            uint sellingPrice = _vaultInfos[vaultID].sellingPrice;
            uint surplusMoney = contributionAmount - ((contributionAmount / totalMoney ) * boughtPrice);
            uint soldNFTMoney = (contributionAmount / totalMoney ) * sellingPrice;
            _userSpendingWallets[vaultUser[i]] += (surplusMoney + soldNFTMoney);
        }
    }

    /**
     * @dev Internal function only being call by admin in emergency case.
     *
     * @param vaultID ID of selected vault.
     * @param vaultState ID of selected vault.
     */
    function _changeStateVault(bytes32 vaultID, VaultState vaultState)
        internal  {
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
     * @return userContributions The contribution info
     */
    function _getContributionInVault(bytes32 vaultID, address user)
        internal
        view
        IsVaultIDExist(vaultID) 
        returns (UserContribution memory userContributions) {

        userContributions = _userContributions[vaultID][user];
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

    /**
     * @dev Internal function. Retrieve specific user contribution of specific vault.
     *
     * @param user User address
     *
     * @return spendingWalletAmount The contribution amount
     */
    function _getUserSpendingWallet(address user)
        internal
        view
        returns (uint spendingWalletAmount){

        spendingWalletAmount = _userSpendingWallets[user];
    }

    /**
     * @dev Internal function. Retrieve list of pariticipant in vault.
     *
     * @param vaultID ID of selected vault.
     *
     * @return userListInVault The contribution amount
     */
    function _getListOfUserInVault(bytes32 vaultID)
        internal
        view
        returns (address[] memory userListInVault){

        userListInVault = _vaultUsers[vaultID];
    }


    /**
     * @dev Internal function to retrieve calculated expected selling price.
     *         +) Vaule_expected_selling_price = (User_voted_expected_total_share + Default_voted_expected_total_share ) / Vault_total_amount
     *         +) User_voted_expected_total_share = (User_voted_expected_price * User_DidVote_contribution_amount ) 
     *         +) Default_voted_expected_total_share = (Vault_default_expected_price + User_DidNotVote_contribution_amount ) 
     * @param vaultID ID of selected vault.
     *
     * @return expectedSellingPrice Return the calculated expected selling price. 
     */
    function _getVaultExpectedSellingPrice(bytes32 vaultID)
        internal
        view
        returns (uint expectedSellingPrice){

        address[] memory vaultUser = _vaultUsers[vaultID];
        //Refund to user's spending wallet all money deposited into vault
        uint userVotedExpectedTotalShare;
        uint userDefaultExpectedTotalShare;
        for(uint i = 0; i< vaultUser.length; i++){
            if(_userContributions[vaultID][vaultUser[i]].expectedSellingPrice != 0){
                userVotedExpectedTotalShare += _userContributions[vaultID][vaultUser[i]].expectedSellingPrice * _userContributions[vaultID][vaultUser[i]].contributionAmount;
            } else {
                userVotedExpectedTotalShare += _vaultInfos[vaultID].defaultExpectedPrice * _userContributions[vaultID][vaultUser[i]].contributionAmount;
            }
        }

        expectedSellingPrice = ( userVotedExpectedTotalShare + userDefaultExpectedTotalShare ) / _vaultInfos[vaultID].totalAmount;
    }

    /**
     * @dev Internal function to check if vault id exists.
     *
     * @param vaultID ID of selected vault.
     *
     */
    modifier IsVaultIDExist(bytes32 vaultID) {
        VaultInfo memory vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }
        _;
    }

    /**
     * @dev Internal function to check if vault id exists and is vault in
     *      funding process.
     *
     * @param vaultID ID of selected vault.
     *
     */
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
    
    modifier IsVaultIDExitedAndNotEndedrDisabled(bytes32 vaultID) {
        VaultInfo memory vaultInfo = _vaultInfos[vaultID];
        if(vaultInfo.nftCollection == address(0)){
            revert VaultNotExist();
        }
        if(vaultInfo.vaultState == VaultState.ENDED || vaultInfo.vaultState == VaultState.DISABLED){
            revert VaultIsEndedOrDisabled();
        }
        _;
    }
}