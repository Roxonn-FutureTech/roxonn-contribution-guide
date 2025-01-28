const CONTRACT_ADDRESS = '0x123...'; // Replace with your contract address
const CONTRACT_ABI = []; // Replace with your contract ABI

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
            if (typeof window.ethereum === 'undefined') {
                throw new Error('Please install XDCPay wallet');
            }

            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.account = accounts[0];
            
            // Get current network
            this.chainId = await window.ethereum.request({ method: 'eth_chainId' });
            
            // Check if we're on XDC Testnet (Chain ID: 51)
            if (this.chainId !== '51') {
                await this.switchToXDCTestnet();
            }

            // Initialize Web3
            this.web3 = new Web3(window.ethereum);
            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);

            // Update UI
            this.updateUI(true);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Get initial balance
            await this.updateBalance();

            return true;
        } catch (error) {
            console.error('Error initializing Web3:', error);
            showToast(error.message);
            this.updateUI(false);
            return false;
        }
    }

    async switchToXDCTestnet() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x33' }], // Chain ID 51 in hex
            });
        } catch (error) {
            if (error.code === 4902) {
                await window.ethereum.request({
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
        window.ethereum.on('accountsChanged', (accounts) => {
            this.account = accounts[0];
            this.updateUI(true);
            this.updateBalance();
        });

        window.ethereum.on('chainChanged', (chainId) => {
            this.chainId = chainId;
            updateNetworkStatus(chainId);
            this.updateBalance();
        });
    }

    async updateBalance() {
        try {
            const balance = await this.contract.methods.balanceOf(this.account).call();
            document.getElementById('token-balance').textContent = `${this.web3.utils.fromWei(balance)} ROXN`;
        } catch (error) {
            console.error('Error getting balance:', error);
        }
    }

    updateUI(connected) {
        const walletBtn = document.getElementById('wallet-button');
        if (connected) {
            walletBtn.textContent = this.account.substring(0, 6) + '...' + this.account.substring(38);
            walletBtn.classList.add('connected');
            updateNetworkStatus(this.chainId);
            updateWalletStatus(true);
        } else {
            walletBtn.textContent = 'Connect XDCPay';
            walletBtn.classList.remove('connected');
            updateWalletStatus(false);
        }
    }

    async registerContribution(taskId) {
        try {
            // Estimate gas
            const gas = await this.contract.methods.registerContribution(taskId)
                .estimateGas({ from: this.account });

            // Send transaction
            const result = await this.contract.methods.registerContribution(taskId)
                .send({ from: this.account, gas: Math.floor(gas * 1.2) });

            // Add transaction to history
            const reward = taskId === 'task-1' ? 500 : 1000;
            addTransaction(result.transactionHash, reward);
            
            // Update balance
            await this.updateBalance();

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

    showTokenAnimation(taskId) {
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`).closest('.glass-card');
        const rewardElement = taskCard.querySelector('.task-reward');
        
        // Create token element
        const token = document.createElement('div');
        token.className = 'token-animation';
        token.innerHTML = '🪙';
        taskCard.appendChild(token);

        // Get reward amount
        const rewardAmount = rewardElement.textContent.split(' ')[0];
        
        // Create floating text
        const floatingText = document.createElement('div');
        floatingText.className = 'floating-text';
        floatingText.textContent = `+${rewardAmount} ROXN`;
        taskCard.appendChild(floatingText);

        // Cleanup after animation
        setTimeout(() => {
            token.remove();
            floatingText.remove();
        }, 2000);
    }
}

const web3Service = new Web3Service();
