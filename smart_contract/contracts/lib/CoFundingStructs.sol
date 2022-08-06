// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import {VaultState} from "./CoFundingEnums.sol";

/**
 * @dev An vault infomation contains six components: a start funding time 
 *      ( where vault start to acquire fund ), an end funding time ( where 
 *      vault end funding process to move on to next step ), an initialPrice 
 *      ( price on marketplace when first created the vault), a boughtPrice 
 *      ( price of NFT being bought by CoFunding smart contract after end funding
 *      time),a sellingPrice (price listing on NFTMarket place - price is being 
 *      average weight voted value of every users), a vaultState ( indicates 
 *      state of the current vault ), a total amount ( total amount of money in 
 *      in the current vault)
 */
struct VaultInfo {
    address nftCollection;
    uint nftID;
    uint startFundingTime;
    uint endFundingTime;
    uint initialPrice;
    uint boughtPrice;
    uint sellingPrice;
    uint totalAmount;
    VaultState vaultState; 
}

/**
 * @dev An user contribution contains two components: a contributionAmount( how 
 * much money user put inside a vault ), an expectedSellingPrice ( price of the 
 * NFT user expected to sell. The price will be level off by weighted amount of 
 * vote value)
 */
struct UserContribution {
    uint contributionAmount;
    uint expectedSellingPrice;
}
