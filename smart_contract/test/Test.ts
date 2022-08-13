import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CoFundingInterface } from "../typechain-types";
import { coFundingUtilsFixture } from "./utils/fixtures";
import { ethers } from "hardhat";

describe("Test new way of creating test", async function () {

    // let owner: SignerWithAddress;
    const { provider } = ethers;
    const owner = new ethers.Wallet(randomHex(32), provider);
    let coFunding: CoFundingInterface;

    before(async () => {
        [owner] = await ethers.getSigners();
        ({
            coFunding
        } = await coFundingUtilsFixture(owner))
    });
});