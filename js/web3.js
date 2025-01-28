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
        let provider;
        
        // Check for XDCPay
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isXDCPay) {
            provider = window.ethereum;
        }
        // Check for other Web3 providers
        else if (typeof window.ethereum !== 'undefined') {
            provider = window.ethereum;
        }
        // No provider found
        else {
            throw new Error('Please install XDCPay!');
        }

        return provider;
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

            // Request account access
            const accounts = await provider.request({ 
                method: 'eth_requestAccounts',
                params: []
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found');
            }

            this.web3 = new Web3(provider);
            this.account = accounts[0];
            this.contract = new this.web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

            // Check if we're on the right network (XDC Apothem Testnet)
            const chainId = await this.web3.eth.getChainId();
            if (chainId !== 51) { // XDC Apothem Testnet chainId
                try {
                    await provider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x33' }], // 51 in hex
                    });
                } catch (switchError) {
                    // If the network doesn't exist, add it
                    if (switchError.code === 4902) {
                        await provider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x33',
                                chainName: 'XDC Apothem Testnet',
                                nativeCurrency: {
                                    name: 'XDC',
                                    symbol: 'XDC',
                                    decimals: 18
                                },
                                rpcUrls: ['https://erpc.apothem.network'],
                                blockExplorerUrls: ['https://explorer.apothem.network']
                            }]
                        });
                    } else {
                        throw switchError;
                    }
                }
            }

            // Setup event listeners
            provider.on('accountsChanged', (accounts) => {
                this.account = accounts[0];
                this.updateUI();
                window.location.reload();
            });

            provider.on('chainChanged', () => {
                window.location.reload();
            });

            provider.on('disconnect', () => {
                this.account = null;
                this.updateUI();
                window.location.reload();
            });

            this.updateUI();
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
