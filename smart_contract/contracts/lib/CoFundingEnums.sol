// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

enum VaultState {
    // 0: created and starting funding round
    CREATED,

    // 1: after get enough fund then buy NFT in the market. After that sell NFT to market with average price
    FUNDED,

    // 2: there is someone buy NFT which sold by the vault. The reward being divided due to % contribution of each user
    ENDED,

    // 3: there is problem, forced stop.
    DISABLED
}
