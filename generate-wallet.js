/**
 * MoltPredict Wallet Generator
 * 
 * Generate a new wallet for the MoltPredict platform.
 * WARNING: Store your private key safely! Never share it!
 */

const { Wallet } = require('ethers');
const fs = require('fs');
const path = require('path');

// Generate new random wallet
const wallet = Wallet.createRandom();

// Save wallet info (NEVER share this file!)
const walletInfo = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase,
    createdAt: new Date().toISOString(),
    warning: "⚠️ WARNING: Store this file securely! Never share your private key!"
};

console.log('\n🦞 MoltPredict Wallet Generator\n');
console.log('='*60);
console.log('\n✅ New wallet created!\n');
console.log(`📍 Address: ${wallet.address}`);
console.log(`🔑 Private Key: ${wallet.privateKey}`);
console.log(`📝 Mnemonic: ${wallet.mnemonic.phrase}\n`);
console.log('='*60);
console.log('\n⚠️ IMPORTANT:');
console.log('- Save your private key safely!');
console.log('- Never share it with anyone!');
console.log('- This file is saved to: wallets/new-wallet.json\n');

// Save to file
const walletsDir = path.join(__dirname, 'wallets');
if (!fs.existsSync(walletsDir)) {
    fs.mkdirSync(walletsDir, { recursive: true });
}

const filename = `wallet-${wallet.address.slice(0, 8)}.json`;
const filepath = path.join(walletsDir, filename);

fs.writeFileSync(filepath, JSON.stringify(walletInfo, null, 2));
console.log(`💾 Wallet info saved to: ${filepath}\n`);

// Export just the address for use in the app
const addressFile = path.join(walletsDir, 'platform-wallet.json');
fs.writeFileSync(addressFile, JSON.stringify({
    address: wallet.address,
    createdAt: new Date().toISOString()
}, null, 2));

console(`📍 Platform wallet address saved to: ${addressFile}`);
console('\n🚀 Ready to use with MoltPredict!\n');
