import { ethers } from "hardhat"; 
import hre from "hardhat"
import { writeFileSync } from "fs";

async function main() {
  const [owner, auditor] = await ethers.getSigners();
  console.log("Deploying contracts with owner:", owner.address);

  const ProjectsFactory = await ethers.getContractFactory("Projects");
  const projects = await ProjectsFactory.deploy();
  await projects.waitForDeployment();
  console.log("Projects deployed to:", projects.target);
  await hre.ethernal.push({ name: "Projects", address: projects.target as string });

  const ProjectTokenFactory = await ethers.getContractFactory("ProjectToken");
  const projectToken = await ProjectTokenFactory.deploy(auditor.address);
  await projectToken.waitForDeployment();
  console.log("ProjectToken deployed to:", projectToken.target);
  await hre.ethernal.push({ name: "ProjectToken", address: projectToken.target as string });

  const CarbonCreditTokenFactory = await ethers.getContractFactory("CarbonCreditToken");
  const cctToken = await CarbonCreditTokenFactory.deploy(auditor.address, projectToken.target);
  await cctToken.waitForDeployment();
  console.log("CarbonCreditToken deployed to:", cctToken.target);
  await hre.ethernal.push({ name: "CarbonCreditToken", address: cctToken.target as string });

  const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
  const marketplace = await MarketplaceFactory.deploy(cctToken.target);
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed to:", marketplace.target);
  await hre.ethernal.push({ name: "Marketplace", address: marketplace.target as string });

  const LiquidityProviderTokenFactory = await ethers.getContractFactory("LiquidityProviderToken");
  const lpToken = await LiquidityProviderTokenFactory.deploy("Liquidity Provider Token", "LPT", marketplace.target);
  await lpToken.waitForDeployment();
  console.log("LiquidityProviderToken deployed to:", lpToken.target);
  await hre.ethernal.push({ name: "LiquidityProviderToken", address: lpToken.target as string });

  await marketplace.connect(owner).setLpToken(lpToken.target);
  console.log("LiquidityProviderToken set in Marketplace");

  const addresses = {
    Projects: projects.target,
    ProjectToken: projectToken.target,
    CarbonCreditToken: cctToken.target,
    Marketplace: marketplace.target,
    LiquidityProviderToken: lpToken.target,
  };
  writeFileSync("./deployed_addresses.json", JSON.stringify(addresses, null, 2));
  console.log("Contract addresses saved to deployed_addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });