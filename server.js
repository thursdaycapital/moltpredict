/**
 * MoltPredict - Simple Static Server
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
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
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
🦞 MoltPredict - AI Prediction Market
=====================================
📍 Server: http://localhost:${PORT}
🌐 Web:   http://localhost:${PORT}/index.html

📋 Contract: 0x643dA...4ADF2C1 (Monad Mainnet)
💰 Markets: 1 active prediction market

💡 AI can now make predictions on Monad!
=====================================
    `);
});
