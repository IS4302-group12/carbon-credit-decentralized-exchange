import { ethers } from "hardhat";
import { readFileSync } from "fs";
import { Projects, ProjectToken, CarbonCreditToken, LiquidityProviderToken, Marketplace } from "../typechain-types";

// Utility function for random delays (in milliseconds)
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const [owner, auditor, provider, buyer1, buyer2, seller1] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
  console.log("Auditor address:", auditor.address);
  console.log("Provider address:", provider.address);
  console.log("Buyer1 address:", buyer1.address);
  console.log("Buyer2 address:", buyer2.address);
  console.log("Seller1 address:", seller1.address);

  // Load deployed contract addresses
  const addresses = JSON.parse(readFileSync("./deployed_addresses.json", "utf-8"));

  // Connect to deployed contracts
  const projectsContract = await ethers.getContractAt("Projects", addresses.Projects) as Projects;
  const projectToken = await ethers.getContractAt("ProjectToken", addresses.ProjectToken) as ProjectToken;
  const cctToken = await ethers.getContractAt("CarbonCreditToken", addresses.CarbonCreditToken) as CarbonCreditToken;
  const marketplace = await ethers.getContractAt("Marketplace", addresses.Marketplace) as Marketplace;
  const lpToken = await ethers.getContractAt("LiquidityProviderToken", addresses.LiquidityProviderToken) as LiquidityProviderToken;

  console.log("Connected to Marketplace at:", marketplace.target);

  // Constants for simulation
  const MATIC_AMOUNT = ethers.parseEther("100"); // 100 MATIC for liquidity
  const CCT_SELL_AMOUNT = ethers.parseEther("20"); // 20 CCT per sell
  const CCT_BUY_AMOUNT = ethers.parseEther("10"); // 10 CCT per buy

  // Step 1: Provider adds liquidity to the Marketplace
  console.log("Provider adding liquidity...");
  const txLiquidity = await marketplace.connect(provider).addLiquidity({ value: MATIC_AMOUNT });
  await txLiquidity.wait();
  const lpBalance = await lpToken.balanceOf(provider.address);
  console.log(`Provider added ${ethers.formatEther(MATIC_AMOUNT)} MATIC, received ${ethers.formatEther(lpBalance)} LPT`);
  await sleep(Math.floor(Math.random() * 3000) + 1000); // Random wait 1-4 seconds

  // Step 2: Transfer CCT from owner to Seller1
  const ownerCCTBalance = await cctToken.balanceOf(owner.address);
  console.log(`Owner CCT balance: ${ethers.formatEther(ownerCCTBalance)}`);
  if (ownerCCTBalance < CCT_SELL_AMOUNT * 2n) {
    console.log("Owner has insufficient CCT to transfer to Seller1, exiting...");
    return;
  }

  console.log(`Transferring ${ethers.formatEther(CCT_SELL_AMOUNT * 2n)} CCT from owner to Seller1...`);
  const txTransfer = await cctToken.connect(owner).transfer(seller1.address, CCT_SELL_AMOUNT * 2n); // Enough for 2 sells
  await txTransfer.wait();
  console.log(`Transferred CCT to Seller1, new balance: ${ethers.formatEther(await cctToken.balanceOf(seller1.address))}`);
  await sleep(Math.floor(Math.random() * 2000) + 500); // Random wait 0.5-2.5 seconds

  // Step 3: Simulate seller activity for listed projects
  const currentId = await projectsContract.current_id();
  console.log("Simulating seller activity for listed projects...");
  let sellCount = 0;

  for (let id = 1n; id < currentId; id++) {
    if (!(await projectsContract.isListed(id))) continue;

    const project = await projectsContract.getProject(id);
    const projectOwner = project.owner;

    // Use Seller1 for simulation
    if (projectOwner === owner.address && sellCount < 2) { // Limit to 2 sells for this example
      console.log(`Project ID ${id} owned by owner, assigning to Seller1 for simulation`);

      // Approve Marketplace to spend Seller1's CCT
      console.log(`Seller1 approving ${ethers.formatEther(CCT_SELL_AMOUNT)} CCT for Marketplace...`);
      const txApprove = await cctToken.connect(seller1).approve(marketplace.target, CCT_SELL_AMOUNT);
      await txApprove.wait();
      await sleep(Math.floor(Math.random() * 2000) + 500); // Random wait 0.5-2.5 seconds

      // Seller1 sells CCT
      console.log(`Seller1 selling ${ethers.formatEther(CCT_SELL_AMOUNT)} CCT...`);
      const txSell = await marketplace.connect(seller1).sellCCT(CCT_SELL_AMOUNT);
      await txSell.wait();
      console.log(`Seller1 sold ${ethers.formatEther(CCT_SELL_AMOUNT)} CCT, received MATIC`);
      await sleep(Math.floor(Math.random() * 3000) + 1000); // Random wait 1-4 seconds

      sellCount++;
    }
  }

  // Step 4: Simulate buyer activity
  console.log("Simulating buyer activity...");
  const cctAvailable = await cctToken.balanceOf(marketplace.target);
  console.log(`CCT available in Marketplace: ${ethers.formatEther(cctAvailable)}`);

  if (cctAvailable >= CCT_BUY_AMOUNT) {
    // Buyer1 buys CCT
    console.log(`Buyer1 buying ${ethers.formatEther(CCT_BUY_AMOUNT)} CCT...`);
    const txBuy1 = await marketplace.connect(buyer1).buyCCT(CCT_BUY_AMOUNT, { value: CCT_BUY_AMOUNT });
    await txBuy1.wait();
    const buyer1Balance = await cctToken.balanceOf(buyer1.address);
    console.log(`Buyer1 bought ${ethers.formatEther(CCT_BUY_AMOUNT)} CCT, new balance: ${ethers.formatEther(buyer1Balance)}`);
    await sleep(Math.floor(Math.random() * 2500) + 1000); // Random wait 1-3.5 seconds

    // Buyer2 buys CCT (if enough remains)
    const remainingCCT = await cctToken.balanceOf(marketplace.target);
    if (remainingCCT >= CCT_BUY_AMOUNT) {
      console.log(`Buyer2 buying ${ethers.formatEther(CCT_BUY_AMOUNT)} CCT...`);
      const txBuy2 = await marketplace.connect(buyer2).buyCCT(CCT_BUY_AMOUNT, { value: CCT_BUY_AMOUNT });
      await txBuy2.wait();
      const buyer2Balance = await cctToken.balanceOf(buyer2.address);
      console.log(`Buyer2 bought ${ethers.formatEther(CCT_BUY_AMOUNT)} CCT, new balance: ${ethers.formatEther(buyer2Balance)}`);
      await sleep(Math.floor(Math.random() * 2000) + 500); // Random wait 0.5-2.5 seconds
    } else {
      console.log("Not enough CCT for Buyer2 to purchase");
    }
  } else {
    console.log("Not enough CCT in Marketplace for buyers");
  }

  // Final state
  const totalLiquidity = await marketplace.totalLiquidity();
  const totalFees = await marketplace.totalFees();
  console.log(`Simulation complete. Marketplace state:`);
  console.log(`Total Liquidity: ${ethers.formatEther(totalLiquidity)} MATIC`);
  console.log(`Total Fees: ${ethers.formatEther(totalFees)} MATIC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });