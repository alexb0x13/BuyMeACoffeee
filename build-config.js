// Script to generate config.js during build time
const fs = require('fs');
const path = require('path');

try {
    console.log('Starting build configuration generation...');
    
    // Read environment variables or use defaults
    const mainnetChainId = process.env.NEXT_PUBLIC_MAINNET_CHAIN_ID || '0x1';
    // Use the existing YOUR_LOCAL_INFURA_KEY environment variable
    const infuraKey = process.env.YOUR_LOCAL_INFURA_KEY || 'YOUR_INFURA_KEY';
    const mainnetRpcUrl = `https://mainnet.infura.io/v3/${infuraKey}`;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xA14B62b2EfC2fdA913A6c025705432c6B35c6Cf0';
    const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS || '0x1A620655adbd8a4A25bF5F471a3D8F0a5d946570';
    const gasLimit = process.env.NEXT_PUBLIC_GAS_LIMIT || '300000';
    const gasPrice = process.env.NEXT_PUBLIC_GAS_PRICE || '10000000000'; // 10 Gwei
    
    console.log('Environment variables processed successfully');
    console.log(`Using Chain ID: ${mainnetChainId}`);
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Owner Address: ${ownerAddress}`);
    console.log(`Gas Limit: ${gasLimit}`);
    console.log(`Gas Price: ${gasPrice}`);
    
    // Log only if we have an Infura key (don't show the actual key)
    if (process.env.YOUR_LOCAL_INFURA_KEY) {
        console.log('Found Infura key in environment variables');
    } else {
        console.log('WARNING: Using placeholder Infura key');
    }

    // Create the configuration content
    const configContent = `// Configuration file generated during build
    window.CONFIG = {
        // Network Configuration
        MAINNET_CHAIN_ID: '${mainnetChainId}',
        MAINNET_RPC_URL: '${mainnetRpcUrl}',
        
        // Contract Addresses
        CONTRACT_ADDRESS: '${contractAddress}',
        OWNER_ADDRESS: '${ownerAddress}',
        
        // Other settings
        DEFAULT_GAS_LIMIT: '${gasLimit}',
        GAS_PRICE: '${gasPrice}'
    };
    `;

    // Write to config.js
    fs.writeFileSync('./config.js', configContent);

    console.log('✅ Config file generated successfully');
} catch (error) {
    console.error('Error generating config file:', error);
    process.exit(1); // Exit with error code
}
