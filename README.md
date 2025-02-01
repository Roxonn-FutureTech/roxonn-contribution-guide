# 🚀 Welcome to Roxonn Contribution Guide

## What is Roxonn?

Roxonn is a Decentralized Software Organization (DSO) where contributors earn ROXN tokens for their valuable contributions to open-source projects.

## 💎 How to Earn ROXN Tokens?

### Contribution Rewards

| Task Type           | Points | ROXN Tokens | Value (₹) |
|---------------------|--------|-------------|-----------|
| Minor Bug Fix       | 10     | 10 ROXN     | ₹30       |
| Major Bug Fix       | 50     | 50 ROXN     | ₹150      |
| Feature Development | 100    | 100 ROXN    | ₹300      |

### Examples of Contributions

#### 1. Minor Bug Fixes (10 ROXN)

- Fixing typos in documentation
- Updating outdated README files
- Correcting small UI issues
- Improving error messages

#### 2. Major Bug Fixes (50 ROXN)

- Fixing functionality issues
- Resolving security vulnerabilities
- Addressing performance problems
- Fixing integration issues

#### 3. Feature Development (100 ROXN)

- Adding new functionality
- Implementing new API endpoints
- Creating new UI components
- Adding test coverage

## 🚀 Getting Started

### 1. Browse Our Projects

- Visit [Roxonn GitHub Organization](https://github.com/Roxonn-FutureTech)
- Each project shows available tasks and ROXN rewards

### 2. Pick a Task

- Look for issues labeled with:
  - minor-bug (10 ROXN)
  - major-bug (50 ROXN)
  - feature (100 ROXN)

### 3. Make Your Contribution

- Fork the repository
- Create a branch
- Make your changes
- Submit a pull request

### 4. Earn ROXN

- Once your PR is merged
- Tokens will be transferred to your wallet
- Track your earnings on [roxonn.com](https://roxonn.com)

## 💡 Tips for Success

- Start with minor bugs to understand the process
- Read the project's contribution guidelines
- Ask questions in issues if needed
- Join our [Discord](https://discord.gg/roxonn) community

## 🌟 Example Workflow

1. Find issue: "Fix documentation typo" (10 ROXN)
2. Fork repository
3. Fix typo
4. Submit PR
5. Get PR merged
6. Receive 10 ROXN tokens

---

## 🛠️ Local Development Setup

To contribute to this project, follow these instructions to set up your local development environment.

### Prerequisites

- [Node.js](https://nodejs.org/) (v14.x or higher)
- [NPM](https://www.npmjs.com/)
- [XDCPay Wallet Extension](https://chrome.google.com/webstore/detail/xdcpay/bocpokimicclpaiekenaeelehdjllofo) for interacting with XDC network
- [XDC Faucet](https://faucet.apothem.network/) to get test XDC tokens

### Clone the Repository

```bash
git clone https://github.com/Roxonn-FutureTech/roxonn-contribution-demo.git
cd roxonn-contribution-demo
```

### Install Dependencies

```bash
npm install
```

### Running the Demo

1. **Set Up XDCPay Wallet**:

    - Install XDCPay extension.
    - Create a new wallet or import an existing one.
    - Switch to the Apothem Testnet.
    - Get test XDC from the [XDC Faucet](https://faucet.apothem.network/).
2. **Run the Demo**:

    - Open `index.html` in your browser.
    - Connect your XDCPay wallet.
    - Interact with the tasks to begin contributing!

📜 Smart Contract Deployment
----------------------------

This section outlines how to deploy the smart contract on the XDC Apothem Testnet.

### Smart Contract Deployment Process

1. **Set up XDC Development Environment**:

    - Install Truffle or [Hardhat](https://hardhat.org/).
    - Make sure you have configured the XDC Apothem Testnet in your development environment.
2. **Deploy Smart Contract**:

    - Deploy the contract using the following command:

    ```bash
     truffle migrate --network apothem
    ```

3. Smart Contract Example:

    ```solidity
    pragma solidity ^0.8.0;

   contract RoxonnDemo {
    mapping(address => uint) public rewards;

    // Register contribution and earn ROXN tokens
    function registerContribution(string memory taskId) public {
        // Logic for verifying task and issuing reward
        rewards[msg.sender] += 10; // Example reward amount
    }

    // Claim accumulated rewards
    function claimReward() public {
        uint reward = rewards[msg.sender];
        require(reward > 0, "No rewards to claim");

        // Logic for transferring tokens
        rewards[msg.sender] = 0;
        payable(msg.sender).transfer(reward);
        }
    }

   ```


4. Test the Contract:

-   Use Truffle/Hardhat to test the smart contract locally before deploying.
-   Example test script:


```js
const RoxonnDemo = artifacts.require("RoxonnDemo");

contract('RoxonnDemo', () => {
    it('should register a contribution and update rewards', async () => {
        let instance = await RoxonnDemo.deployed();
        await instance.registerContribution("task123", { from: accounts[0] });
        let reward = await instance.rewards(accounts[0]);
        assert.equal(reward.toString(), '10', "Reward should be 10 ROXN");
    });
});
```

🔧 Contribution Workflow
------------------------

### How to Contribute

1. **Fork the repository**.
2. **Clone your fork** to your local machine

   ```bash
    git clone https://github.com/YOUR_USERNAME/roxonn-contribution-demo.git
    cd roxonn-contribution-demo
    ```

3. Create a branch:

   ```bash
    git checkout -b your-branch-name
    ```

4. Make changes:

- Add your contribution (bug fixes, feature additions, etc.).
- Ensure you follow the coding style and standards of the project.

5. Commit your changes:

   ```bash
   git add .
   git commit -m "Your commit message"
    ```

6. Push your changes:

   ```bash
   git push origin your-branch-name
    ```

7. Create a pull request:

- Navigate to the repository on GitHub and create a pull request with your changes.

Once your pull request is merged, you will earn ROXN tokens as per the contribution reward structure.

📋 Testing Procedures
---------------------

### How to Test

1. **Unit Tests**:

    - Write unit tests for new functionality.
    - Use frameworks like Mocha or Jest for JavaScript tests.
2. **Smart Contract Tests**:

    - Write tests using Truffle or Hardhat.
    - Ensure contracts are deployed correctly on the Apothem Testnet.
3. **UI Tests**:

    - Perform manual testing of the UI.
    - Ensure that the tasks display correctly, the wallet integration works, and ROXN tokens are awarded.

* * * * *

License
-------

This repository is licensed under the MIT License. Feel free to use it for educational and learning purposes!
