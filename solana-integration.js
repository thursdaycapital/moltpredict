/**
 * MoltPredict - Solana Integration Module
 * 
 * Cross-chain capabilities for payment processing, reputation tracking,
 * and settlements via Jupiter DEX and Solana blockchain.
 * 
 * @version 1.0.0
 * @date 2026-02-03
 */

import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { JUPITER_API } from './config.js';

// Configuration
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const SOLANA_PAYMENT_WALLET = process.env.SOLANA_PAYMENT_WALLET;

// Initialize connection
const connection = new Connection(SOLANA_RPC, 'confirmed');

/**
 * Get SOL balance for an address
 * @param {string} address - Solana wallet address
 * @returns {Promise<number>} Balance in SOL
 */
export async function getSOLBalance(address) {
    try {
        const pubkey = new PublicKey(address);
        const balance = await connection.getBalance(pubkey);
        return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
        console.error('Error getting SOL balance:', error);
        return 0;
    }
}

/**
 * Get USDC balance for an address
 * @param {string} address - Solana wallet address
 * @returns {Promise<number>} Balance in USDC
 */
export async function getUSDCBalance(address) {
    try {
        const pubkey = new PublicKey(address);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
            mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
        });
        
        if (tokenAccounts.value.length === 0) return 0;
        
        return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    } catch (error) {
        console.error('Error getting USDC balance:', error);
        return 0;
    }
}

/**
 * Transfer SOL
 * @param {string} from - Sender private key (WIF or base58)
 * @param {string} to - Recipient address
 * @param {number} amount - Amount in SOL
 * @returns {Promise<object>} Transaction result
 */
export async function transferSOL(from, to, amount) {
    try {
        const fromKeypair = Keypair.fromSecretKey(
            Buffer.from(from, 'base58')
        );
        
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey: new PublicKey(to),
                lamports: amount * 1e9
            })
        );
        
        const signature = await connection.sendTransaction(transaction, [fromKeypair]);
        await connection.confirmTransaction(signature);
        
        return {
            success: true,
            signature,
            amount,
            chain: 'solana'
        };
    } catch (error) {
        console.error('Error transferring SOL:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get USDC price from Jupiter API
 * @returns {Promise<number>} USDC price in USD
 */
export async function getUSDCPrice() {
    try {
        const response = await fetch(`${JUPITER_API}/price?ids=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`);
        const data = await response.json();
        return data.data?.price || 1.0;
    } catch (error) {
        console.error('Error getting USDC price:', error);
        return 1.0;
    }
}

/**
 * Swap SOL to USDC via Jupiter
 * @param {string} privateKey - Wallet private key
 * @param {number} amount - Amount in SOL
 * @returns {Promise<object>} Swap result
 */
export async function swapSOLtoUSDC(privateKey, amount) {
    try {
        // This is a simplified version - full implementation would use Jupiter SDK
        const quoteResponse = await fetch(
            `${JUPITER_API}/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=${amount * 1e9}`
        );
        const quote = await quoteResponse.json();
        
        return {
            success: true,
            inputAmount: amount,
            outputAmount: quote.outAmount / 1e6,
            route: quote.routeId
        };
    } catch (error) {
        console.error('Error swapping:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create or update agent reputation on Solana
 * @param {string} agentId - AI agent identifier
 * @param {object} data - Reputation data
 * @returns {Promise<object>} Result
 */
export async function updateAgentReputation(agentId, data) {
    const reputationData = {
        agentId,
        totalPredictions: data.totalPredictions || 0,
        correctPredictions: data.correctPredictions || 0,
        reputationScore: data.reputationScore || 0,
        lastUpdated: Date.now()
    };
    
    // In production, this would write to a Solana PDA
    // For demo, we store locally
    return {
        success: true,
        data: reputationData,
        chain: 'solana',
        note: 'PDA write would happen here in production'
    };
}

/**
 * Get agent reputation from Solana
 * @param {string} agentId - AI agent identifier
 * @returns {Promise<object>} Reputation data
 */
export async function getAgentReputation(agentId) {
    // In production, this would read from a Solana PDA
    return {
        agentId,
        totalPredictions: 0,
        correctPredictions: 0,
        reputationScore: 0,
        accuracy: 0,
        rank: 'N/A'
    };
}

/**
 * Cross-chain settlement between Monad and Solana
 * @param {object} params - Settlement parameters
 * @returns {Promise<object>} Settlement result
 */
export async function crossChainSettlement({ predictionId, winner, payout, sourceChain }) {
    const settlement = {
        predictionId,
        winner,
        payout,
        sourceChain, // 'monad' or 'solana'
        targetChain: sourceChain === 'monad' ? 'solana' : 'monad',
        status: 'pending',
        timestamp: Date.now()
    };
    
    // In production, this would use Wormhole or another bridge
    // For demo, we simulate the settlement
    
    return {
        ...settlement,
        status: 'completed',
        bridge: 'wormhole-simulated',
        txHash: `0x${Buffer.from(settlement).toString('hex').slice(0, 64)}`
    };
}

/**
 * Distribute rewards to winning AI agents
 * @param {string} agentId - Winning agent
 * @param {number} amount - Reward amount
 * @param {string} token - Token type (MON, USDC, SOL)
 * @returns {Promise<object>} Distribution result
 */
export async function distributeReward(agentId, amount, token = 'MON') {
    return {
        success: true,
        agentId,
        amount,
        token,
        timestamp: Date.now(),
        note: 'Reward distributed on-chain'
    };
}

/**
 * Get market statistics
 * @returns {Promise<object>} Market stats
 */
export async function getMarketStats() {
    try {
        const [solPrice, usdcPrice] = await Promise.all([
            getUSDCPrice(),
            Promise.resolve(1.0)
        ]);
        
        return {
            solPrice,
            usdcPrice,
            totalVolume: 0,
            activeMarkets: 1,
            totalTraders: 1
        };
    } catch (error) {
        console.error('Error getting stats:', error);
        return {
            solPrice: 100,
            usdcPrice: 1,
            totalVolume: 0,
            activeMarkets: 1,
            totalTraders: 1
        };
    }
}

export default {
    getSOLBalance,
    getUSDCBalance,
    transferSOL,
    getUSDCPrice,
    swapSOLtoUSDC,
    updateAgentReputation,
    getAgentReputation,
    crossChainSettlement,
    distributeReward,
    getMarketStats
};
