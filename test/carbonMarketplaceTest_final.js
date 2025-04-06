
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Carbon Credit Marketplace End-to-End", function () {
  let Projects, ProjectNFT, CarbonCreditToken, Marketplace, LPToken;
  let projects, projectNFT, cct, marketplace, lpToken;
  let deployer, auditor, projectOwner, buyer;

  beforeEach(async function () {
    [deployer, auditor, projectOwner, buyer] = await ethers.getSigners();

    Projects = await ethers.getContractFactory("Projects");
    projects = await Projects.deploy();

    const ProjectNFTFactory = await ethers.getContractFactory("ProjectToken");
    projectNFT = await ProjectNFTFactory.deploy(auditor.address);

    const CCTFactory = await ethers.getContractFactory("CarbonCreditToken");
    cct = await CCTFactory.deploy(auditor.address, projectNFT.address);

    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    marketplace = await MarketplaceFactory.deploy(cct.address);

    const LPTokenFactory = await ethers.getContractFactory("LiquidityProviderToken");
    lpToken = await LPTokenFactory.deploy("LPToken", "LPT", marketplace.address);

    await marketplace.setLpToken(lpToken.address);

    const tx = await projects.connect(projectOwner).create(
      "Mangrove Restoration", "Restoring mangroves", 1000,
      { value: ethers.utils.parseEther("0.01") }
    );
    const receipt = await tx.wait();
    const projectId = receipt.events[0].args[0].id.toNumber();
    this.projectId = projectId;
  });

  it("Should mint a Project NFT after verification", async function () {
    const tokenURI = "ipfs://project-meta";
    const tokenId = await projectNFT.connect(auditor).mintProjectNFT(
      tokenURI, "Mangrove Restoration", projectOwner.address,
      1000, "Malaysia", Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000) + 31536000, "Afforestation", this.projectId
    );
    expect(await projectNFT.ownerOf(tokenId)).to.equal(projectOwner.address);
  });

  it("Should issue carbon credits to NFT holder", async function () {
    const now = Math.floor(Date.now() / 1000);
    await projectNFT.connect(auditor).mintProjectNFT(
      "ipfs://meta", "Mangroves", projectOwner.address, 1000,
      "Malaysia", now, now + 31536000, "Afforestation", this.projectId
    );

    await cct.connect(auditor).issueCarbonCredits(projectOwner.address, 1000, now + 31536000);
    await cct.connect(auditor).setReductionMethod(projectOwner.address, "Afforestation");

    const balance = await cct.balanceOf(projectOwner.address);
    const method = await cct.reductionMethods(projectOwner.address);

    expect(balance).to.equal(1000);
    expect(method).to.equal("Afforestation");
  });

  it("Should allow user to retire carbon credits", async function () {
    const now = Math.floor(Date.now() / 1000);
    await projectNFT.connect(auditor).mintProjectNFT(
      "ipfs://meta", "Project", projectOwner.address, 500,
      "India", now, now + 3600, "Solar", this.projectId
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
      1000, "Thailand", now, now + 365 * 24 * 3600, "Wetland restoration", this.projectId
    );

    await cct.connect(auditor).issueCarbonCredits(projectOwner.address, 1000, now + 365 * 24 * 3600);

    await marketplace.connect(deployer).addLiquidity({ value: ethers.utils.parseEther("10") });

    await cct.connect(projectOwner).approve(marketplace.address, 500);
    const maticBefore = await ethers.provider.getBalance(projectOwner.address);

    const tx = await marketplace.connect(projectOwner).sellCCT(500);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    const maticAfter = await ethers.provider.getBalance(projectOwner.address);

    const expectedMatic = ethers.utils.parseEther("0.5").sub(
      ethers.utils.parseEther("0.5").mul(50).div(10000)
    );

    expect(maticAfter.sub(maticBefore).add(gasUsed)).to.be.closeTo(expectedMatic, ethers.utils.parseEther("0.01"));
  });
});
