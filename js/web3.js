const CONTRACT_ADDRESS = '0x2b0f01390349128e9aB9d90348d93Ecec46E6079';
const CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "contributor",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "githubIssueId",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "complexity",
                "type": "string"
            }
        ],
        "name": "registerContribution",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const TOKEN_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "contributor",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "complexity",
                "type": "string"
            }
        ],
        "name": "rewardContributor",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const TOKEN_ADDRESS = '0x...'; // Replace with the actual token contract address

class Web3Service {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.tokenContract = null;
        this.account = null;
        this.isOwner = false;
    }

    async init() {
        try {
            // Check if XDCPay is installed
            if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
                throw new Error('Please install XDCPay wallet');
            }

            // Get provider (support both modern and legacy wallets)
            const provider = window.ethereum || window.web3.currentProvider;
            
            // Initialize Web3
            this.web3 = new Web3(provider);

            // Request account access
            try {
                let accounts;
                if (provider.request) {
                    accounts = await provider.request({ method: 'eth_requestAccounts' });
                } else if (provider.enable) {
                    accounts = await provider.enable();
                } else {
                    accounts = await this.web3.eth.getAccounts();
                }
                
                if (!accounts || accounts.length === 0) {
                    throw new Error('No accounts found. Please unlock your wallet.');
                }
                
                this.account = accounts[0];
            } catch (error) {
                console.error('Account access error:', error);
                throw new Error('Please connect your XDCPay wallet');
            }

            // Get network and ensure we're on XDC Testnet
            const chainId = await this.web3.eth.getChainId();
            if (chainId !== 51) {
                await this.switchToXDCTestnet();
            }

            // Initialize contracts
            this.contract = new this.web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
            this.tokenContract = new this.web3.eth.Contract(TOKEN_ABI, TOKEN_ADDRESS);

            // Check if user is contract owner
            try {
                const owner = await this.contract.methods.owner().call();
                this.isOwner = owner.toLowerCase() === this.account.toLowerCase();
            } catch (error) {
                console.warn('Could not check owner status:', error);
                this.isOwner = false;
            }

            // Update wallet button
            const walletBtn = document.getElementById('wallet-button');
            if (walletBtn) {
                walletBtn.textContent = this.account.substring(0, 6) + '...' + this.account.substring(38);
                walletBtn.classList.add('connected');
            }

            // Setup event listeners for both modern and legacy providers
            if (provider.on) {
                provider.on('accountsChanged', (accounts) => {
                    this.account = accounts[0];
                    if (this.account && walletBtn) {
                        walletBtn.textContent = this.account.substring(0, 6) + '...' + this.account.substring(38);
                        walletBtn.classList.add('connected');
                    } else if (walletBtn) {
                        walletBtn.textContent = 'Connect XDCPay';
                        walletBtn.classList.remove('connected');
                    }
                });

                provider.on('chainChanged', () => {
                    window.location.reload();
                });
            }

            return true;
        } catch (error) {
            console.error('Error initializing Web3:', error);
            throw error;
        }
    }

    async registerContribution(taskId) {
        try {
            if (!this.account) {
                throw new Error('Please connect your wallet first');
            }

            // Show loading state
            const modal = document.querySelector('.workflow-modal');
            const loadingStep = modal.querySelector('.loading-step');
            const allSteps = modal.querySelectorAll('.step');
            
            allSteps.forEach(step => step.classList.remove('active'));
            if (loadingStep) {
                loadingStep.classList.add('active');
            }

            // Get task complexity from the UI
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            const complexity = taskElement.getAttribute('data-complexity') || 'easy';

            // Register contribution
            const contributionTx = await this.contract.methods.registerContribution(
                this.account,
                `GH-${taskId.replace('task-', '')}`,
                complexity
            ).send({ 
                from: this.account,
                gas: 200000
            });

            console.log('Contribution registered:', contributionTx);

            // Reward tokens
            const rewardTx = await this.tokenContract.methods.rewardContributor(
                this.account,
                complexity
            ).send({
                from: this.account,
                gas: 200000
            });

            console.log('Tokens rewarded:', rewardTx);

            // Show success message
            const successStep = modal.querySelector('.success-step');
            if (successStep) {
                allSteps.forEach(step => step.classList.remove('active'));
                successStep.classList.add('active');
                successStep.querySelector('p').textContent = 'Contribution registered and tokens rewarded!';
            }

            return contributionTx.transactionHash;
        } catch (error) {
            console.error('Error registering contribution:', error);
            
            // Show error in the modal
            const modal = document.querySelector('.workflow-modal');
            const errorStep = modal.querySelector('.error-step');
            const allSteps = modal.querySelectorAll('.step');
            
            if (errorStep) {
                allSteps.forEach(step => step.classList.remove('active'));
                errorStep.classList.add('active');
                
                // Format the error message
                let errorMessage = error.message || 'Failed to register contribution';
                if (errorMessage.includes('onlyOwner')) {
                    errorMessage = 'Only the contract owner can register contributions';
                }
                errorStep.querySelector('.error-message').textContent = errorMessage;
            }

            throw error;
        }
    }

    async switchToXDCTestnet() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x33' }], // 51 in hex
            });
        } catch (error) {
            if (error.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x33',
                        chainName: 'XDC Testnet',
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
}

const web3Service = new Web3Service();
