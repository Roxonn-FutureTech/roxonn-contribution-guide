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
        this.isConnecting = false;
    }

    async detectProvider() {
        // Check for XDCPay
        if (typeof window.web3 !== 'undefined') {
            return window.web3.currentProvider;
        } else if (typeof window.ethereum !== 'undefined') {
            return window.ethereum;
        } else {
            throw new Error('Please install XDCPay!');
        }
    }

    async init() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        try {
            const provider = await this.detectProvider();
            
            // Update UI to show connecting state
            const walletButton = document.getElementById('wallet-button');
            walletButton.textContent = 'Connecting...';
            walletButton.disabled = true;

            // Initialize Web3
            this.web3 = new Web3(provider);

            // Request account access using enable()
            try {
                // Try modern method first
                if (provider.enable) {
                    await provider.enable();
                } else {
                    // Fallback for newer versions
                    await this.web3.eth.requestAccounts();
                }
            } catch (error) {
                throw new Error('Please allow access to your XDCPay wallet');
            }

            // Get accounts
            const accounts = await this.web3.eth.getAccounts();
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found. Please unlock your XDCPay wallet.');
            }

            this.account = accounts[0];
            this.contract = new this.web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

            // Check network
            const networkId = await this.web3.eth.net.getId();
            if (networkId !== 51) { // XDC Apothem Testnet
                showToast('Please switch to XDC Apothem Testnet in XDCPay');
                throw new Error('Please switch to XDC Apothem Testnet');
            }

            // Setup event listeners for account changes
            if (provider.on) {
                provider.on('accountsChanged', (newAccounts) => {
                    this.account = newAccounts[0];
                    this.updateUI();
                });

                provider.on('networkChanged', (networkId) => {
                    if (networkId !== '51') {
                        showToast('Please switch to XDC Apothem Testnet');
                    }
                    window.location.reload();
                });

                provider.on('disconnect', () => {
                    this.account = null;
                    this.updateUI();
                });
            }

            this.updateUI();
            showToast('Successfully connected to XDCPay!');
            return true;

        } catch (error) {
            console.error('Wallet connection error:', error);
            showToast(error.message || 'Failed to connect wallet');
            this.account = null;
            this.updateUI();
            return false;
        } finally {
            this.isConnecting = false;
            const walletButton = document.getElementById('wallet-button');
            walletButton.disabled = false;
        }
    }

    async registerContribution(taskId) {
        if (!this.account) {
            throw new Error('Please connect your wallet first');
        }

        if (!this.web3) {
            throw new Error('Web3 not initialized');
        }

        try {
            const result = await this.contract.methods.registerContribution(taskId)
                .send({ 
                    from: this.account,
                    gasPrice: await this.web3.eth.getGasPrice(),
                    gas: 200000 // Adjust gas limit as needed
                });
            return result.transactionHash;
        } catch (error) {
            console.error('Error registering contribution:', error);
            throw new Error(error.message || 'Failed to register contribution');
        }
    }

    async claimReward() {
        if (!this.account) {
            throw new Error('Please connect your wallet first');
        }

        if (!this.web3) {
            throw new Error('Web3 not initialized');
        }

        try {
            const result = await this.contract.methods.claimReward()
                .send({ 
                    from: this.account,
                    gasPrice: await this.web3.eth.getGasPrice(),
                    gas: 200000 // Adjust gas limit as needed
                });
            return result.transactionHash;
        } catch (error) {
            console.error('Error claiming reward:', error);
            throw new Error(error.message || 'Failed to claim reward');
        }
    }

    updateUI() {
        const walletButton = document.getElementById('wallet-button');
        if (walletButton) {
            if (this.account) {
                const displayAddress = `${this.account.substring(0, 6)}...${this.account.substring(38)}`;
                walletButton.textContent = `Connected: ${displayAddress}`;
                walletButton.classList.add('connected');
                document.querySelectorAll('.btn-primary').forEach(btn => btn.disabled = false);
            } else {
                walletButton.textContent = 'Connect XDCPay';
                walletButton.classList.remove('connected');
                document.querySelectorAll('.btn-primary').forEach(btn => btn.disabled = true);
            }
        }
    }
}

const web3Service = new Web3Service();
