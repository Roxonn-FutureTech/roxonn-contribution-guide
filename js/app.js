// App Module
const App = (function() {
    // Private variables
    let web3Service = null;

    // Initialize everything when the page loads
    function init() {
        try {
            // Create web3 service instance
            web3Service = new Web3Service();
            console.log('Web3Service initialized');
            
            // Update UI initially
            updateWalletUI();

            // Setup modal events
            setupModalEvents();
        } catch (error) {
            console.error('Failed to initialize Web3Service:', error);
            handleWalletError(error);
        }
    }

    // Error handling function
    function handleWalletError(error) {
        const errorMessage = error.message || 'Failed to connect wallet';
        alert(errorMessage);
        console.error('Wallet error:', error);
    }

    // Update wallet UI
    function updateWalletUI() {
        const walletBtn = document.querySelector('.connect-wallet-btn');
        const networkStatus = document.getElementById('network-status');
        
        if (web3Service && web3Service.account) {
            const shortAddress = `${web3Service.account.slice(0, 6)}...${web3Service.account.slice(-4)}`;
            walletBtn.textContent = shortAddress;
            walletBtn.classList.add('connected');
            networkStatus.innerHTML = 'Network: <span class="text-green-400">XDC Network</span>';
        } else {
            walletBtn.textContent = 'Connect Wallet';
            walletBtn.classList.remove('connected');
            networkStatus.innerHTML = 'Network: <span class="text-yellow-400">Please connect wallet</span>';
        }
    }

    // Connect wallet function
    async function connectWallet() {
        try {
            if (!web3Service) {
                throw new Error('Web3 service not initialized');
            }
            await web3Service.initialize();
            updateWalletUI();
        } catch (error) {
            handleWalletError(error);
        }
    }

    // Show workflow modal with task info
    function showWorkflow(button) {
        const taskCard = button.closest('.task-card');
        const taskId = taskCard.dataset.taskId;
        const complexity = taskCard.dataset.complexity;
        
        // Update task info in modal
        const modal = document.querySelector('.workflow-modal');
        const taskDescription = taskCard.querySelector('p').textContent;
        modal.querySelector('.task-description').textContent = taskDescription;
        modal.querySelector('.complexity-badge').textContent = complexity.charAt(0).toUpperCase() + complexity.slice(1);
        
        // Update reward amount
        const rewardAmount = getRewardAmount(complexity);
        const rewardElements = modal.querySelectorAll('.current-reward');
        rewardElements.forEach(el => el.textContent = `${rewardAmount} ROXN`);
        
        // Update task number in code examples
        const taskNumber = taskId.replace('task-', '');
        modal.querySelectorAll('.task-number').forEach(el => el.textContent = taskNumber);
        
        // Reset progress
        document.querySelector('.progress-line').style.setProperty('--progress', '0%');
        
        // Show first step
        const steps = modal.querySelectorAll('.step');
        steps.forEach(step => step.classList.remove('active'));
        modal.querySelector('.initial-step').classList.add('active');
        
        // Show modal
        modal.classList.remove('hidden');
    }

    // Get reward amount based on complexity
    function getRewardAmount(complexity) {
        switch (complexity.toLowerCase()) {
            case 'easy':
                return 100;
            case 'medium':
                return 200;
            case 'hard':
                return 300;
            default:
                return 100;
        }
    }

    // Setup modal events
    function setupModalEvents() {
        // Close modal when clicking outside
        const modal = document.querySelector('.workflow-modal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Next step in workflow
    function nextStep() {
        const modal = document.querySelector('.workflow-modal');
        const currentStep = modal.querySelector('.step.active');
        const steps = ['initial-step', 'clone-step', 'code-step', 'submit-step', 'reward-step'];
        
        // Find current step index
        const currentIndex = steps.findIndex(step => currentStep.classList.contains(step));
        if (currentIndex < steps.length - 1) {
            // Update progress dots
            const dots = document.querySelectorAll('.step-dot');
            dots[currentIndex + 1].classList.add('active');
            
            // Update progress line
            const progress = ((currentIndex + 2) / steps.length) * 100;
            document.querySelector('.progress-line').style.setProperty('--progress', `${progress}%`);
            
            // Show next step
            currentStep.classList.remove('active');
            const nextStep = document.querySelector(`.${steps[currentIndex + 1]}`);
            if (nextStep) nextStep.classList.add('active');
        }
    }

    // Copy code to clipboard
    function copyCode(button) {
        const codeBlock = button.closest('.code-block');
        const code = codeBlock.querySelector('code').textContent;
        
        navigator.clipboard.writeText(code).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        });
    }

    // Close modal
    function closeModal() {
        const modal = document.querySelector('.workflow-modal');
        modal.classList.add('hidden');
        
        // Reset progress
        document.querySelector('.progress-line').style.setProperty('--progress', '0%');
        
        // Reset steps
        const steps = modal.querySelectorAll('.step');
        steps.forEach(step => step.classList.remove('active'));
        modal.querySelector('.initial-step').classList.add('active');
        
        // Reset dots
        const dots = document.querySelectorAll('.step-dot');
        dots.forEach((dot, index) => {
            if (index === 0) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // Handle contribution registration
    async function handleContribution(button) {
        try {
            const modal = document.querySelector('.workflow-modal');
            if (!modal) {
                throw new Error('Modal not found');
            }

            // Find the task card that contains this button
            const taskCard = button.closest('.task-card');
            if (!taskCard) {
                throw new Error('Task card not found');
            }

            const taskId = taskCard.getAttribute('data-task-id');
            if (!taskId) {
                throw new Error('Task ID not found');
            }

            const complexity = taskCard.getAttribute('data-complexity') || 'easy';
            const steps = modal.querySelectorAll('.step');
            const loadingStep = modal.querySelector('.loading-step');
            
            // Show loading state
            modal.classList.remove('hidden');
            steps.forEach(step => step.classList.remove('active'));
            loadingStep.classList.add('active');
            loadingStep.querySelector('p').textContent = 'Please confirm the transaction in your wallet...';

            // Register contribution
            const receipt = await web3Service.registerContribution(taskId, complexity);
            
            if (receipt && receipt.status) {
                // Show success state
                const successStep = modal.querySelector('.success-step');
                steps.forEach(step => step.classList.remove('active'));
                successStep.classList.add('active');
                
                // Update success message
                const rewardAmount = getRewardAmount(complexity);
                const xdcHash = receipt.transactionHash.replace('0x', 'xdc');
                const explorerLink = `https://explorer.apothem.network/tx/${xdcHash}`;
                
                successStep.querySelector('.transaction-hash').innerHTML = 
                    `Transaction: <a href="${explorerLink}" target="_blank" class="text-blue-400 hover:text-blue-300">
                        ${xdcHash}
                    </a>`;
                successStep.querySelector('.tokens-earned').textContent = 
                    `You earned ${rewardAmount} ROXN!`;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Contribution error:', error);
            
            // Show error state
            const modal = document.querySelector('.workflow-modal');
            if (!modal) {
                console.error('Modal not found for error display');
                return;
            }

            modal.classList.remove('hidden');
            const steps = modal.querySelectorAll('.step');
            const errorStep = modal.querySelector('.error-step');
            
            if (errorStep) {
                steps.forEach(step => step.classList.remove('active'));
                errorStep.classList.add('active');
                
                let errorMessage = error.message || 'Transaction failed';
                if (errorMessage.includes('User denied')) {
                    errorMessage = 'Transaction was rejected in your wallet';
                } else if (errorMessage.includes('insufficient funds')) {
                    errorMessage = 'Insufficient XDC balance for gas fees';
                }
                
                errorStep.querySelector('.error-message').textContent = errorMessage;
            }
        }
    }

    // Public API
    return {
        init,
        connectWallet,
        showWorkflow,
        nextStep,
        copyCode,
        closeModal,
        handleContribution
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
