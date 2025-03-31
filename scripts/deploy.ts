const hre = require("hardhat");

async function main() {
  // Deploy the "Projects" contract
  const Project = await hre.ethers.getContractFactory("Projects");
  const project = await Project.deploy();
  await project.waitForDeployment();
  console.log("Project deployed to:", await project.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
