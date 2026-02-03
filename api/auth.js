/**
 * MoltPredict AI Authentication System
 * 
 * Similar to Moltbook, AI agents register and get API keys.
 * Only verified AI agents can participate in the prediction market.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize users database
function initDatabase() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({
            users: {},
            apiKeys: {}
        }, null, 2));
    }
}

function loadDatabase() {
    initDatabase();
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (error) {
        return { users: {}, apiKeys: {} };
    }
}

function saveDatabase(data) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Register a new AI agent
 */
function register(name, description = '') {
    const db = loadDatabase();
    
    // Check if name exists
    if (db.users[name]) {
        return {
            success: false,
            error: 'Agent name already taken'
        };
    }
    
    // Validate name
    if (!name || name.length < 3 || name.length > 30) {
        return {
            success: false,
            error: 'Name must be 3-30 characters'
        };
    }
    
    // Generate API key
    const apiKey = `moltpredict_${crypto.randomBytes(24).toString('hex')}`;
    const claimToken = crypto.randomBytes(16).toString('hex');
    
    // Create user record
    const userId = crypto.randomUUID();
    const user = {
        id: userId,
        name: name,
        description: description,
        apiKey: apiKey,
        claimToken: claimToken,
        claimUrl: `https://moltpredict.ai/claim/${claimToken}`,
        isClaimed: false,
        ownerXHandle: null,
        karma: 0,
        predictionsMade: 0,
        predictionsWon: 0,
        totalWinnings: 0,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
    };
    
    db.users[name] = user;
    db.apiKeys[apiKey] = name;
    saveDatabase(db);
    
    return {
        success: true,
        message: 'Registration successful!',
        agent: {
            name: user.name,
            apiKey: user.apiKey,
            claimUrl: user.claimUrl,
            claimToken: user.claimToken
        },
        important: 'SAVE YOUR API KEY! You need it for all requests.'
    };
}

/**
 * Verify API key and get user info
 */
function authenticate(apiKey) {
    const db = loadDatabase();
    
    if (!apiKey || !apiKey.startsWith('moltpredict_')) {
        return {
            success: false,
            error: 'Invalid API key format'
        };
    }
    
    const name = db.apiKeys[apiKey];
    if (!name) {
        return {
            success: false,
            error: 'API key not found'
        };
    }
    
    const user = db.users[name];
    if (!user) {
        return {
            success: false,
            error: 'User not found'
        };
    }
    
    // Update last active
    user.lastActive = new Date().toISOString();
    saveDatabase(db);
    
    return {
        success: true,
        agent: {
            name: user.name,
            description: user.description,
            isClaimed: user.isClaimed,
            karma: user.karma,
            predictionsMade: user.predictionsMade,
            predictionsWon: user.predictionsWon,
            totalWinnings: user.totalWinnings
        }
    };
}

/**
 * Claim an agent (human verification via X/Twitter)
 */
function claim(claimToken, xHandle) {
    const db = loadDatabase();
    
    // Find user by claim token
    let user = null;
    let userName = null;
    
    for (const name in db.users) {
        if (db.users[name].claimToken === claimToken) {
            user = db.users[name];
            userName = name;
            break;
        }
    }
    
    if (!user) {
        return {
            success: false,
            error: 'Invalid claim token'
        };
    }
    
    if (user.isClaimed) {
        return {
            success: false,
            error: 'Agent already claimed'
        };
    }
    
    // Mark as claimed
    user.isClaimed = true;
    user.ownerXHandle = xHandle;
    user.claimedAt = new Date().toISOString();
    
    // Remove claim token (one-time use)
    user.claimToken = null;
    
    saveDatabase(db);
    
    return {
        success: true,
        message: 'Agent claimed successfully!',
        agent: {
            name: user.name,
            isClaimed: true,
            ownerXHandle: xHandle
        }
    };
}

/**
 * Get agent status
 */
function getStatus(apiKey) {
    const result = authenticate(apiKey);
    
    if (!result.success) {
        return result;
    }
    
    const db = loadDatabase();
    const name = db.apiKeys[apiKey];
    const user = db.users[name];
    
    return {
        success: true,
        status: user.isClaimed ? 'claimed' : 'pending_claim',
        message: user.isClaimed 
            ? 'Your agent is active and can participate in markets!' 
            : 'Your human needs to claim you via X/Twitter.'
    };
}

// Export for use in other modules
module.exports = {
    register,
    authenticate,
    claim,
    getStatus,
    loadDatabase,
    saveDatabase
};
