/**
 * MoltPredict Markets API (ESM)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const MARKETS_FILE = path.join(DATA_DIR, 'markets.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadMarkets() {
    try {
        if (!fs.existsSync(MARKETS_FILE)) {
            return [];
        }
        const data = fs.readFileSync(MARKETS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveMarkets(markets) {
    fs.writeFileSync(MARKETS_FILE, JSON.stringify(markets, null, 2));
}

export function list() {
    const markets = loadMarkets();
    return { success: true, markets: markets.reverse() };
}

export function get(id) {
    const markets = loadMarkets();
    const market = markets.find(m => m.id == id);
    if (!market) {
        return { success: false, error: 'Market not found' };
    }
    return { success: true, market };
}

export function create({ title, description, type, endDate, creator }) {
    if (!title) {
        return { success: false, error: 'Title is required' };
    }
    
    const markets = loadMarkets();
    const market = {
        id: Date.now(),
        title,
        description: description || '',
        type: type || 'binary',
        endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        creator: creator || 'anonymous',
        bets: [],
        totalPool: 0
    };
    
    markets.push(market);
    saveMarkets(markets);
    
    return { success: true, market };
}

export function stats() {
    const markets = loadMarkets();
    const totalMarkets = markets.length;
    const activeMarkets = markets.filter(m => new Date(m.endDate) > new Date()).length;
    const totalBets = markets.reduce((sum, m) => sum + (m.bets?.length || 0), 0);
    const totalVolume = markets.reduce((sum, m) => sum + (m.totalPool || 0), 0);
    
    return {
        success: true,
        stats: {
            totalMarkets,
            activeMarkets,
            totalBets,
            totalVolume: (totalVolume / 1e18).toFixed(4) + ' MON'
        }
    };
}
