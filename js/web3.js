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

    async registerContribution(taskId, complexity = 'easy') {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }

            // Get contract owner and compare with current account
            const owner = await this.contract.methods.owner().call();
            console.log('Contract owner:', owner);
            console.log('Current account:', this.account);
            
            // Convert both addresses to lowercase for comparison
            const normalizedOwner = owner.toLowerCase();
            const normalizedAccount = this.account.toLowerCase();
            console.log('Normalized owner:', normalizedOwner);
            console.log('Normalized account:', normalizedAccount);
            
            if (normalizedOwner !== normalizedAccount) {
                throw new Error('Only the contract owner can register contributions');
            }

            // Use checksummed addresses for contract interaction
            const checksummedAccount = this.web3.utils.toChecksumAddress(this.account);
            const githubIssueId = `GH-${taskId.replace('task-', '')}`;
            
            console.log('Registering contribution...');
            console.log('Account:', checksummedAccount);
            console.log('GitHub Issue ID:', githubIssueId);
            console.log('Complexity:', complexity);
            console.log('Contract Address:', this.contractAddress);

            // Get nonce and gas price
            const nonce = await this.web3.eth.getTransactionCount(this.account);
            const gasPrice = await this.web3.eth.getGasPrice();
            console.log('Nonce:', nonce);
            console.log('Gas Price:', gasPrice);

            // Estimate gas for the new contract method
            const gasEstimate = await this.contract.methods.registerContribution(
                checksummedAccount,
                githubIssueId,
                complexity
            ).estimateGas({ 
                from: checksummedAccount 
            });
            console.log('Gas Estimate:', gasEstimate);

            // Send transaction with the new parameters
            const promiEvent = this.contract.methods.registerContribution(
                checksummedAccount,
                githubIssueId,
                complexity
            ).send({ 
                from: checksummedAccount,
                gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
                gasPrice: gasPrice,
                nonce: nonce
            });

            // Return both the transaction hash and the confirmation promise
            return {
                transactionHash: await new Promise((resolve) => {
                    promiEvent.once('transactionHash', resolve);
                }),
                confirmation: new Promise((resolve, reject) => {
                    promiEvent
                        .once('confirmation', (confirmationNumber, receipt) => {
                            console.log('Transaction confirmed:', receipt);
                            resolve(receipt);
                        })
                        .once('error', (error) => {
                            console.error('Transaction error:', error);
                            reject(error);
                        });
                })
            };
        } catch (error) {
            console.error('Transaction error:', error);
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
