/**
 * MoltPredict - Direct Deployment Script
 * 
 * Uses solc and ethers directly (no Hardhat needed)
 */

import { ethers } from 'ethers';
import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const RPC_URL = 'https://rpc1.monad.xyz';
const PRIVATE_KEY = '0x648667f6932a1999f1120530b71fe6f323340dbc8a6d5cb5df9b25bed9980f13';

async function main() {
    console.log('\n🦞 MoltPredict - Direct Deployment\n');
    console.log('='*60);
    
    // Read contract source
    const contractPath = path.join(__dirname, 'contracts', 'MoltPredict.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');
    
    console.log('📦 Compiling contract...');
    
    // Compile with solc
    const input = {
        language: 'Solidity',
        sources: {
            'MoltPredict.sol': {
                content: sourceCode
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
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors && output.errors.some(e => e.severity === 'error')) {
        console.log('❌ Compilation errors:');
        output.errors.forEach(e => console.log(e.message));
        process.exit(1);
    }
    
    console.log('✅ Compilation successful!\n');
    
    // Get bytecode and ABI
    const artifact = output.contracts['MoltPredict.sol']['MoltPredict'];
    const bytecode = artifact.bytecode;
    const abi = artifact.abi;
    
    console.log(`📊 Contract size: ${(bytecode.length / 2).toFixed(0)} bytes`);
    console.log(`📊 ABI methods: ${abi.length}\n`);
    
    // Connect to network
    console.log('🔗 Connecting to Monad...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`📍 From: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} MON\n`);
    
    // Estimate gas
    console.log('⛽ Estimating gas...');
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    try {
        const deployTx = factory.getDeployTransaction();
        const gasEstimate = await provider.estimateGas(deployTx);
        console.log(`   Estimated gas: ${gasEstimate.toString()}`);
        
        const gasPrice = await provider.getGasPrice();
        const estimatedCost = gasEstimate * gasPrice;
        console.log(`   Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
        console.log(`   Estimated cost: ${ethers.formatEther(estimatedCost)} MON\n`);
        
        // Deploy
        console.log('🚀 Deploying contract...');
        const contract = await factory.deploy();
        
        console.log('   Transaction sent:', contract.deploymentTransaction().hash);
        
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        
        console.log(`\n✅ SUCCESS! Contract deployed!`);
        console.log(`📍 Contract Address: ${address}\n`);
        
        // Save deployment info
        const deployInfo = {
            network: 'monad-mainnet',
            rpcUrl: RPC_URL,
            contractAddress: address,
            deployer: wallet.address,
            balance: ethers.formatEther(balance),
            deploymentCost: ethers.formatEther(estimatedCost),
            deployedAt: new Date().toISOString(),
            txHash: contract.deploymentTransaction().hash
        };
        
        fs.writeFileSync('deployment-address.json', JSON.stringify(deployInfo, null, 2));
        console.log('💾 Deployment info saved to deployment-address.json\n');
        
        // Save artifact for frontend
        const frontendArtifact = { address, abi };
        fs.writeFileSync('web/contract-artifact.json', JSON.stringify(frontendArtifact, null, 2));
        console.log('💾 Frontend artifact saved to web/contract-artifact.json\n');
        
        console.log('='*60);
        console.log('\n🎉 MoltPredict is now live on Monad!');
        console.log('💰 Start earning fees!\n');
        console.log('='*60);
        
    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);
