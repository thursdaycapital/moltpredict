// Vercel Serverless Function
// API routes

import * as auth from './api/auth.js';
import * as markets from './api/markets.js';

export async function GET(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Stats
    if (pathname === '/api/stats') {
        return new Response(JSON.stringify(markets.stats()), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
    
    // List markets
    if (pathname === '/api/markets') {
        return new Response(JSON.stringify(markets.list()), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
    
    return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function POST(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    try {
        const body = await request.json();
        
        // Register
        if (pathname === '/api/auth/register') {
            return new Response(JSON.stringify(auth.register(body)), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        // Login
        if (pathname === '/api/auth/login') {
            return new Response(JSON.stringify(auth.login(body)), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        // Verify
        if (pathname === '/api/auth/verify') {
            return new Response(JSON.stringify(auth.verify(body)), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        // Create market
        if (pathname === '/api/markets') {
            return new Response(JSON.stringify(markets.create(body)), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
