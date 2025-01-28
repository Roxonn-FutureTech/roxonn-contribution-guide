const CONTRACT_ADDRESS = '0x2b0f01390349128e9aB9d90348d93Ecec46E6079';
const TOKEN_ADDRESS = '0x8AEB0d898cA8Bb38da27d5196890EC36552380f0';

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

            // Initialize contracts with checksummed addresses
            try {
                const checksummedContractAddress = this.web3.utils.toChecksumAddress(CONTRACT_ADDRESS);
                const checksummedTokenAddress = this.web3.utils.toChecksumAddress(TOKEN_ADDRESS);
                
                this.contract = new this.web3.eth.Contract(CONTRACT_ABI, checksummedContractAddress);
                this.tokenContract = new this.web3.eth.Contract(TOKEN_ABI, checksummedTokenAddress);

                // Check if user is contract owner
                const owner = await this.contract.methods.owner().call();
                this.isOwner = owner.toLowerCase() === this.account.toLowerCase();
                console.log('Contract owner:', owner);
                console.log('Current account:', this.account);
                console.log('Is owner:', this.isOwner);
            } catch (error) {
                console.error('Contract initialization error:', error);
                throw new Error('Failed to initialize contracts. Please check contract addresses.');
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

            if (!this.contract || !this.tokenContract) {
                throw new Error('Contracts not initialized. Please refresh the page.');
            }

            // Show loading state
            const modal = document.querySelector('.workflow-modal');
            const loadingStep = modal.querySelector('.loading-step');
            const allSteps = modal.querySelectorAll('.step');
            
            allSteps.forEach(step => step.classList.remove('active'));
            loadingStep.classList.add('active');
            loadingStep.querySelector('p').textContent = 'Please confirm the transaction in your wallet...';

            // Get task complexity from the UI
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            const complexity = taskElement.getAttribute('data-complexity') || 'easy';

            try {
                // Update progress dots for transaction
                const transactionDot = document.querySelector('.step-dot[data-step="5"]');
                transactionDot.classList.add('active');
                document.querySelector('.progress-line').style.setProperty('--progress', '100%');

                // Register contribution
                console.log('Registering contribution...');
                console.log('Account:', this.account);
                console.log('Task ID:', `GH-${taskId.replace('task-', '')}`);
                console.log('Complexity:', complexity);

                // Send transaction
                const tx = await this.contract.methods.registerContribution(
                    this.account,
                    `GH-${taskId.replace('task-', '')}`,
                    complexity
                ).send({ 
                    from: this.account,
                    gas: 200000
                });

                // Update loading message
                loadingStep.querySelector('p').textContent = 'Transaction submitted, waiting for confirmation...';

                // Wait for transaction receipt
                console.log('Waiting for transaction receipt...');
                const receipt = await this.web3.eth.getTransactionReceipt(tx.transactionHash);
                
                if (!receipt) {
                    // Poll for receipt every 2 seconds
                    const pollReceipt = async () => {
                        const receipt = await this.web3.eth.getTransactionReceipt(tx.transactionHash);
                        if (receipt) {
                            console.log('Transaction confirmed:', receipt);
                            handleSuccess(tx, complexity);
                        } else {
                            setTimeout(pollReceipt, 2000);
                        }
                    };
                    setTimeout(pollReceipt, 2000);
                } else {
                    console.log('Transaction confirmed immediately:', receipt);
                    handleSuccess(tx, complexity);
                }

                return tx.transactionHash;
            } catch (error) {
                console.error('Transaction error:', error);
                handleError(error);
                throw error;
            }
        } catch (error) {
            console.error('Error registering contribution:', error);
            handleError(error);
            throw error;
        }

        function handleSuccess(tx, complexity) {
            const successStep = modal.querySelector('.success-step');
            if (successStep) {
                allSteps.forEach(step => step.classList.remove('active'));
                successStep.classList.add('active');
                
                // Update transaction details
                successStep.querySelector('.transaction-hash').textContent = 
                    `Transaction: ${tx.transactionHash.substring(0, 10)}...`;
                
                const rewardAmount = complexity === 'hard' ? '300' : complexity === 'medium' ? '200' : '100';
                successStep.querySelector('.tokens-earned').textContent = 
                    `+${rewardAmount} ROXN tokens will be sent to your wallet`;
                
                // Refresh the page after 5 seconds to show updated state
                setTimeout(() => {
                    window.location.reload();
                }, 5000);
            }
        }

        function handleError(error) {
            const errorStep = modal.querySelector('.error-step');
            if (errorStep) {
                allSteps.forEach(step => step.classList.remove('active'));
                errorStep.classList.add('active');
                
                // Format the error message
                let errorMessage = error.message || 'Failed to register contribution';
                if (errorMessage.includes('onlyOwner')) {
                    errorMessage = 'Only the contract owner can register contributions';
                } else if (errorMessage.includes('user rejected')) {
                    errorMessage = 'Transaction was rejected. Please try again.';
                } else if (errorMessage.includes('transaction not mined')) {
                    errorMessage = 'Transaction is taking longer than expected. Please check the block explorer.';
                }
                errorStep.querySelector('.error-message').textContent = errorMessage;
            }
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
