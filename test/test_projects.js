const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Test the Projects functionality", function () {
  let Projects;
  let projects;
  let owner, player1, player2, others;

  // deploy fresh instances before each test case
  before(async () => {
    [owner, player1, player2, ...others] = await ethers.getSigners();
    // deploy Project
    Projects = await ethers.getContractFactory("Projects");
    projects = await Projects.deploy();
    await projects.waitForDeployment();
  });

  // Test 1 Verify deploy
  it("Should deploy Projects succesfully", async function () {
    expect(await projects.getAddress()).to.be.properAddress;
  });

  // Test 2 Create project
  it("Should create a new project successfully", async function () {
    // Player 1 add project
    const name = "Project 1";
    const description = "Project to save more trees";
    const savedCO2 = 2;
    const req1 = await projects
      .connect(player1)
      .create(name, description, savedCO2, { value: ethers.parseEther("0.1") });
    await req1.wait();

    let [
      returnedName,
      returnedDescr,
      returnedCO2,
      returnedID,
      returnedProjectState,
      returnedOwner,
      _,
    ] = await projects.getProject(1);

    returnedProjectState = Number(returnedProjectState);

    expect(returnedName).to.equal(name);
    expect(returnedDescr).to.equal(description);
    expect(returnedCO2).to.equal(savedCO2);
    expect(returnedID).to.equal(1);
    expect(returnedProjectState).to.equal(0);
    expect(returnedOwner).to.equal(player1);
  });

  // Test 3 List project
  it("Should list a project successfully", async function () {
    const req1 = await projects.connect(player1).list(1);
    await req1.wait();

    let [
      returnedName,
      returnedDescr,
      returnedCO2,
      returnedID,
      returnedProjectState,
      returnedOwner,
      _,
    ] = await projects.getProject(1);
    let isListed = await projects.isListed(1);
    let isUnlisted = await projects.isUnListed(1);

    // check that is both listed, and not present in unlisted
    expect(isUnlisted).to.not.equal(true);
    returnedProjectState = Number(returnedProjectState);

    const name = "Project 1";
    const description = "Project to save more trees";
    const savedCO2 = 2;

    expect(returnedName).to.equal(name);
    expect(returnedDescr).to.equal(description);
    expect(returnedCO2).to.equal(savedCO2);
    expect(returnedID).to.equal(1);
    expect(returnedProjectState).to.equal(1); // 1 means listed
    expect(returnedOwner).to.equal(player1);
  });

  // Test 4 Unlist a project
  it("Should unlist a project successfully", async function () {
    const req1 = await projects.connect(player1).unlist(1);
    await req1.wait();

    let [
      returnedName,
      returnedDescr,
      returnedCO2,
      returnedID,
      returnedProjectState,
      returnedOwner,
      _,
    ] = await projects.getProject(1);
    let isListed = await projects.isListed(1);
    let isUnlisted = await projects.isUnListed(1);

    // check that is both listed, and not present in unlisted
    expect(isListed).to.not.equal(true);
    expect(isUnlisted).to.equal(true);
    // returnedProjectState = Number(returnedProjectState);

    const name = "Project 1";
    const description = "Project to save more trees";
    const savedCO2 = 2;

    expect(returnedName).to.equal(name);
    expect(returnedDescr).to.equal(description);
    expect(returnedCO2).to.equal(savedCO2);
    expect(returnedID).to.equal(1);
    expect(returnedProjectState).to.equal(0); // 0 means unlisted
    expect(returnedOwner).to.equal(player1);
  });
});
