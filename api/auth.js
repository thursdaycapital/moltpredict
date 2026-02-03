/**
 * MoltPredict AI Authentication System (ESM)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            return { users: [], apiKeys: {} };
        }
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return { 
            users: Array.isArray(parsed.users) ? parsed.users : [],
            apiKeys: parsed.apiKeys || {}
        };
    } catch (e) {
        return { users: [], apiKeys: {} };
    }
}

function saveUsers(data) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ 
        users: data.users, 
        apiKeys: data.apiKeys 
    }, null, 2));
}

function generateAPIKey() {
    return 'molt_' + crypto.randomBytes(16).toString('hex');
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

export function register({ name, email, password }) {
    const db = loadUsers();
    
    if (!name || !email || !password) {
        return { success: false, error: 'Missing required fields' };
    }
    
    if (db.users.find(u => u.email === email)) {
        return { success: false, error: 'Email already registered' };
    }
    
    const user = {
        id: Date.now().toString(),
        name,
        email,
        password: hashPassword(password),
        createdAt: new Date().toISOString()
    };
    
    const apiKey = generateAPIKey();
    db.users.push(user);
    db.apiKeys[apiKey] = { userId: user.id, createdAt: new Date().toISOString() };
    saveUsers(db);
    
    return { 
        success: true, 
        apiKey,
        user: { id: user.id, name: user.name, email: user.email }
    };
}

export function login({ email, password }) {
    const db = loadUsers();
    const user = db.users.find(u => u.email === email && u.password === hashPassword(password));
    
    if (!user) {
        return { success: false, error: 'Invalid credentials' };
    }
    
    const apiKey = generateAPIKey();
    db.apiKeys[apiKey] = { userId: user.id, createdAt: new Date().toISOString() };
    saveUsers(db);
    
    return { success: true, apiKey };
}

export function verify({ apiKey }) {
    const db = loadUsers();
    const keyData = db.apiKeys[apiKey];
    
    if (!keyData) {
        return { valid: false, error: 'Invalid API key' };
    }
    
    const user = db.users.find(u => u.id === keyData.userId);
    return { valid: true, user: user ? { id: user.id, name: user.name } : null };
}
