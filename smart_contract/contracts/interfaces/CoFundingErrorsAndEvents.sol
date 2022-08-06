// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface CoFundingErrorsAndEvents {
    error VaultIDExisted();
    error VaultNotExist();
    error InvalidMoneyTransfer();
    error VaultEndedOrDisabled();
    error NotEnoughMoneyInSpendingWallet();
    error VaultNotInFundingProcess();
    error NotEnoughMoneyInUserVault();
    error NotEnoughMoneyInTotalVault();
}