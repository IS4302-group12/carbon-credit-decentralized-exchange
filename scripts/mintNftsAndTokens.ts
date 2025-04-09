import { ethers } from "hardhat";
import { readFileSync } from "fs";
import { Projects, ProjectToken, CarbonCreditToken } from "../typechain-types";

async function main() {
  const [owner, auditor] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
  console.log("Auditor address:", auditor.address);

  // Load deployed contract addresses
  const addresses = JSON.parse(readFileSync("./deployed_addresses.json", "utf-8"));

  // Connect to deployed contracts
  const projectsContract = await ethers.getContractAt("Projects", addresses.Projects) as Projects;
  const projectToken = await ethers.getContractAt("ProjectToken", addresses.ProjectToken) as ProjectToken;
  const cctToken = await ethers.getContractAt("CarbonCreditToken", addresses.CarbonCreditToken) as CarbonCreditToken;

  console.log("Connected to Projects at:", projectsContract.target);
  console.log("Connected to ProjectToken at:", projectToken.target);
  console.log("Connected to CarbonCreditToken at:", cctToken.target);

  const currentId = await projectsContract.current_id();
  console.log("Total projects created (listed or unlisted):", currentId.toString());

  for (let id = 1n; id < currentId; id++) {
    try {
      const isListed = await projectsContract.isListed(id);
      if (!isListed) {
        console.log(`Project ID ${id} is not listed, skipping...`);
        continue;
      }

      const project = await projectsContract.getProject(id);
      const projectOwner = project.owner;
      const projectName = project.name;
      const description = project.description;
      const savedCO2Raw = project.savedCO2;
      const savedCO2 = ethers.parseEther(savedCO2Raw.toString()); // Convert to 18 decimals

      console.log(`Processing listed project ID ${id}: ${projectName}`);
      console.log(`Raw savedCO2 from Projects: ${savedCO2Raw}`);
      console.log(`Parsed savedCO2 for CCT (in ether): ${ethers.formatEther(savedCO2)}`);

      // Mint NFT
      const block = await ethers.provider.getBlock("latest");
      const currentTimestamp = block!.timestamp;
      const oneYearFromNow = currentTimestamp + 365 * 24 * 60 * 60;

      const txMint = await projectToken.connect(auditor).mintProjectNFT(
        `ipfs://test-uri/${id}`,
        projectName,
        projectOwner,
        savedCO2, // Use parsed value
        "Unknown Location",
        currentTimestamp,
        oneYearFromNow,
        "Unknown Method",
        id
      );
      const receiptMint = await txMint.wait();
      const eventMint = receiptMint!.logs
        .map((log) => projectToken.interface.parseLog(log))
        .find((log) => log?.name === "ProjectNFTMinted");
      const tokenId = eventMint?.args.tokenId as bigint;

      console.log(`Minted NFT for project ${projectName} with token ID ${tokenId} to ${projectOwner}`);

      // Issue Carbon Credits
      const txIssue = await cctToken.connect(auditor).issueCarbonCredits(projectOwner, savedCO2, oneYearFromNow);
      await txIssue.wait();
      console.log(`Issued ${ethers.formatEther(savedCO2)} CCT to ${projectOwner} for project ID ${id}`);

      // Verify
      const nftOwner = await projectToken.ownerOf(tokenId);
      const cctBalance = await cctToken.balanceOf(projectOwner);
      console.log(`NFT ${tokenId} owned by: ${nftOwner}`);
      console.log(`CCT balance of ${projectOwner}: ${ethers.formatEther(cctBalance)}`);
    } catch (error) {
      console.error(`Error processing project ID ${id}:`, error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });