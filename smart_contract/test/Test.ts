import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CoFundingInterface } from "../typechain-types";
import { coFundingUtilsFixture } from "./utils/fixtures";
import { ethers } from "hardhat";
import { faucet } from "./utils/faucet";
import {
    randomHex,
} from "./utils/encoding";
describe("Test new way of creating test", async function () {

    // let owner: SignerWithAddress;
    const { provider } = ethers;
    const owner = new ethers.Wallet(randomHex(32), provider);
    let coFunding: CoFundingInterface;

    before(async () => {
        await faucet(owner.address, provider);
        ({
            coFunding
        } = await coFundingUtilsFixture(owner));
    });

    it("Test it", async function (){
        console.log(coFunding.address);
    });
});