import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { CarbonCreditToken, ProjectToken } from "../typechain-types"; // Adjust path based on your Hardhat setup

describe("CarbonCreditToken", () => {
    let cctToken: CarbonCreditToken;
    let projectToken: ProjectToken;
    let owner: SignerWithAddress;
    let auditor: SignerWithAddress;
    let projectOwner: SignerWithAddress;
    let otherUser: SignerWithAddress;
    const CCT_AMOUNT = ethers.parseEther("100"); // 100 CCT
    const PROJECT_ID = 1n;

    beforeEach(async () => {
        [owner, auditor, projectOwner, otherUser] = await ethers.getSigners();

        // Deploy ProjectToken
        const ProjectTokenFactory = await ethers.getContractFactory("ProjectToken");
        projectToken = await ProjectTokenFactory.deploy(auditor.address);
        await projectToken.waitForDeployment();

        // Deploy CarbonCreditToken
        const CarbonCreditTokenFactory = await ethers.getContractFactory("CarbonCreditToken");
        cctToken = await CarbonCreditTokenFactory.deploy(auditor.address, projectToken.target);
        await cctToken.waitForDeployment();

        // Mint a Project NFT to projectOwner for testing
        const block = await ethers.provider.getBlock("latest");
        const currentTimestamp = block!.timestamp;
        const oneYearFromNow = currentTimestamp + 365 * 24 * 60 * 60;

        await projectToken.connect(auditor).mintProjectNFT(
            "ipfs://test-uri",
            "Test Project",
            projectOwner.address,
            CCT_AMOUNT,
            "Test Location",
            currentTimestamp,
            oneYearFromNow,
            "Renewable Energy",
            PROJECT_ID
        );
    });

    describe("Deployment", () => {
        it("should set the correct auditor address", async () => {
            expect(await cctToken.auditor()).to.equal(auditor.address);
        });

        it("should set the correct ProjectToken address", async () => {
            expect(await cctToken.greenNFT()).to.equal(projectToken.target);
        });

        it("should have the correct name and symbol", async () => {
            expect(await cctToken.name()).to.equal("CarbonCredit");
            expect(await cctToken.symbol()).to.equal("CCT");
        });

        it("should revert if auditor address is zero", async () => {
            const CarbonCreditTokenFactory = await ethers.getContractFactory("CarbonCreditToken");
            await expect(
                CarbonCreditTokenFactory.deploy(ethers.ZeroAddress, projectToken.target)
            ).to.be.revertedWith("Invalid auditor address");
        });

        it("should revert if ProjectToken address is zero", async () => {
            const CarbonCreditTokenFactory = await ethers.getContractFactory("CarbonCreditToken");
            await expect(
                CarbonCreditTokenFactory.deploy(auditor.address, ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid NFT contract address");
        });
    });

    describe("issueCarbonCredits", () => {
        it("should allow auditor to issue carbon credits to project owner with NFT", async () => {
            const expiry = (await ethers.provider.getBlock("latest"))!.timestamp + 365 * 24 * 60 * 60;

            await expect(cctToken.connect(auditor).issueCarbonCredits(projectOwner.address, CCT_AMOUNT, expiry))
                .to.emit(cctToken, "CarbonCreditsIssued")
                .withArgs(projectOwner.address, CCT_AMOUNT, expiry);

            const balance = await cctToken.balanceOf(projectOwner.address);
            expect(balance).to.equal(CCT_AMOUNT);

            const creditInfo = await cctToken.creditExpiry(projectOwner.address);
            expect(creditInfo.amount).to.equal(CCT_AMOUNT);
            expect(creditInfo.expiry).to.equal(expiry);
        });

        it("should revert if called by non-auditor", async () => {
            const expiry = (await ethers.provider.getBlock("latest"))!.timestamp + 365 * 24 * 60 * 60;
            await expect(
                cctToken.connect(otherUser).issueCarbonCredits(projectOwner.address, CCT_AMOUNT, expiry)
            ).to.be.revertedWith("Only the auditor can perform this action");
        });

        it("should revert if project owner address is zero", async () => {
            const expiry = (await ethers.provider.getBlock("latest"))!.timestamp + 365 * 24 * 60 * 60;
            await expect(
                cctToken.connect(auditor).issueCarbonCredits(ethers.ZeroAddress, CCT_AMOUNT, expiry)
            ).to.be.revertedWith("Invalid project owner address");
        });

        it("should revert if project owner has no NFT", async () => {
            const expiry = (await ethers.provider.getBlock("latest"))!.timestamp + 365 * 24 * 60 * 60;
            await expect(
                cctToken.connect(auditor).issueCarbonCredits(otherUser.address, CCT_AMOUNT, expiry)
            ).to.be.revertedWith("Project owner must have a verified Green NFT");
        });

        it("should revert if expiry is in the past", async () => {
            const pastExpiry = (await ethers.provider.getBlock("latest"))!.timestamp - 1;
            await expect(
                cctToken.connect(auditor).issueCarbonCredits(projectOwner.address, CCT_AMOUNT, pastExpiry)
            ).to.be.revertedWith("Expiry must be in the future");
        });
    });

    describe("retireCarbonCredits", () => {
        it("should allow holder to retire carbon credits", async () => {
            const expiry = (await ethers.provider.getBlock("latest"))!.timestamp + 365 * 24 * 60 * 60;
            await cctToken.connect(auditor).issueCarbonCredits(projectOwner.address, CCT_AMOUNT, expiry);

            const retireAmount = ethers.parseEther("50");
            await expect(cctToken.connect(projectOwner).retireCarbonCredits(retireAmount))
                .to.emit(cctToken, "CarbonCreditsRetired")
                .withArgs(projectOwner.address, retireAmount);

            const balance = await cctToken.balanceOf(projectOwner.address);
            expect(balance).to.equal(CCT_AMOUNT - retireAmount);
        });

        it("should revert if holder has insufficient balance", async () => {
            const expiry = (await ethers.provider.getBlock("latest"))!.timestamp + 365 * 24 * 60 * 60;
            await cctToken.connect(auditor).issueCarbonCredits(projectOwner.address, CCT_AMOUNT, expiry);

            const excessAmount = CCT_AMOUNT + ethers.parseEther("1");
            await expect(
                cctToken.connect(projectOwner).retireCarbonCredits(excessAmount)
            ).to.be.revertedWithCustomError(cctToken, "ERC20InsufficientBalance")
                .withArgs(projectOwner.address, CCT_AMOUNT, excessAmount);
        });
    });

    describe("setReductionMethod", () => {
        it("should allow auditor to set reduction method", async () => {
            const method = "Renewable Energy";
            await expect(cctToken.connect(auditor).setReductionMethod(projectOwner.address, method))
                .to.emit(cctToken, "ReductionMethodSet")
                .withArgs(projectOwner.address, method);

            const setMethod = await cctToken.reductionMethods(projectOwner.address);
            expect(setMethod).to.equal(method);
        });

        it("should revert if called by non-auditor", async () => {
            const method = "Renewable Energy";
            await expect(
                cctToken.connect(otherUser).setReductionMethod(projectOwner.address, method)
            ).to.be.revertedWith("Only the auditor can perform this action");
        });

        it("should revert if method is empty", async () => {
            await expect(
                cctToken.connect(auditor).setReductionMethod(projectOwner.address, "")
            ).to.be.revertedWith("Reduction method required");
        });
    });
});