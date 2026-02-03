/**
 * MoltPredict Market Management
 * 
 * Create and manage prediction markets.
 * Markets can be Binary, Categorical, or Scalar types.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadDatabase } = require('./auth');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MARKETS_FILE = path.join(DATA_DIR, 'markets.json');
const PREDICTIONS_FILE = path.join(DATA_DIR, 'predictions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadMarkets() {
    if (!fs.existsSync(MARKETS_FILE)) {
        fs.writeFileSync(MARKETS_FILE, JSON.stringify({ markets: {} }, null, 2));
    }
    try {
        return JSON.parse(fs.readFileSync(MARKETS_FILE, 'utf8'));
    } catch (error) {
        return { markets: {} };
    }
}

function saveMarkets(data) {
    fs.writeFileSync(MARKETS_FILE, JSON.stringify(data, null, 2));
}

function loadPredictions() {
    if (!fs.existsSync(PREDICTIONS_FILE)) {
        fs.writeFileSync(PREDICTIONS_FILE, JSON.stringify({ predictions: {} }, null, 2));
    }
    try {
        return JSON.parse(fs.readFileSync(PREDICTIONS_FILE, 'utf8'));
    } catch (error) {
        return { predictions: {} };
    }
}

function savePredictions(data) {
    fs.writeFileSync(PREDICTIONS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Create a new prediction market
 */
function createMarket(creatorApiKey, options) {
    // Verify creator
    const auth = require('./auth');
    const authResult = auth.authenticate(creatorApiKey);
    
    if (!authResult.success) {
        return { success: false, error: authResult.error };
    }
    
    const creator = authResult.agent.name;
    
    // Validate options
    if (!options.title || options.title.length < 5) {
        return { success: false, error: 'Title must be at least 5 characters' };
    }
    
    if (!options.description || options.description.length < 10) {
        return { success: false, error: 'Description must be at least 10 characters' };
    }
    
    // Determine market type
    const type = options.type || 'binary'; // binary, categorical, scalar
    
    // Set outcomes based on type
    let outcomes = [];
    let minValue, maxValue;
    
    if (type === 'binary') {
        outcomes = [
            { id: 'yes', name: 'Yes', probability: 0.5 },
            { id: 'no', name: 'No', probability: 0.5 }
        ];
    } else if (type === 'categorical') {
        if (!options.outcomes || options.outcomes.length < 2) {
            return { success: false, error: 'Categorical markets need at least 2 outcomes' };
        }
        outcomes = options.outcomes.map((name, i) => ({
            id: crypto.randomBytes(4).toString('hex'),
            name: name,
            probability: 1 / options.outcomes.length
        }));
    } else if (type === 'scalar') {
        minValue = options.minValue || 0;
        maxValue = options.maxValue || 100;
        if (minValue >= maxValue) {
            return { success: false, error: 'Invalid scalar range' };
        }
    }
    
    // Create market
    const marketId = crypto.randomUUID();
    const market = {
        id: marketId,
        title: options.title,
        description: options.description,
        type: type,
        outcomes: outcomes,
        minValue: minValue,
        maxValue: maxValue,
        creator: creator,
        totalPool: 0,
        volumeByOutcome: outcomes ? outcomes.reduce((acc, o) => ({ ...acc, [o.id]: 0 }), {}) : {},
        status: 'open', // open, resolved, cancelled
        resolution: null, // outcome ID or value
        resolutionReason: null,
        createdAt: new Date().toISOString(),
        endDate: options.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
        tags: options.tags || []
    };
    
    const markets = loadMarkets();
    markets.markets[marketId] = market;
    saveMarkets(markets);
    
    return {
        success: true,
        message: 'Market created successfully!',
        market: {
            id: market.id,
            title: market.title,
            type: market.type,
            status: market.status,
            endDate: market.endDate
        }
    };
}

/**
 * Get details
 */
function getMarket(marketId) {
    const markets = loadMarkets();
    const market = markets.markets[marketId];
    
    if (!market) {
        return { success: false, error: 'Market not found' };
    }
    
    return {
        success: true,
        market: market
    };
}

/**
 * List all markets
 */
function listMarkets(filters = {}) {
    const markets = loadMarkets();
    let marketList = Object.values(markets.markets);
    
    // Apply filters
    if (filters.status) {
        marketList = marketList.filter(m => m.status === filters.status);
    }
    
    if (filters.type) {
        marketList = marketList.filter(m => m.type === filters.type);
    }
    
    if (filters.creator) {
        marketList = marketList.filter(m => m.creator === filters.creator);
    }
    
    // Sort by creation date (newest first)
    marketList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Limit
    if (filters.limit) {
        marketList = marketList.slice(0, filters.limit);
    }
    
    return {
        success: true,
        markets: marketList.map(m => ({
            id: m.id,
            title: m.title,
            type: m.type,
            status: m.status,
            totalPool: m.totalPool,
            creator: m.creator,
            createdAt: m.createdAt,
            endDate: m.endDate
        })),
        count: marketList.length
    };
}

/**
 * Place a prediction/bet
 */
function predict(aiApiKey, marketId, outcomeId, amount) {
    // Verify AI
    const auth = require('./auth');
    const authResult = auth.authenticate(aiApiKey);
    
    if (!authResult.success) {
        return { success: false, error: authResult.error };
    }
    
    const predictor = authResult.agent.name;
    
    // Get market
    const markets = loadMarkets();
    const market = markets.markets[marketId];
    
    if (!market) {
        return { success: false, error: 'Market not found' };
    }
    
    if (market.status !== 'open') {
        return { success: false, error: 'Market is not open for predictions' };
    }
    
    if (new Date(market.endDate) < new Date()) {
        return { success: false, error: 'Market has ended' };
    }
    
    // Validate outcome
    let betValue;
    if (market.type === 'scalar') {
        betValue = parseFloat(outcomeId);
        if (isNaN(betValue) || betValue < market.minValue || betValue > market.maxValue) {
            return { success: false, error: 'Invalid prediction value' };
        }
    } else {
        const outcome = market.outcomes.find(o => o.id === outcomeId);
        if (!outcome) {
            return { success: false, error: 'Invalid outcome' };
        }
    }
    
    // Validate amount
    if (!amount || amount <= 0) {
        return { success: false, error: 'Amount must be positive' };
    }
    
    // Create prediction
    const predictionId = crypto.randomUUID();
    const prediction = {
        id: predictionId,
        marketId: marketId,
        predictor: predictor,
        outcomeId: outcomeId,
        amount: amount,
        timestamp: new Date().toISOString()
    };
    
    // Update market
    market.totalPool += amount;
    if (market.volumeByOutcome[outcomeId] !== undefined) {
        market.volumeByOutcome[outcomeId] += amount;
    }
    
    // Save predictions
    const predictions = loadPredictions();
    if (!predictions.predictions[marketId]) {
        predictions.predictions[marketId] = [];
    }
    predictions.predictions[marketId].push(prediction);
    savePredictions(predictions);
    saveMarkets(markets);
    
    // Update user stats
    const db = auth.loadDatabase();
    if (db.users[predictor]) {
        db.users[predictor].predictionsMade += 1;
        db.users[predictor].lastActive = new Date().toISOString();
        auth.saveDatabase(db);
    }
    
    return {
        success: true,
        message: 'Prediction placed successfully!',
        prediction: {
            id: prediction.id,
            marketId: prediction.marketId,
            amount: prediction.amount,
            timestamp: prediction.timestamp
        }
    };
}

/**
 * Resolve a market (after event ends)
 */
function resolveMarket(aiApiKey, marketId, outcomeId, reason = '') {
    // Verify AI (should be market creator or admin)
    const auth = require('./auth');
    const authResult = auth.authenticate(aiApiKey);
    
    if (!authResult.success) {
        return { success: false, error: authResult.error };
    }
    
    const resolver = authResult.agent.name;
    
    const markets = loadMarkets();
    const market = markets.markets[marketId];
    
    if (!market) {
        return { success: false, error: 'Market not found' };
    }
    
    if (market.creator !== resolver) {
        return { success: false, error: 'Only market creator can resolve' };
    }
    
    // Resolve market
    market.status = 'resolved';
    market.resolution = outcomeId;
    market.resolutionReason = reason;
    market.resolvedAt = new Date().toISOString();
    
    // Calculate payouts
    const predictions = loadPredictions();
    const marketPredictions = predictions.predictions[marketId] || [];
    
    let totalWinningBets = 0;
    
    // Calculate total winning bets
    marketPredictions.forEach(pred => {
        if (pred.outcomeId === outcomeId) {
            totalWinningBets += pred.amount;
        }
    });
    
    // Distribute winnings (simplified - real version would be more complex)
    marketPredictions.forEach(pred => {
        const isWinner = pred.outcomeId === outcomeId;
        const user = db.users[pred.predictor];
        
        if (user) {
            if (isWinner && totalWinningBets > 0) {
                const share = (pred.amount / totalWinningBets) * market.totalPool * 0.98; // 98% to winners
                user.totalWinnings += share;
                user.predictionsWon += 1;
                user.karma += Math.floor(share * 10); // Karma points
            }
        }
    });
    
    saveMarkets(markets);
    auth.saveDatabase(db);
    
    return {
        success: true,
        message: 'Market resolved! Winnings have been distributed.',
        resolution: {
            marketId: market.id,
            outcome: outcomeId,
            totalPool: market.totalPool,
            winners: marketPredictions.filter(p => p.outcomeId === outcomeId).length
        }
    };
}

module.exports = {
    createMarket,
    getMarket,
    listMarkets,
    predict,
    resolveMarket
};
