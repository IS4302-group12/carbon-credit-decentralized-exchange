import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ProjectToken } from "../typechain-types";

describe("ProjectToken", () => {
    let projectToken: ProjectToken;
    let owner: SignerWithAddress;
    let auditor: SignerWithAddress;
    let projectOwner: SignerWithAddress;
    let otherUser: SignerWithAddress;
    const CCT_AMOUNT = ethers.parseEther("100"); // 100 Carbon Credits (using Ether units for simplicity)
    const PROJECT_ID = 1n;
    const TOKEN_URI = "ipfs://test-uri";
    const PROJECT_NAME = "Test Project";
    const LOCATION = "Test Location";
    const REDUCTION_METHOD = "Renewable Energy";

    beforeEach(async () => {
        [owner, auditor, projectOwner, otherUser] = await ethers.getSigners();

        // Deploy ProjectToken
        const ProjectTokenFactory = await ethers.getContractFactory("ProjectToken");
        projectToken = await ProjectTokenFactory.deploy(auditor.address);
        await projectToken.waitForDeployment();
    });

    describe("Deployment", () => {
        it("should set the correct auditor address", async () => {
            expect(await projectToken.auditor()).to.equal(auditor.address);
        });

        it("should have the correct name and symbol", async () => {
            expect(await projectToken.name()).to.equal("ProjectNFT");
            expect(await projectToken.symbol()).to.equal("PJNFT");
        });

        it("should revert if auditor address is zero", async () => {
            const ProjectTokenFactory = await ethers.getContractFactory("ProjectToken");
            await expect(
                ProjectTokenFactory.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid auditor address");
        });

        it("should initialize _nextTokenId to 1", async () => {
            const block = await ethers.provider.getBlock("latest");
            const currentTimestamp = block!.timestamp;
            const oneYearFromNow = currentTimestamp + 365 * 24 * 60 * 60;

            const tx = await projectToken.connect(auditor).mintProjectNFT(
                TOKEN_URI,
                PROJECT_NAME,
                projectOwner.address,
                CCT_AMOUNT,
                LOCATION,
                currentTimestamp,
                oneYearFromNow,
                REDUCTION_METHOD,
                PROJECT_ID
            );
            const receipt = await tx.wait();
            const event = receipt!.logs
                .map((log) => projectToken.interface.parseLog(log))
                .find((log) => log?.name === "ProjectNFTMinted");
            expect(event?.args.tokenId).to.equal(1n);
        });
    });

    describe("mintProjectNFT", () => {
        it("should allow auditor to mint a project NFT", async () => {
            const block = await ethers.provider.getBlock("latest");
            const currentTimestamp = block!.timestamp;
            const oneYearFromNow = currentTimestamp + 365 * 24 * 60 * 60;

            const tx = await projectToken.connect(auditor).mintProjectNFT(
                TOKEN_URI,
                PROJECT_NAME,
                projectOwner.address,
                CCT_AMOUNT,
                LOCATION,
                currentTimestamp,
                oneYearFromNow,
                REDUCTION_METHOD,
                PROJECT_ID
            );
            const receipt = await tx.wait();
            const event = receipt!.logs
                .map((log) => projectToken.interface.parseLog(log))
                .find((log) => log?.name === "ProjectNFTMinted");
            const tokenId = event?.args.tokenId;

            // Check ownership
            expect(await projectToken.ownerOf(tokenId)).to.equal(projectOwner.address);

            // Check token URI
            expect(await projectToken.tokenURI(tokenId)).to.equal(TOKEN_URI);

            // Check verified status
            expect(await projectToken.verified(tokenId)).to.be.true;

            // Check NFT details
            const details = await projectToken.nftDetails(tokenId);
            expect(details.projectId).to.equal(PROJECT_ID);
            expect(details.projectName).to.equal(PROJECT_NAME);
            expect(details.projectOwner).to.equal(projectOwner.address);
            expect(details.auditor).to.equal(auditor.address);
            expect(details.carbonCredits).to.equal(CCT_AMOUNT);
            expect(details.location).to.equal(LOCATION);
            expect(details.issuanceDate).to.equal(currentTimestamp);
            expect(details.expirationDate).to.equal(oneYearFromNow);
            expect(details.reductionMethod).to.equal(REDUCTION_METHOD);
            expect(details.verificationDate).to.be.closeTo(BigInt(currentTimestamp), 10n); // Allow slight timestamp variance

            // Check event emission
            await expect(tx)
                .to.emit(projectToken, "ProjectNFTMinted")
                .withArgs(projectOwner.address, tokenId, PROJECT_NAME, CCT_AMOUNT);
        });

        it("should revert if called by non-auditor", async () => {
            const block = await ethers.provider.getBlock("latest");
            const currentTimestamp = block!.timestamp;
            const oneYearFromNow = currentTimestamp + 365 * 24 * 60 * 60;

            await expect(
                projectToken.connect(otherUser).mintProjectNFT(
                    TOKEN_URI,
                    PROJECT_NAME,
                    projectOwner.address,
                    CCT_AMOUNT,
                    LOCATION,
                    currentTimestamp,
                    oneYearFromNow,
                    REDUCTION_METHOD,
                    PROJECT_ID
                )
            ).to.be.revertedWith("Only the auditor can perform this action");
        });

        it("should revert if project owner address is zero", async () => {
            const block = await ethers.provider.getBlock("latest");
            const currentTimestamp = block!.timestamp;
            const oneYearFromNow = currentTimestamp + 365 * 24 * 60 * 60;

            await expect(
                projectToken.connect(auditor).mintProjectNFT(
                    TOKEN_URI,
                    PROJECT_NAME,
                    ethers.ZeroAddress,
                    CCT_AMOUNT,
                    LOCATION,
                    currentTimestamp,
                    oneYearFromNow,
                    REDUCTION_METHOD,
                    PROJECT_ID
                )
            ).to.be.revertedWith("Invalid project owner address");
        });

        it("should increment _nextTokenId correctly", async () => {
            const block = await ethers.provider.getBlock("latest");
            const currentTimestamp = block!.timestamp;
            const oneYearFromNow = currentTimestamp + 365 * 24 * 60 * 60;

            const tx1 = await projectToken.connect(auditor).mintProjectNFT(
                TOKEN_URI,
                PROJECT_NAME,
                projectOwner.address,
                CCT_AMOUNT,
                LOCATION,
                currentTimestamp,
                oneYearFromNow,
                REDUCTION_METHOD,
                PROJECT_ID
            );
            const receipt1 = await tx1.wait();
            const event1 = receipt1!.logs
                .map((log) => projectToken.interface.parseLog(log))
                .find((log) => log?.name === "ProjectNFTMinted");
            const tokenId1 = event1?.args.tokenId;

            const tx2 = await projectToken.connect(auditor).mintProjectNFT(
                TOKEN_URI,
                "Test Project 2",
                projectOwner.address,
                CCT_AMOUNT,
                LOCATION,
                currentTimestamp,
                oneYearFromNow,
                REDUCTION_METHOD,
                PROJECT_ID + 1n
            );
            const receipt2 = await tx2.wait();
            const event2 = receipt2!.logs
                .map((log) => projectToken.interface.parseLog(log))
                .find((log) => log?.name === "ProjectNFTMinted");
            const tokenId2 = event2?.args.tokenId;

            expect(tokenId2).to.equal(tokenId1 + 1n);
        });

        it("should mint multiple NFTs to the same project owner", async () => {
            const block = await ethers.provider.getBlock("latest");
            const currentTimestamp = block!.timestamp;
            const oneYearFromNow = currentTimestamp + 365 * 24 * 60 * 60;

            await projectToken.connect(auditor).mintProjectNFT(
                TOKEN_URI,
                PROJECT_NAME,
                projectOwner.address,
                CCT_AMOUNT,
                LOCATION,
                currentTimestamp,
                oneYearFromNow,
                REDUCTION_METHOD,
                PROJECT_ID
            );
            await projectToken.connect(auditor).mintProjectNFT(
                "ipfs://test-uri2",
                "Test Project 2",
                projectOwner.address,
                CCT_AMOUNT,
                LOCATION,
                currentTimestamp,
                oneYearFromNow,
                REDUCTION_METHOD,
                PROJECT_ID + 1n
            );

            expect(await projectToken.balanceOf(projectOwner.address)).to.equal(2n);
        });
    });
});