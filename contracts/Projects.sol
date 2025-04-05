// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Projects {
    enum projectState { unlisted, listed }
    
    struct project {
        string name;
        string description;
        uint256 savedCO2;
        uint256 id;
        projectState state;
        address owner;
        address prevOwner;
    }

    uint256 public current_id = 1;
    mapping(uint256 => project) public projectsUnlisted;
    mapping(uint256 => project) public projectsListed;

    // Emiters
    event Created(project);
    event Listed(project);
    event Unlisted(project);

    /**
     * @dev Function that adds a new project to the contract
     * @param name of the project
     * @param description of the project
     * @param savedCO2 of the current project
     * @return uin256 id of the project added
     */
    function add(string memory name, string memory description, uint256 savedCO2) payable public returns (uint256) {
        require(msg.value >= 0.01 ether, "At least 0.01 ETH is required to create a project");
        
        // Create a new project object
        project memory newProject = project(
            name,
            description,
            savedCO2,
            current_id,
            projectState.unlisted,
            msg.sender,
            address(0) // null address
        );
        
        emit Created(newProject);
        uint256 added_id = current_id++;
        projectsUnlisted[added_id] = newProject; // Save to state variable

        return added_id;   // Return new dice ID
    }

    /**
     * @dev Function that lists a project
     * @param projectID of the project to be listed
     */
    function list(uint256 projectID) public ownerOnly(projectID) validProjectId(projectID) projectIsUnlisted(projectID) {
        project memory toBeListed = projectsUnlisted[projectID];
        require(msg.sender == toBeListed.owner, "Not the owner, action not permitted");

        emit Listed(toBeListed);
        toBeListed.state = projectState.listed;
        projectsListed[projectID] = toBeListed;

        delete(projectsUnlisted[projectID]);
    }

    /**
     * @dev Function that lists a project
     * @param projectID of the project to be unlisted
     */
    function unlist(uint256 projectID) public ownerOnly(projectID) validProjectId(projectID) projectIsListed(projectID) {
        project memory toBeUnlisted = projectsListed[projectID];

        emit Unlisted(toBeUnlisted);
        toBeUnlisted.state = projectState.unlisted;
        projectsUnlisted[projectID] = toBeUnlisted;

        delete(projectsListed[projectID]);
    }


    function isListed(uint256 projectID) validProjectId(projectID) public view returns (bool) {
        bool existsInUnlisted = projectsUnlisted[projectID].owner != address(0);
        bool existsInListed = projectsListed[projectID].owner != address(0);

        return existsInListed && !existsInUnlisted;
    }

    function isUnListed(uint256 projectID) validProjectId(projectID) public view returns (bool) {
        bool existsInUnlisted = projectsUnlisted[projectID].owner != address(0);
        bool existsInListed = projectsListed[projectID].owner != address(0);

        return !existsInListed && existsInUnlisted;
    }
    
    // function transfer(uint256 projectID, address newOwner) public ownerOnly(projectID) validProjectId(projectID) {
    //     bool projectListed = isListed(projectID);

    // }

    function getProject(uint256 projectID) public view validProjectId(projectID) returns (project memory) {
        bool existsInUnlisted = projectsUnlisted[projectID].owner != address(0);

        if (existsInUnlisted)
            return projectsUnlisted[projectID];
        else
            return projectsListed[projectID];
    }

    function getPreviousOwner(uint256 projectID) validProjectId(projectID) public view returns (address) {
        bool existsInUnlisted = projectsUnlisted[projectID].owner != address(0);

        if (existsInUnlisted)
            return projectsUnlisted[projectID].prevOwner;
        else
            return projectsListed[projectID].prevOwner;
    }

    // Modifier to ensure only the owner can call certain functions
    modifier ownerOnly(uint256 projectID) {
        bool ownerOfUnlisted = projectsUnlisted[projectID].owner == msg.sender;
        bool ownerOfListed = projectsListed[projectID].owner == msg.sender;

        require((ownerOfUnlisted || ownerOfListed), "Caller is not the owner");
        _;
    }
    
    // Modifier to ensure the project ID is valid
    modifier validProjectId(uint256 projectID) {
        require(projectID < current_id || projectID == 0, "Invalid project ID");
        _;
    }

    // Modifier to ensure the project ID is unlisted
    modifier projectIsUnlisted(uint256 projectID) {
        bool existsInUnlisted = projectsUnlisted[projectID].owner != address(0);
        
        require(existsInUnlisted, "Project is not unlisted");
        _;
    }

    // Modifier to ensure the project ID is listed
    modifier projectIsListed(uint256 projectID) {
        bool existsInListed = projectsListed[projectID].owner != address(0);
        
        require(existsInListed, "Project is not unlisted");
        _;
    }
}
