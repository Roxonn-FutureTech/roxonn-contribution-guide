// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RoxonnDemo {
    address public owner;
    mapping(address => uint256) public contributions;
    mapping(string => uint256) public taskRewards;
    mapping(string => bool) public completedTasks;

    event ContributionRegistered(address contributor, string taskId, uint256 reward);
    event RewardClaimed(address contributor, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function setTaskReward(string memory taskId, uint256 reward) public onlyOwner {
        taskRewards[taskId] = reward;
    }

    function registerContribution(string memory taskId) public {
        require(!completedTasks[taskId], "Task already completed");
        require(taskRewards[taskId] > 0, "Task not found");
        
        contributions[msg.sender] += taskRewards[taskId];
        completedTasks[taskId] = true;
        
        emit ContributionRegistered(msg.sender, taskId, taskRewards[taskId]);
    }

    function claimReward() public {
        uint256 reward = contributions[msg.sender];
        require(reward > 0, "No rewards to claim");
        
        contributions[msg.sender] = 0;
        payable(msg.sender).transfer(reward);
        
        emit RewardClaimed(msg.sender, reward);
    }

    receive() external payable {}
}
