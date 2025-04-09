import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { LiquidityProviderToken } from "../typechain-types"; 

describe("LiquidityProviderToken", () => {
    let lpToken: LiquidityProviderToken;
    let owner: SignerWithAddress;
    let marketplace: SignerWithAddress;
    let user: SignerWithAddress;
    const TOKEN_NAME = "Liquidity Provider Token";
    const TOKEN_SYMBOL = "LPT";
    const MINT_AMOUNT = ethers.parseEther("100"); // 100 LPT
    const BURN_AMOUNT = ethers.parseEther("50"); // 50 LPT

    beforeEach(async () => {
        [owner, marketplace, user] = await ethers.getSigners();

        const LiquidityProviderTokenFactory = await ethers.getContractFactory("LiquidityProviderToken");
        lpToken = await LiquidityProviderTokenFactory.deploy(TOKEN_NAME, TOKEN_SYMBOL, marketplace.address);
        await lpToken.waitForDeployment();
    });

    describe("Deployment", () => {
        it("should set the correct name and symbol", async () => {
            expect(await lpToken.name()).to.equal(TOKEN_NAME);
            expect(await lpToken.symbol()).to.equal(TOKEN_SYMBOL);
        });

        it("should set the correct marketplace address", async () => {
            expect(await lpToken.marketplace()).to.equal(marketplace.address);
        });

        it("should revert if marketplace address is zero", async () => {
            const LiquidityProviderTokenFactory = await ethers.getContractFactory("LiquidityProviderToken");
            await expect(
                LiquidityProviderTokenFactory.deploy(TOKEN_NAME, TOKEN_SYMBOL, ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid Marketplace address");
        });

        it("should have zero initial supply", async () => {
            expect(await lpToken.totalSupply()).to.equal(0n);
        });
    });

    describe("mint", () => {
        it("should allow marketplace to mint tokens", async () => {
            await expect(lpToken.connect(marketplace).mint(user.address, MINT_AMOUNT))
                .to.emit(lpToken, "Transfer")
                .withArgs(ethers.ZeroAddress, user.address, MINT_AMOUNT);

            const balance = await lpToken.balanceOf(user.address);
            expect(balance).to.equal(MINT_AMOUNT);

            const totalSupply = await lpToken.totalSupply();
            expect(totalSupply).to.equal(MINT_AMOUNT);
        });

        it("should revert if called by non-marketplace", async () => {
            await expect(
                lpToken.connect(user).mint(user.address, MINT_AMOUNT)
            ).to.be.revertedWith("Only Marketplace can call this");
        });

        it("should revert if minting to zero address", async () => {
            await expect(
                lpToken.connect(marketplace).mint(ethers.ZeroAddress, MINT_AMOUNT)
            ).to.be.revertedWithCustomError(lpToken, "ERC20InvalidReceiver")
                .withArgs(ethers.ZeroAddress);
        });

        it("should mint multiple times to the same address", async () => {
            await lpToken.connect(marketplace).mint(user.address, MINT_AMOUNT);
            await lpToken.connect(marketplace).mint(user.address, MINT_AMOUNT);

            const balance = await lpToken.balanceOf(user.address);
            expect(balance).to.equal(MINT_AMOUNT + MINT_AMOUNT);

            const totalSupply = await lpToken.totalSupply();
            expect(totalSupply).to.equal(MINT_AMOUNT + MINT_AMOUNT);
        });
    });

    describe("burnFrom", () => {
        it("should allow marketplace to burn tokens", async () => {
            await lpToken.connect(marketplace).mint(user.address, MINT_AMOUNT);

            await expect(lpToken.connect(marketplace).burnFrom(user.address, BURN_AMOUNT))
                .to.emit(lpToken, "Transfer")
                .withArgs(user.address, ethers.ZeroAddress, BURN_AMOUNT);

            const balance = await lpToken.balanceOf(user.address);
            expect(balance).to.equal(MINT_AMOUNT - BURN_AMOUNT);

            const totalSupply = await lpToken.totalSupply();
            expect(totalSupply).to.equal(MINT_AMOUNT - BURN_AMOUNT);
        });

        it("should revert if called by non-marketplace", async () => {
            await lpToken.connect(marketplace).mint(user.address, MINT_AMOUNT);

            await expect(
                lpToken.connect(user).burnFrom(user.address, BURN_AMOUNT)
            ).to.be.revertedWith("Only Marketplace can call this");
        });

        it("should revert if burning from zero address", async () => {
            await expect(
                lpToken.connect(marketplace).burnFrom(ethers.ZeroAddress, BURN_AMOUNT)
            ).to.be.revertedWithCustomError(lpToken, "ERC20InvalidSender")
                .withArgs(ethers.ZeroAddress);
        });

        it("should revert if burning more than balance", async () => {
            await lpToken.connect(marketplace).mint(user.address, MINT_AMOUNT);

            const excessAmount = MINT_AMOUNT + ethers.parseEther("1");
            await expect(
                lpToken.connect(marketplace).burnFrom(user.address, excessAmount)
            ).to.be.revertedWithCustomError(lpToken, "ERC20InsufficientBalance")
                .withArgs(user.address, MINT_AMOUNT, excessAmount);
        });
    });
});