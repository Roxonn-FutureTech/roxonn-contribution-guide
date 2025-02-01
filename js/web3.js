// Contract configuration
const CONTRACT_ADDRESS = 'xdc904E820cf227Cf3B911F632EA5DBB567b2793D80';
const TOKEN_ADDRESS = 'xdc81a8634b9C7401cCD5fA0AD5905eCc432429923E';

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

// Web3Service class for handling blockchain interactions
class Web3Service {
    constructor() {
        // Network configuration
        this.networkId = '51'; // XDC Apothem Testnet
        this.chainId = '0x33'; // 51 in hex
        this.rpcUrl = 'https://erpc.apothem.network';  // XDC Testnet RPC
        this.contractAddress = CONTRACT_ADDRESS;  
        this.tokenAddress = TOKEN_ADDRESS;  
        this.isOwner = false;
        this.web3 = null;
        this.account = null;
        this.contract = null;
        this.tokenContract = null;
    }

    detectXDCPay() {
        const { ethereum } = window;
        if (ethereum && ethereum.isXDCPay) {
            console.log('XDCPay detected');
            return ethereum;
        }
        
        // Check for legacy web3 injection
        if (window.web3 && window.web3.currentProvider) {
            console.log('Legacy web3 provider detected');
            return window.web3.currentProvider;
        }

        throw new Error('Please install XDCPay wallet from https://chrome.google.com/webstore/detail/xdcpay/bocpokimicclpaiekenaeelehdjllofo');
    }

    async initialize() {
        try {
            console.log('Initializing Web3Service...');
            
            // Detect XDCPay
            const provider = this.detectXDCPay();
            console.log('Provider detected:', provider);
            
            // Initialize Web3
            this.web3 = new Web3(provider);
            console.log('Web3 initialized');

            // Request account access
            try {
                console.log('Requesting account access...');
                // Try both methods for better compatibility
                let accounts;
                try {
                    accounts = await provider.request({ 
                        method: 'eth_requestAccounts',
                        params: []
                    });
                } catch (requestError) {
                    console.log('Modern request failed, trying enable():', requestError);
                    accounts = await provider.enable();
                }
                
                if (!accounts || accounts.length === 0) {
                    throw new Error('No accounts found. Please unlock XDCPay and try again.');
                }
                
                this.account = accounts[0];
                console.log('Account connected:', this.account);
            } catch (error) {
                console.error('Account access error:', error);
                if (error.code === -32002) {
                    throw new Error('XDCPay is already processing a connection request. Please open XDCPay and accept the connection.');
                }
                throw new Error('Please unlock XDCPay and try again');
            }

            // Get current chain ID
            const currentChainId = await this.web3.eth.getChainId();
            console.log('Current chain ID:', currentChainId.toString(16));
            
            // Check if we need to switch networks
            if ('0x' + currentChainId.toString(16) !== this.chainId) {
                console.log('Wrong network detected. Attempting to switch...');
                try {
                    await provider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: this.chainId }]
                    });
                    console.log('Successfully switched to XDC network');
                } catch (switchError) {
                    console.error('Switch network error:', switchError);
                    // This error code indicates that the chain has not been added to XDCPay
                    if (switchError.code === 4902 || switchError.code === -32603) {
                        console.log('Network not found. Attempting to add XDC network...');
                        try {
                            await provider.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: this.chainId,
                                    chainName: 'XDC Apothem Testnet',
                                    nativeCurrency: {
                                        name: 'XDC',
                                        symbol: 'XDC',
                                        decimals: 18
                                    },
                                    rpcUrls: [this.rpcUrl],
                                    blockExplorerUrls: ['https://explorer.apothem.network']
                                }]
                            });
                            console.log('XDC network added successfully');
                        } catch (addError) {
                            console.error('Add network error:', addError);
                            throw new Error('Failed to add XDC network. Please add it manually in XDCPay.');
                        }
                    } else {
                        throw new Error('Please switch to XDC Network in XDCPay');
                    }
                }
            }

            // Verify final network state
            const finalChainId = await this.web3.eth.getChainId();
            if ('0x' + finalChainId.toString(16) !== this.chainId) {
                throw new Error('Failed to switch to XDC Network. Please try again.');
            }

            // Initialize contracts
            try {
                console.log('Initializing contracts...');
                const checksummedContractAddress = this.web3.utils.toChecksumAddress(this.contractAddress.replace('xdc', '0x'));
                const checksummedTokenAddress = this.web3.utils.toChecksumAddress(this.tokenAddress.replace('xdc', '0x'));

                this.contract = new this.web3.eth.Contract(
                    CONTRACT_ABI,
                    checksummedContractAddress
                );

                this.tokenContract = new this.web3.eth.Contract(
                    TOKEN_ABI,
                    checksummedTokenAddress
                );
                console.log('Contracts initialized');
            } catch (error) {
                console.error('Contract initialization error:', error);
                throw new Error('Failed to initialize contracts. Please try again.');
            }

            // Setup event listeners
            if (provider.on) {
                provider.on('accountsChanged', (accounts) => {
                    console.log('Account changed:', accounts[0]);
                    this.account = accounts[0];
                    window.location.reload();
                });

                provider.on('chainChanged', (chainId) => {
                    console.log('Network changed:', chainId);
                    if (chainId !== this.chainId) {
                        alert('Please connect to XDC Network');
                    }
                    window.location.reload();
                });

                provider.on('disconnect', () => {
                    console.log('Wallet disconnected');
                    window.location.reload();
                });
            }

            console.log('Web3Service initialization completed successfully');
            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            throw error;
        }
    }

    async registerContribution(taskId) {
        const modal = document.querySelector('.workflow-modal');
        const loadingStep = modal.querySelector('.loading-step');
        const allSteps = modal.querySelectorAll('.step');
        
        try {
            if (!this.account) {
                this.handleError(modal, allSteps, new Error('Please connect your wallet first'));
                return;
            }

            if (!this.contract || !this.tokenContract) {
                this.handleError(modal, allSteps, new Error('Contracts not initialized. Please refresh the page.'));
                return;
            }

            // Show loading state
            allSteps.forEach(step => step.classList.remove('active'));
            loadingStep.classList.add('active');
            loadingStep.querySelector('p').textContent = 'Please confirm the transaction in your wallet...';

            // Get task complexity from the UI
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            const complexity = taskElement.getAttribute('data-complexity') || 'easy';

            try {
                // Verify network again before transaction
                const network = await this.web3.eth.getChainId();
                if ('0x' + network.toString(16) !== this.chainId) {
                    throw new Error('Please connect to XDC Network');
                }

                // Check if user is contract owner
                if (!this.isOwner) {
                    const owner = await this.contract.methods.owner().call();
                    console.log('Contract owner:', owner);
                    console.log('Current account:', this.account);
                    throw new Error('Only the contract owner can register contributions');
                }

                // Update progress dots for transaction
                const transactionDot = document.querySelector('.step-dot[data-step="5"]');
                transactionDot.classList.add('active');
                document.querySelector('.progress-line').style.setProperty('--progress', '100%');

                // Use checksummed addresses for contract interaction
                const checksummedAccount = this.web3.utils.toChecksumAddress(this.account);
                
                console.log('Registering contribution...');
                console.log('Account:', checksummedAccount);
                console.log('Task ID:', `GH-${taskId.replace('task-', '')}`);
                console.log('Complexity:', complexity);
                console.log('Contract Address:', this.contractAddress);

                // Estimate gas first
                const gasEstimate = await this.contract.methods.registerContribution(
                    checksummedAccount,
                    `GH-${taskId.replace('task-', '')}`,
                    complexity
                ).estimateGas({ 
                    from: checksummedAccount
                });

                console.log('Estimated gas:', gasEstimate);

                // Send transaction with estimated gas + buffer
                const tx = await this.contract.methods.registerContribution(
                    checksummedAccount,
                    `GH-${taskId.replace('task-', '')}`,
                    complexity
                ).send({ 
                    from: checksummedAccount,
                    gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer
                });

                // Update loading message
                loadingStep.querySelector('p').textContent = 'Transaction submitted, waiting for confirmation...';

                // Wait for transaction receipt with timeout
                console.log('Waiting for transaction receipt...');
                const receipt = await this.waitForReceipt(tx.transactionHash);
                
                if (receipt.status) {
                    console.log('Transaction confirmed:', receipt);
                    this.handleSuccess(modal, allSteps, tx, complexity);
                } else {
                    throw new Error('Transaction failed. Please check the block explorer.');
                }

                return tx.transactionHash;
            } catch (error) {
                console.error('Transaction error:', error);
                
                // Check for specific error messages in the error or error.message
                const errorMessage = error.message || '';
                
                if (errorMessage.includes('execution reverted')) {
                    const customError = new Error('Transaction failed: The contract rejected the operation. Make sure you are the contract owner.');
                    this.handleError(modal, allSteps, customError);
                } else {
                    this.handleError(modal, allSteps, error);
                }
                
                throw error;
            }
        } catch (error) {
            console.error('Error registering contribution:', error);
            this.handleError(modal, allSteps, error);
            throw error;
        }
    }

    async waitForReceipt(txHash, maxAttempts = 30) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const receipt = await this.web3.eth.getTransactionReceipt(txHash);
            if (receipt) {
                return receipt;
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between attempts
        }
        
        throw new Error('Transaction confirmation timeout. Please check the block explorer.');
    }

    handleSuccess(modal, allSteps, tx, complexity) {
        const successStep = modal.querySelector('.success-step');
        if (successStep) {
            allSteps.forEach(step => step.classList.remove('active'));
            successStep.classList.add('active');
            
            // Update transaction details with XDC explorer link
            const txHash = tx.transactionHash.replace('0x', 'xdc');
            const explorerLink = `https://explorer.apothem.network/tx/${txHash}`;
            
            successStep.querySelector('.transaction-hash').innerHTML = 
                `Transaction: <a href="${explorerLink}" target="_blank" class="text-blue-400 hover:text-blue-300">
                    ${txHash.substring(0, 10)}...
                </a>`;
            
            const rewardAmount = complexity === 'hard' ? '300' : complexity === 'medium' ? '200' : '100';
            successStep.querySelector('.tokens-earned').textContent = 
                `+${rewardAmount} ROXN tokens will be sent to your wallet`;
        }
    }

    handleError(modal, allSteps, error) {
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
            } else if (errorMessage.includes('insufficient funds')) {
                errorMessage = 'Insufficient XDC balance for gas fees';
            } else if (errorMessage.includes('execution reverted')) {
                errorMessage = 'Transaction failed: The contract rejected the operation. Make sure you are the contract owner.';
            }
            errorStep.querySelector('.error-message').textContent = errorMessage;
        }
    }
}

const web3Service = new Web3Service();
