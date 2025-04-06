import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const ProjectToken = await ethers.getContractFactory("ProjectToken");
    const projectToken = await ProjectToken.deploy(deployer.address);
    await projectToken.waitForDeployment();
    console.log("ProjectToken deployed to:", projectToken.target);

    const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
    const ccToken = await CarbonCreditToken.deploy(deployer.address, projectToken.target);
    await ccToken.waitForDeployment();
    console.log("CarbonCreditToken deployed to:", ccToken.target);

    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy(ccToken.target);
    await marketplace.waitForDeployment();
    console.log("Marketplace deployed to:", marketplace.target);

    const LiquidityProviderToken = await ethers.getContractFactory("LiquidityProviderToken");
    const lpToken = await LiquidityProviderToken.deploy("Liquidity Provider Token", "LPT", marketplace.target);
    await lpToken.waitForDeployment();
    console.log("LiquidityProviderToken deployed to:", lpToken.target);

    // Set lpToken in Marketplace
    await marketplace.setLpToken(lpToken.target);
    console.log("Set LP token in Marketplace");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });