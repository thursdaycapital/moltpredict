/**
 * Hardhat Configuration for Monad
 */

require('dotenv').config');

module.exports = {
    solidity: '0.8.19',
    networks: {
        monad: {
            url: process.env.RPC_URL || 'https://rpc.monad.xyz',
            accounts: [process.env.PRIVATE_KEY || '0x648667f6932a1999f1120530b71fe6f323340dbc8a6d5cb5df9b25bed9980f13']
        }
    },
    defaultNetwork: 'monad'
};
