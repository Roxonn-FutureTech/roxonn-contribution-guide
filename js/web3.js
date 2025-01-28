const CONTRACT_ADDRESS = '0x2b0f01390349128e9aB9d90348d93Ecec46E6079';
const CONTRACT_ABI = [
    {
        "inputs": [
            {
                "name": "taskId",
                "type": "uint256"
            }
        ],
        "name": "registerContribution",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

class Web3Service {
    constructor() {
        this.web3 = null;
        this.contract = null;
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
                    // Modern wallets (MetaMask, newer XDCPay)
                    accounts = await provider.request({ method: 'eth_requestAccounts' });
                } else if (provider.enable) {
                    // Legacy wallets (older XDCPay)
                    accounts = await provider.enable();
                } else {
                    // Fallback for very old wallets
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

            // Initialize contribution contract
            this.contract = new this.web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

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
            walletBtn.textContent = this.account.substring(0, 6) + '...' + this.account.substring(38);
            walletBtn.classList.add('connected');

            // Setup event listeners for both modern and legacy providers
            if (provider.on) {
                provider.on('accountsChanged', (accounts) => {
                    this.account = accounts[0];
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

            return true;
        } catch (error) {
            console.error('Error initializing Web3:', error);
            showToast(error.message || 'Failed to initialize Web3');
            return false;
        }
    }

    async switchToXDCTestnet() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x33' }] // Chain ID 51 in hex
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

            // For demo purposes, we'll simulate the contribution registration
            // since only the contract owner can register contributions
            if (!this.isOwner) {
                // Show a message explaining the demo mode
                showToast('Demo Mode: Simulating contribution registration');
                
                // Wait for 2 seconds to simulate transaction
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Show success message
                const successStep = modal.querySelector('.success-step');
                if (successStep) {
                    allSteps.forEach(step => step.classList.remove('active'));
                    successStep.classList.add('active');
                    successStep.querySelector('p').textContent = 'Demo Mode: Your contribution would be registered here';
                    
                    // Keep success visible for 2 seconds
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                return '0x' + '0'.repeat(64); // Mock transaction hash
            }

            // If user is owner, proceed with actual contract interaction
            const tx = await this.contract.methods.registerContribution(
                this.account,
                `GH-${taskId.replace('task-', '')}`,
                complexity
            ).send({ 
                from: this.account,
                gas: 200000
            });

            // Show success message
            showToast('Contribution registered successfully!');
            
            // Show success step
            const successStep = modal.querySelector('.success-step');
            if (successStep) {
                allSteps.forEach(step => step.classList.remove('active'));
                successStep.classList.add('active');
                
                // Keep modal open for 2 seconds to show success
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            return tx.transactionHash;
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
                    errorMessage = 'Demo Mode: In production, only the contract owner can register contributions';
                }
                errorStep.querySelector('.error-message').textContent = errorMessage;
                
                // Keep error visible for 2 seconds
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            showToast(error.message || 'Failed to register contribution');
            throw error;
        }
    }
}

const web3Service = new Web3Service();
