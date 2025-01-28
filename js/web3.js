const CONTRACT_ADDRESS = '0xf29193B652Ea2B4b63B7e31A1b4C5Db41cD9e747'; // ROXN token contract on XDC Testnet
const CONTRACT_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [{"name": "_taskId", "type": "uint256"}],
        "name": "registerContribution",
        "outputs": [{"name": "success", "type": "bool"}],
        "type": "function"
    }
];

class Web3Service {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.chainId = null;
        this.contractAddress = CONTRACT_ADDRESS;
        this.contractABI = CONTRACT_ABI;
    }

    async init() {
        try {
            // Check if XDCPay is installed
            if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
                throw new Error('Please install XDCPay wallet');
            }

            // Get the provider
            const provider = window.ethereum || window.web3.currentProvider;
            
            // Initialize Web3
            this.web3 = new Web3(provider);

            // Request account access using eth_requestAccounts or enable
            try {
                if (provider.request) {
                    const accounts = await provider.request({ method: 'eth_requestAccounts' });
                    this.account = accounts[0];
                } else {
                    const accounts = await provider.enable();
                    this.account = accounts[0];
                }
            } catch (error) {
                throw new Error('Please connect your XDCPay wallet');
            }

            // Get current network
            try {
                this.chainId = await this.web3.eth.net.getId();
            } catch (error) {
                console.error('Error getting chainId:', error);
                this.chainId = null;
            }

            // Check if we're on XDC Testnet (Chain ID: 51)
            if (this.chainId !== 51) {
                await this.switchToXDCTestnet();
            }

            // Initialize contract
            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);

            // Update UI
            const walletBtn = document.getElementById('wallet-button');
            if (this.account) {
                walletBtn.textContent = this.account.substring(0, 6) + '...' + this.account.substring(38);
                walletBtn.classList.add('connected');
            }

            // Setup event listeners
            this.setupEventListeners();

            return true;
        } catch (error) {
            console.error('Error initializing Web3:', error);
            showToast(error.message || 'Failed to initialize Web3');
            return false;
        }
    }

    async switchToXDCTestnet() {
        try {
            const provider = window.ethereum || window.web3.currentProvider;
            
            if (provider.request) {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x33' }], // Chain ID 51 in hex
                });
            } else {
                throw new Error('Please switch to XDC Testnet manually');
            }
        } catch (error) {
            if (error.code === 4902) {
                const provider = window.ethereum || window.web3.currentProvider;
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
                        rpcUrls: ['https://rpc.apothem.network'],
                        blockExplorerUrls: ['https://explorer.apothem.network']
                    }]
                });
            } else {
                throw error;
            }
        }
    }

    setupEventListeners() {
        const provider = window.ethereum || window.web3.currentProvider;
        
        if (provider.on) {
            provider.on('accountsChanged', (accounts) => {
                this.account = accounts[0];
                const walletBtn = document.getElementById('wallet-button');
                if (this.account) {
                    walletBtn.textContent = this.account.substring(0, 6) + '...' + this.account.substring(38);
                    walletBtn.classList.add('connected');
                } else {
                    walletBtn.textContent = 'Connect XDCPay';
                    walletBtn.classList.remove('connected');
                }
            });

            provider.on('chainChanged', () => {
                window.location.reload();
            });
        }
    }

    async registerContribution(taskId) {
        try {
            if (!this.web3 || !this.contract) {
                throw new Error('Please connect your wallet first');
            }

            if (!this.account) {
                throw new Error('Please connect your wallet first');
            }

            const chainId = await this.web3.eth.net.getId();
            if (chainId !== 51) {
                throw new Error('Please switch to XDC Testnet');
            }

            const tx = await this.contract.methods.registerContribution(taskId)
                .send({ 
                    from: this.account,
                    gas: 200000 // Set a reasonable gas limit
                });

            return tx.transactionHash;
        } catch (error) {
            console.error('Error registering contribution:', error);
            throw error;
        }
    }
}

const web3Service = new Web3Service();
