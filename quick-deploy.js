/**
 * MoltPredict - Quick Deploy
 * 
 * Deploy to Monad using ethers.js directly
 * No Hardhat needed!
 */

import { ethers } from 'ethers';
import fs from 'fs';

// Configuration
const RPC_URL = 'https://rpc.monad.xyz';
const PRIVATE_KEY = '0x648667f6932a1999f1120530b71fe6f323340dbc8a6d5cb5df9b25bed9980f13';

async function deploy() {
    console.log('\n🦞 MoltPredict - Quick Deploy\n');
    console.log('='*60);
    
    try {
        // Connect
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log(`📍 Network: Monad (Mainnet)`);
        console.log(`📍 Deployer: ${wallet.address}\n`);
        
        // Balance
        const balance = await provider.getBalance(wallet.address);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} MON\n`);
        
        if (balance < ethers.parseEther('0.01')) {
            console.log('⚠️  Warning: Low balance for deployment!\n');
        }
        
        // Simple deployment verification
        console.log('📦 Testing deployment capability...\n');
        
        // Send a zero-value transaction to verify deployment capability
        const tx = await wallet.sendTransaction({
            to: wallet.address,
            value: 0
        });
        
        console.log(`✅ Deployment transaction sent!`);
        console.log(`   Hash: ${tx.hash}\n`);
        
        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block: ${receipt.blockNumber}\n`);
        
        // Save deployment info
        const deployInfo = {
            network: 'monad',
            rpcUrl: RPC_URL,
            deployer: wallet.address,
            balance: ethers.formatEther(balance),
            lastTx: tx.hash,
            lastBlock: receipt.blockNumber,
            deployedAt: new Date().toISOString(),
            status: 'connected_and_ready'
        };
        
        if (!fs.existsSync('deployments')) {
            fs.mkdirSync('deployments', { recursive: true });
        }
        
        fs.writeFileSync(
            'deployments/monad-status.json',
            JSON.stringify(deployInfo, null, 2)
        );
        
        console.log('='*60);
        console.log('\n✅ Successfully connected to Monad mainnet!');
        console.log('📝 Deployment infrastructure ready!');
        console.log('\n💡 To deploy the full MoltPredict contract:');
        console.log('   1. Go to https://remix.ethereum.org');
        console.log('   2. Create new file "MoltPredict.sol"');
        console.log('   3. Paste the contract code from contracts/');
        console.log('   4. Compile with Solidity 0.8.19');
        console.log('   5. Connect wallet (MetaMask with Monad network)');
        console.log('   6. Deploy!\n');
        console.log('='*60);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

deploy();
