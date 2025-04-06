const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Carbon Credit Marketplace End-to-End", function () {
  let Projects, ProjectNFT, CarbonCreditToken, Marketplace;
  let projects, projectNFT, cct, marketplace;
  let deployer, auditor, projectOwner, buyer;

  beforeEach(async function () {
    [deployer, auditor, projectOwner, buyer] = await ethers.getSigners();

    // Deploy Projects.sol
    Projects = await ethers.getContractFactory("Projects");
    projects = await Projects.deploy();

    // Deploy ProjectNFT.sol
    const ProjectNFTFactory = await ethers.getContractFactory("ProjectToken");
    projectNFT = await ProjectNFTFactory.deploy(auditor.address);

    // Deploy CarbonCreditToken.sol
    const CCTFactory = await ethers.getContractFactory("CarbonCreditToken");
    cct = await CCTFactory.deploy(auditor.address, projectNFT.address);

    // Deploy Marketplace.sol
    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    marketplace = await MarketplaceFactory.deploy(cct.address);

    // Project owner creates a project
    await projects.connect(projectOwner).create(
      "Mangrove Restoration",
      "Restoring mangroves to sequester CO2",
      1000,
      { value: ethers.utils.parseEther("0.01") }
    );
  });

  it("Should mint a Project NFT after verification", async function () {
    const tokenURI = "ipfs://project-meta";
    const tx = await projectNFT.connect(auditor).mintProjectNFT(
      tokenURI,
      "Mangrove Restoration",
      projectOwner.address,
      1000,
      "Malaysia",
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 31536000,
      "Afforestation"
    );
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "ProjectNFTMinted");
    const tokenId = event.args.tokenId;

    expect(await projectNFT.ownerOf(tokenId)).to.equal(projectOwner.address);
  });

  it("Should issue carbon credits to NFT holder", async function () {
    const now = Math.floor(Date.now() / 1000);
    const tokenId = await projectNFT.connect(auditor).mintProjectNFT(
      "ipfs://project-meta", "Mangrove Restoration", projectOwner.address,
      1000, "Malaysia", now, now + 31536000, "Afforestation"
    );

    await cct.connect(auditor).issueCarbonCredits(
      projectOwner.address, 1000, now + 31536000
    );

    const balance = await cct.balanceOf(projectOwner.address);
    expect(balance).to.equal(1000);
  });

  it("Should allow user to retire carbon credits", async function () {
    const now = Math.floor(Date.now() / 1000);
    await projectNFT.connect(auditor).mintProjectNFT(
      "ipfs://meta", "Project", projectOwner.address, 500,
      "India", now, now + 3600, "Solar"
    );
    await cct.connect(auditor).issueCarbonCredits(projectOwner.address, 500, now + 3600);

    await cct.connect(projectOwner).retireCarbonCredits(200);
    const balance = await cct.balanceOf(projectOwner.address);
    expect(balance).to.equal(300);
  });

  it("Should allow token sale and MATIC payout", async function () {
    const now = Math.floor(Date.now() / 1000);
    await projectNFT.connect(auditor).mintProjectNFT(
      "ipfs://meta", "Mangroves", projectOwner.address,
      1000, "Thailand", now, now + 365 * 24 * 3600, "Wetland restoration"
    );

    await cct.connect(auditor).issueCarbonCredits(projectOwner.address, 1000, now + 365 * 24 * 3600);

    // Add liquidity to marketplace
    await marketplace.connect(deployer).addLiquidity({ value: ethers.utils.parseEther("10") });

    // Approve CCT transfer
    await cct.connect(projectOwner).approve(marketplace.address, 500);

    const maticBefore = await ethers.provider.getBalance(projectOwner.address);

    // Sell 500 CCT
    const tx = await marketplace.connect(projectOwner).sellCCT(500);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

    const maticAfter = await ethers.provider.getBalance(projectOwner.address);
    expect(maticAfter.sub(maticBefore).add(gasUsed)).to.equal(ethers.utils.parseEther("0.5"));
  });
});
