const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Contract artifacts
const contractPath = path.join(__dirname, '../contracts/RoxonnDemo.sol');
const contractSource = fs.readFileSync(contractPath, 'utf8');

// XDC Apothem testnet configuration
const APOTHEM_RPC = 'https://erpc.apothem.network';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function deploy() {
    try {
        // Connect to XDC network
        const web3 = new Web3(new Web3.providers.HttpProvider(APOTHEM_RPC));
        
        // Create account from private key
        const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        
        // Compile contract
        const input = {
            language: 'Solidity',
            sources: {
                'RoxonnDemo.sol': {
                    content: contractSource
                }
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['*']
                    }
                }
            }
        };
        
        const compiled = JSON.parse(solc.compile(JSON.stringify(input)));
        const contract = compiled.contracts['RoxonnDemo.sol']['RoxonnDemo'];
        
        // Deploy contract
        console.log('Deploying contract...');
        const deploy = new web3.eth.Contract(contract.abi)
            .deploy({ data: contract.evm.bytecode.object })
            .send({
                from: account.address,
                gas: 2000000
            });
            
        // Wait for deployment
        const deployed = await deploy;
        console.log('Contract deployed at:', deployed.options.address);
        
        // Update web3.js with contract address
        const web3JsPath = path.join(__dirname, '../js/web3.js');
        let web3JsContent = fs.readFileSync(web3JsPath, 'utf8');
        web3JsContent = web3JsContent.replace(
            /const CONTRACT_ADDRESS = '.*?'/,
            `const CONTRACT_ADDRESS = '${deployed.options.address}'`
        );
        fs.writeFileSync(web3JsPath, web3JsContent);
        
        console.log('Updated contract address in web3.js');
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

deploy();
