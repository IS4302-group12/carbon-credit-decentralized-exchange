import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy Projects contract
    const Projects = await ethers.getContractFactory("Projects");
    const projects = await Projects.deploy();
    await projects.waitForDeployment();
    console.log("Projects deployed to:", projects.target);

    // Deploy ProjectToken (NFT contract)
    const ProjectToken = await ethers.getContractFactory("ProjectToken");
    const auditor = deployer.address; // Using deployer as auditor for testing
    const projectToken = await ProjectToken.deploy(auditor);
    await projectToken.waitForDeployment();
    console.log("ProjectToken deployed to:", projectToken.target);

    // Deploy CarbonCreditToken (ERC20 contract)
    const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
    const carbonCreditToken = await CarbonCreditToken.deploy(auditor, projectToken.target);
    await carbonCreditToken.waitForDeployment();
    console.log("CarbonCreditToken deployed to:", carbonCreditToken.target);

    // Deploy Marketplace (DEX contract)
    const CarbonCreditMarketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await CarbonCreditMarketplace.deploy(carbonCreditToken.target);
    await marketplace.waitForDeployment();
    console.log("Marketplace deployed to:", marketplace.target);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });