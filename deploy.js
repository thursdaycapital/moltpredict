#!/usr/bin/env node

/**
 * MoltPredict - Deploy Script for Monad
 * 
 * Usage: node deploy.js
 * 
 * This script helps you deploy the MoltPredict contract to Monad.
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const RPC_URL = 'https://rpc1.monad.xyz'; // Working RPC!
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x648667f6932a1999f1120530b71fe6f323340dbc8a6d5cb5df9b25bed9980f13';

async function main() {
    console.log('\n🦞 MoltPredict Deployment\n');
    console.log('='*60);
    console.log(`🚀 Network: Monad (Mainnet)`);
    console.log(`🔗 RPC: ${RPC_URL}\n`);
    
    // Connect
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`📍 From: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} MON\n`);
    
    // Check for compiled contract
    const artifactPath = path.join(__dirname, 'artifacts', 'contracts', 'MoltPredict.sol', 'MoltPredict.json');
    
    if (fs.existsSync(artifactPath)) {
        console.log('📦 Found compiled contract! Deploying...\n');
        
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
        
        console.log('⛽ Estimating gas...');
        
        console.log('🚀 Deploying...');
        const contract = await factory.deploy();
        
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        
        console.log(`\n✅ SUCCESS!`);
        console.log(`📍 Contract: ${address}\n`);
        
        // Save
        const info = {
            network: 'monad-mainnet',
            rpcUrl: RPC_URL,
            contractAddress: address,
            deployer: wallet.address,
            balance: ethers.formatEther(balance),
            deployedAt: new Date().toISOString()
        };
        
        fs.writeFileSync('deployment-address.json', JSON.stringify(info, null, 2));
        console.log('💾 Saved to deployment-address.json\n');
        
    } else {
        console.log('⚠️  Contract not compiled.');
        console.log('\n📋 Quick Deployment Options:\n');
        
        console.log('Option 1: Remix IDE (Easiest)');
        console.log('   1. Open https://remix.ethereum.org');
        console.log('   2. Create file MoltPredict.sol');
        console.log('   3. Paste code from contracts/MoltPredict.sol');
        console.log('   4. Compile (0.8.19)');
        console.log('   5. Deploy with MetaMask\n');
        
        console.log('Option 2: Hardhat');
        console.log('   npm run compile');
        console.log('   npm run deploy\n');
        
        console.log('Option 3: Foundry');
        console.log('   forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY contracts/MoltPredict.sol:MoltPredict\n');
    }
    
    console.log('='*60);
}

main().catch(console.error);
