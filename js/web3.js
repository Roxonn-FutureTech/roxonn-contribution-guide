// Contract configuration
const CONTRACT_ADDRESS = 'xdc2b0f01390349128e9aB9d90348d93Ecec46E6079';
const TOKEN_ADDRESS = 'xdc8AEB0d898cA8Bb38da27d5196890EC36552380f0';

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

    async initialize() {
        try {
            // Check if XDCPay is installed
            if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
                throw new Error('Please install XDCPay wallet');
            }

            // Use XDCPay's provider
            const provider = window.ethereum || window.web3.currentProvider;
            
            // Initialize Web3 with XDC network
            this.web3 = new Web3(provider);
            
            // Request account access first
            try {
                const accounts = await provider.request({ method: 'eth_requestAccounts' });
                this.account = accounts[0];
                console.log('Account connected:', this.account);
            } catch (error) {
                throw new Error('Please connect your XDCPay wallet');
            }

            // Get current network
            const currentNetwork = await this.web3.eth.net.getId();
            console.log('Current network:', currentNetwork);

            // If not on XDC network, try to add it first
            if (currentNetwork.toString() !== this.networkId) {
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
                    console.log('XDC Network added successfully');
                } catch (addError) {
                    console.log('Network may already be added:', addError.message);
                }

                // Now try to switch to XDC network
                try {
                    await provider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: this.chainId }]
                    });
                    console.log('Switched to XDC Network');
                } catch (switchError) {
                    console.error('Failed to switch network:', switchError);
                    if (switchError.code === 4902) {
                        throw new Error('Please add XDC Network to your wallet');
                    } else {
                        throw new Error('Please manually switch to XDC Network in your wallet');
                    }
                }
            }

            // Verify network one more time
            const finalNetwork = await this.web3.eth.net.getId();
            if (finalNetwork.toString() !== this.networkId) {
                throw new Error('Network switch failed. Please manually select XDC Network in your wallet.');
            }

            // Initialize contracts with checksummed addresses
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

            // Check if user is contract owner
            try {
                const owner = await this.contract.methods.owner().call();
                console.log('Contract owner:', owner);
                console.log('Current account:', this.account);
                this.isOwner = owner.toLowerCase() === this.account.toLowerCase();
                console.log('Is owner:', this.isOwner);
            } catch (error) {
                console.error('Error checking owner:', error);
            }

            // Listen for account changes
            if (provider.on) {
                provider.on('accountsChanged', (accounts) => {
                    this.account = accounts[0];
                    window.location.reload();
                });

                // Listen for network changes
                provider.on('chainChanged', (chainId) => {
                    if (chainId !== this.chainId) {
                        alert('Please connect to XDC Network');
                    }
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
                const network = await this.web3.eth.net.getId();
                if (network.toString() !== this.networkId) {
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
