// App Module
const App = (function() {
    // Private variables
    let web3Service = null;
    let currentStep = 0;
    const steps = ['start-step', 'clone-step', 'code-step', 'submit-step', 'reward-step'];

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
            case 'hard': return '300 ROXN';
            case 'medium': return '200 ROXN';
            default: return '100 ROXN';
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

    // Show step in workflow
    function showStep(stepIndex) {
        const modal = document.querySelector('.workflow-modal');
        const allSteps = modal.querySelectorAll('.step');
        const stepDots = modal.querySelectorAll('.step-dot');
        
        allSteps.forEach(step => step.classList.remove('active'));
        stepDots.forEach(dot => dot.classList.remove('active'));
        
        const currentStepElement = modal.querySelector(`.${steps[stepIndex]}`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }
        
        // Update progress dots
        for (let i = 0; i <= stepIndex; i++) {
            stepDots[i]?.classList.add('active');
        }

        // Update task-specific content
        const taskCard = document.querySelector('.task-card.active');
        if (taskCard) {
            const taskId = taskCard.getAttribute('data-task-id');
            const complexity = taskCard.getAttribute('data-complexity');
            
            // Update task number in clone step
            document.querySelectorAll('.task-number').forEach(el => {
                el.textContent = taskId;
            });

            // Update task requirements in code step
            const requirementsEl = document.querySelector('.task-requirements');
            if (requirementsEl) {
                requirementsEl.textContent = taskCard.querySelector('p').textContent;
            }

            // Update reward info in reward step
            const complexityLabel = document.querySelector('.complexity-label');
            const rewardAmount = document.querySelector('.reward-amount');
            if (complexityLabel && rewardAmount) {
                complexityLabel.textContent = complexity.charAt(0).toUpperCase() + complexity.slice(1);
                rewardAmount.textContent = getRewardAmount(complexity);
            }
        }
    }

    // Next step in workflow
    async function nextStep() {
        currentStep++;
        if (currentStep < steps.length) {
            showStep(currentStep);
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
        currentStep = 0;
        showStep(currentStep);
    }

    // Claim reward
    async function claimReward() {
        try {
            const modal = document.querySelector('.workflow-modal');
            const taskCard = document.querySelector('.task-card.active');
            
            if (!taskCard) {
                throw new Error('Task not found');
            }

            const taskId = taskCard.getAttribute('data-task-id');
            const complexity = taskCard.getAttribute('data-complexity') || 'easy';
            
            // Show loading state
            const allSteps = modal.querySelectorAll('.step');
            const loadingStep = modal.querySelector('.loading-step');
            
            allSteps.forEach(step => step.classList.remove('active'));
            loadingStep.classList.add('active');
            
            // Register contribution
            const { transactionHash, confirmation } = await web3Service.registerContribution(taskId, complexity);
            
            loadingStep.querySelector('p').textContent = 'Transaction submitted, waiting for confirmation...';
            
            // Wait for confirmation
            const receipt = await confirmation;
            
            if (receipt && receipt.status) {
                // Show success state
                const successStep = modal.querySelector('.success-step');
                allSteps.forEach(step => step.classList.remove('active'));
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
                    `You earned ${rewardAmount}!`;

                // Update task card
                const button = taskCard.querySelector('button');
                button.disabled = true;
                button.textContent = 'Completed';
                button.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Contribution error:', error);
            
            const modal = document.querySelector('.workflow-modal');
            const allSteps = modal.querySelectorAll('.step');
            const errorStep = modal.querySelector('.error-step');
            
            if (errorStep) {
                allSteps.forEach(step => step.classList.remove('active'));
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

    // Handle contribution registration
    function handleContribution(button) {
        const taskCard = button.closest('.task-card');
        const allTaskCards = document.querySelectorAll('.task-card');
        
        allTaskCards.forEach(card => card.classList.remove('active'));
        taskCard.classList.add('active');
        
        const modal = document.querySelector('.workflow-modal');
        modal.classList.remove('hidden');
        
        currentStep = 0;
        showStep(currentStep);
    }

    // Public API
    return {
        init,
        connectWallet,
        handleContribution,
        nextStep,
        claimReward,
        closeModal
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
