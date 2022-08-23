// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface CoFundingErrorsAndEvents {
    /**
     * @dev Emit an event whenever an vault is successfully created.
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
    event CreateVault(
        bytes32 vaultID,
        address nftCollection,
        uint nftID,
        uint startFundingTime,
        uint endFundingTime,
        uint initialPrice,
        uint defaultExpectedPrice
    );

    /**
     * @dev Emit an event whenever an selling price is successfully set
     *      by user.
     *
     * @param vaultID ID of selected vault.
     * @param expectedSellingPrice Expected selling price set individually.
     * @param newVaultExpectedSellingPrice Recalculate the total vault selling price.
     */
    event UserSetSellingPrice(
        bytes32 vaultID, 
        uint expectedSellingPrice,
        uint newVaultExpectedSellingPrice
    );

    /**
     * @dev Revert with an error when an Vault ID is already existed.
     */
    error VaultIDExisted();

    /**
     * @dev Revert with an error when an Vault ID is not exist.
     */
    error VaultNotExist();

    /**
     * @dev Revert with an error when user transfer <= 0 amount of Eth.
     */
    error InvalidMoneyTransfer();

    /**
     * @dev Revert with an error when vault is in Ended or Disabled process.
     */
    error VaultEndedOrDisabled();

    /**
     * @dev Revert with an error when user don't have enough money in spending wallet.
     */
    error NotEnoughMoneyInSpendingWallet();

    /**
     * @dev Revert with an error when vault is not in Funding process.
     */
    error VaultNotInFundingProcess();

    /**
     * @dev Revert with an error when user contribution is not enough.
     */
    error NotEnoughMoneyInUserVault();

    /**
     * @dev Revert with an error when trying to finish vault which not in Funded Process.
     */
    error VaultCannotBeFinish();

    /**
     * @dev Revert with an error when user not participate in vault trying to do smt.
     */
    error UserHaveNotParticipatedInVault();

    /**
     * @dev Revert with an error when starting range & ending range must be legit. 
     */
    error ErrorTimeRange();

}