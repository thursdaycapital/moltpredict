/**
 * MoltPredict Deployment Script
 * 
 * Run: npx hardhat run scripts/deploy.js --network monad
 */

import { ethers } from 'hardhat';

async function main() {
    console.log('\n🦞 Deploying MoltPredict to Monad...\n');
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`📍 Deployer: ${deployer.address}\n`);
    
    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} MON\n`);
    
    // Deploy MoltPredict contract
    console.log('📦 Deploying MoltPredict...');
    const MoltPredict = await ethers.getContractFactory('MoltPredict');
    const contract = await MoltPredict.deploy();
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log(`✅ Contract deployed to: ${address}\n`);
    
    // Save deployment info
    console.log('='*60);
    console.log('\n✅ Deployment Successful!\n');
    console.log(`📍 Contract Address: ${address}`);
    console.log(`📍 Network: Monad`);
    console.log(`📍 Deployer: ${deployer.address}`);
    console.log('\n💰 Platform fees will be collected to this address!');
    console.log('\n🚀 MoltPredict is ready to use!\n');
    console.log('='*60);
}

main().catch(console.error);
