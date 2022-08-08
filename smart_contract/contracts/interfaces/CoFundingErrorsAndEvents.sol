// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface CoFundingErrorsAndEvents {

    event CreateVault(
        bytes32 vaultID,
        address nftCollection,
        uint nftID,
        uint startFundingTime,
        uint endFundingTime,
        uint initialPrice
    );

    error VaultIDExisted();
    error VaultNotExist();
    error InvalidMoneyTransfer();
    error VaultEndedOrDisabled();
    error NotEnoughMoneyInSpendingWallet();
    error VaultNotInFundingProcess();
    error NotEnoughMoneyInUserVault();
    error NotEnoughMoneyInTotalVault();
    error VaultCannotBeFinish();
    error UserHaveNotParticipatedInVault();
    error ErrorTimeRange();
    error VaultIsEndedOrDisabled();
}