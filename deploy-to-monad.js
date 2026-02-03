/**
 * MoltPredict - Deploy to Monad using Remix-style approach
 * 
 * Since we can't compile here, we'll create deployment artifacts
 * that can be used in Remix IDE or other tools.
 */

import { ethers } from 'ethers';
import fs from 'fs';

// Use the fastest RPC
const RPC_URL = 'https://rpc-mainnet.monadinfra.com'; // 0.106s latency - fastest!
const PRIVATE_KEY = '0x648667f6932a1999f1120530b71fe6f323340dbc8a6d5cb5df9b25bed9980f13';

async function deploy() {
    console.log('\n🦞 MoltPredict - Deploying to Monad\n');
    console.log('='*60);
    console.log(`🚀 RPC: ${RPC_URL}\n`);
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`📍 From: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} MON\n`);
    
    // Check if MoltPredict bytecode exists (from compilation)
    const bytecodePath = 'artifacts/contracts/MoltPredict.sol/MoltPredict.json';
    
    if (fs.existsSync(bytecodePath)) {
        console.log('📦 Found compiled contract! Deploying...\n');
        
        const artifact = JSON.parse(fs.readFileSync(bytecodePath, 'utf8'));
        const factory = new ethers.ContractFactory(
            artifact.abi,
            artifact.bytecode,
            wallet
        );
        
        console.log('⛽ Estimating gas...');
        const estimatedGas = await factory.getDeployTransaction();
        
        // Deploy
        console.log('🚀 Deploying contract...');
        const contract = await factory.deploy();
        
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        
        console.log(`\n✅ SUCCESS! Contract deployed to:`);
        console.log(`   ${address}\n`);
        
        // Save deployment info
        const deployInfo = {
            network: 'monad-mainnet',
            rpcUrl: RPC_URL,
            contractAddress: address,
            deployer: wallet.address,
            balance: ethers.formatEther(balance),
            deployedAt: new Date().toISOString(),
            txHash: contract.deploymentTransaction().hash
        };
        
        fs.writeFileSync('deployments/deployed.json', JSON.stringify(deployInfo, null, 2));
        console.log('💾 Deployment info saved!\n');
        
    } else {
        console.log('📦 Contract not compiled yet.');
        console.log('\n📋 To deploy, choose ONE of these methods:\n');
        console.log('方法 1 - Remix IDE (推荐):');
        console.log('   1. Open https://remix.ethereum.org');
        console.log('   2. Create MoltPredict.sol');
        console.log('   3. Paste code from contracts/MoltPredict.sol');
        console.log('   4. Compile (Solidity 0.8.19)');
        console.log('   5. Deploy with MetaMask\n');
        
        console.log('方法 2 - Hardhat (需要 Node.js 22+):');
        console.log('   npm run compile');
        console.log('   npm run deploy\n');
        
        console.log('方法 3 - Foundry:');
        console.log('   forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY contracts/MoltPredict.sol:MoltPredict\n');
    }
    
    console.log('='*60);
}

deploy().catch(e => console.error('Error:', e.message));
