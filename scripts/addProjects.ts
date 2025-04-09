import { ethers } from "hardhat";
import { parse } from "csv-parse/sync";
import { readFileSync, readFileSync as readFile } from "fs";
import { Projects } from "../typechain-types";

interface ProjectData {
  GSID: string;
  "Project Name": string;
  "Project Developer Name": string;
  Status: string;
  "Sustainable Development Goals": string;
  "Project Type": string;
  Country: string;
  Description: string;
  "Estimated Annual Credits": string;
  Methodology: string;
  Size: string;
  "Programme of Activities": string;
  "POA GSID": string;
}

async function main() {
  const [owner, auditor] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
  console.log("Auditor address:", auditor.address);

  // Load deployed contract addresses
  const addresses = JSON.parse(readFile("./deployed_addresses.json", "utf-8"));
  const projectsContract = await ethers.getContractAt("Projects", addresses.Projects) as Projects;
  console.log("Connected to Projects contract at:", projectsContract.target);

  // Read and parse the CSV file
  const csvData = readFileSync("./data/GSF Registry Projects Export 2025-04-09.csv", "utf-8");
  const records: ProjectData[] = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
  });

  const projectIdMap = new Map<string, bigint>();

  // Create projects
  for (const record of records) {
    const name = record["Project Name"];
    const description = `${record["Description"]} (Type: ${record["Project Type"]}, Country: ${record["Country"]})`;
    const savedCO2 = ethers.parseUnits(record["Estimated Annual Credits"] || "0", 0); // Default to 0 if missing

    try {
      const tx = await projectsContract.connect(owner).create(name, description, savedCO2, {
        value: ethers.parseEther("0.01"),
      });
      const receipt = await tx.wait();
      const event = receipt!.logs
        .map((log) => projectsContract.interface.parseLog(log))
        .find((log) => log?.name === "Created");
      const projectId = event?.args[0].id as bigint;

      console.log(`Created project: ${name} with ID ${projectId}`);
      projectIdMap.set(record["GSID"], projectId);
    } catch (error) {
      console.error(`Failed to create project ${name}:`, error);
    }
  }

  // List projects (simulate auditor approval)
  for (const [gsid, projectId] of projectIdMap) {
    const project = await projectsContract.getProject(projectId);
    if (project.state === 0n) { // unlisted
      try {
        const tx = await projectsContract.connect(owner).list(projectId);
        await tx.wait();
        console.log(`Listed project GSID ${gsid} with ID ${projectId}`);
      } catch (error) {
        console.error(`Failed to list project GSID ${gsid}:`, error);
      }
    } else {
      console.log(`Project GSID ${gsid} with ID ${projectId} already listed`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });