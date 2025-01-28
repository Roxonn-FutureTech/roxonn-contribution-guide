const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with actual contract address
const CONTRACT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "contributor",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "taskId",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "reward",
                "type": "uint256"
            }
        ],
        "name": "ContributionRegistered",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "contributor",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "RewardClaimed",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "claimReward",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "taskId",
                "type": "string"
            }
        ],
        "name": "registerContribution",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

class Web3Service {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
    }

    async init() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                
                this.web3 = new Web3(window.ethereum);
                this.contract = new this.web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
                
                const accounts = await this.web3.eth.getAccounts();
                this.account = accounts[0];
                
                // Listen for account changes
                window.ethereum.on('accountsChanged', (accounts) => {
                    this.account = accounts[0];
                    this.updateUI();
                });

                return true;
            } catch (error) {
                console.error('User denied account access');
                return false;
            }
        } else {
            console.error('Please install XDCPay!');
            return false;
        }
    }

    async registerContribution(taskId) {
        if (!this.account) {
            throw new Error('Please connect your wallet first');
        }

        try {
            const result = await this.contract.methods.registerContribution(taskId)
                .send({ from: this.account });
            return result.transactionHash;
        } catch (error) {
            console.error('Error registering contribution:', error);
            throw error;
        }
    }

    async claimReward() {
        if (!this.account) {
            throw new Error('Please connect your wallet first');
        }

        try {
            const result = await this.contract.methods.claimReward()
                .send({ from: this.account });
            return result.transactionHash;
        } catch (error) {
            console.error('Error claiming reward:', error);
            throw error;
        }
    }

    updateUI() {
        const walletButton = document.getElementById('wallet-button');
        if (walletButton) {
            if (this.account) {
                walletButton.textContent = `Connected: ${this.account.substring(0, 6)}...${this.account.substring(38)}`;
                walletButton.classList.add('connected');
            } else {
                walletButton.textContent = 'Connect Wallet';
                walletButton.classList.remove('connected');
            }
        }
    }
}

const web3Service = new Web3Service();
