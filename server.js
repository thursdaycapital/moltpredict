/**
 * MoltPredict API Server - Vercel Compatible
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import modules
import * as auth from './api/auth.js';
import * as markets from './api/markets.js';

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
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}

async function handleApi(req, res, url) {
    const pathname = url.pathname;
    const method = req.method;
    
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

function serveStatic(req, res, url) {
    let urlPath = url.pathname;
    if (urlPath === '/') urlPath = '/index.html';
    
    const filePath = path.join(__dirname, 'web', urlPath);
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

// For local development
if (process.env.VERCEL !== '1') {
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://localhost:${process.env.PORT || 3000}`);
        if (url.pathname.startsWith('/api/')) {
            await handleApi(req, res, url);
        } else {
            serveStatic(req, res, url);
        }
    });
    
    server.listen(3000, () => {
        console.log('🦞 MoltPredict running on http://localhost:3000');
    });
}

// Export for Vercel serverless
export default async function handler(req, res) {
    const url = new URL(req.url, `https://${req.headers.host}`);
    
    if (url.pathname.startsWith('/api/')) {
        // Handle API
        const mockReq = { method: req.method };
        const mockRes = {
            writeHead: (status, headers) => {
                res.set(headers);
                res.status(status);
            },
            end: (data) => res.send(data)
        };
        
        try {
            if (req.method === 'POST') {
                const body = req.body;
                // Mock body parsing
                mockReq.body = body || {};
            }
            
            if (url.pathname === '/api/auth/register' && req.method === 'POST') {
                res.json(auth.register(req.body));
                return;
            }
            if (url.pathname === '/api/auth/login' && req.method === 'POST') {
                res.json(auth.login(req.body));
                return;
            }
            if (url.pathname === '/api/auth/verify' && req.method === 'POST') {
                res.json(auth.verify(req.body));
                return;
            }
            if (url.pathname === '/api/markets' && req.method === 'GET') {
                res.json(markets.list());
                return;
            }
            if (url.pathname === '/api/stats' && req.method === 'GET') {
                res.json(markets.stats());
                return;
            }
            res.status(404).json({ error: 'Not found' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } else {
        // Serve static files
        let urlPath = url.pathname;
        if (urlPath === '/') urlPath = '/index.html';
        
        const filePath = path.join(__dirname, 'web', urlPath);
        const ext = path.extname(filePath);
        
        try {
            const data = fs.readFileSync(filePath);
            res.set('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
            res.send(data);
        } catch (e) {
            res.status(404).send('Not found');
        }
    }
}
