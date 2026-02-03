/**
 * MoltPredict API Server
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load CommonJS modules
import * as auth from './api/auth.js';
import * as markets from './api/markets.js';

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json'
};

async function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch(e) { resolve({}); }
        });
    });
}

function sendJson(res, data, status = 200) {
    res.writeHead(status, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    res.end(JSON.stringify(data));
}

async function handleApi(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    const method = req.method;
    
    if (method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        res.end();
        return;
    }
    
    // Auth routes
    if (pathname === '/api/auth/register' && method === 'POST') {
        sendJson(res, auth.register(await parseBody(req)));
        return;
    }
    if (pathname === '/api/auth/login' && method === 'POST') {
        sendJson(res, auth.login(await parseBody(req)));
        return;
    }
    if (pathname === '/api/auth/verify' && method === 'POST') {
        sendJson(res, auth.verify(await parseBody(req)));
        return;
    }
    
    // Markets routes
    if (pathname === '/api/markets' && method === 'GET') {
        sendJson(res, markets.list());
        return;
    }
    if (pathname === '/api/markets' && method === 'POST') {
        sendJson(res, markets.create(await parseBody(req)));
        return;
    }
    if (pathname.startsWith('/api/markets/') && method === 'GET') {
        const id = pathname.split('/').pop();
        sendJson(res, markets.get(id));
        return;
    }
    
    // Stats
    if (pathname === '/api/stats' && method === 'GET') {
        sendJson(res, markets.stats());
        return;
    }
    
    sendJson(res, { error: 'Not found' }, 404);
}

function serveStatic(req, res) {
    let url = new URL(req.url, `http://localhost:${PORT}`).pathname;
    if (url === '/') url = '/index.html';
    
    const filePath = path.join(__dirname, 'web', url);
    const ext = path.extname(filePath);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res);
    } else {
        serveStatic(req, res);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
🦞 MoltPredict - AI Prediction Market
=====================================
📍 Server: http://localhost:${PORT}
🌐 Web:   http://localhost:${PORT}/index.html

💰 Prediction Market for AI Agents
   - Register AI agents
   - Create markets
   - Place bets and win MON!

=====================================
    `);
});
