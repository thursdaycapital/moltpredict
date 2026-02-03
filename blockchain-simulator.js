/**
 * MoltPredict - Local Demo Version
 * 
 * This is a local simulation of the prediction market.
 * Works without blockchain for testing and demonstration.
 * 
 * When Monad is ready, replace with real blockchain deployment.
 */

const crypto = require('crypto');

// In-memory "blockchain" (simulated)
const blockchain = {
    blocks: [],
    pendingTransactions: []
};

// Platform state
const state = {
    markets: {},
    predictions: {},
    users: {},
    platformWallet: '0xFa06985Eae2e5a068f90A5302cB6E5360D8E77E6',
    totalFees: 0,
    deploymentStatus: 'simulated' // or 'deployed' when on real blockchain
};

// Simulate blockchain delay
function simulateBlockTime(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Create a market (simulated transaction)
function createMarket(data) {
    const marketId = crypto.randomUUID();
    const market = {
        id: marketId,
        title: data.title,
        description: data.description,
        type: data.type || 'binary',
        creator: data.creator,
        totalPool: 0,
        status: 'open',
        createdAt: new Date().toISOString(),
        endDate: data.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    state.markets[marketId] = market;
    state.predictions[marketId] = [];
    
    // Simulate block confirmation
    blockchain.blocks.push({
        transactions: [marketId],
        timestamp: Date.now()
    });
    
    return { success: true, marketId, txHash: crypto.randomBytes(32).toString('hex') };
}

// Place prediction (simulated transaction)
function placePrediction(data) {
    const predictionId = crypto.randomUUID();
    const prediction = {
        id: predictionId,
        marketId: data.marketId,
        predictor: data.predictor,
        outcome: data.outcome,
        amount: data.amount,
        timestamp: new Date().toISOString(),
        txHash: crypto.randomBytes(32).toString('hex')
    };
    
    state.predictions[data.marketId].push(prediction);
    state.markets[data.marketId].totalPool += data.amount;
    
    // Collect 2% fee
    const fee = data.amount * 0.02;
    state.totalFees += fee;
    
    return { success: true, predictionId, fee };
}

// Simulate blockchain status
function getBlockchainStatus() {
    return {
        status: state.deploymentStatus,
        network: 'Monad (simulated)',
        blocks: blockchain.blocks.length,
        latestBlock: blockchain.blocks[blockchain.blocks.length - 1]?.timestamp || null,
        gasPrice: '0 (simulated)',
        platformWallet: state.platformWallet,
        totalFeesCollected: state.totalFees,
        note: state.deploymentStatus === 'simulated' 
            ? 'Running in simulation mode. Connect to real Monad network to deploy.'
            : 'Deployed on Monad mainnet!'
    };
}

// Export for API server
module.exports = {
    createMarket,
    placePrediction,
    getBlockchainStatus,
    state
};
