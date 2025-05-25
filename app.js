// Contract ABI - updated for coffee sizes and quantities
const CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "enum BuyMeCoffee.CoffeeSize", "name": "_size", "type": "uint8"},
            {"internalType": "uint256", "name": "_quantity", "type": "uint256"},
            {"internalType": "string", "name": "_name", "type": "string"},
            {"internalType": "string", "name": "_message", "type": "string"}
        ],
        "name": "buyCoffee",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "enum BuyMeCoffee.CoffeeSize", "name": "_size", "type": "uint8"},
            {"internalType": "uint256", "name": "_quantity", "type": "uint256"}
        ],
        "name": "buyCoffeeSimple",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getBalance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "enum BuyMeCoffee.CoffeeSize", "name": "", "type": "uint8"}],
        "name": "coffeePrices",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Configuration - supports both Vercel environment variables and local config.js
const config = window.CONFIG || {
    // Fallback to Vercel environment variables if available
    MAINNET_CHAIN_ID: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAINNET_CHAIN_ID || '0x1',
    MAINNET_RPC_URL: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAINNET_RPC_URL || '',
    CONTRACT_ADDRESS: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xA14B62b2EfC2fdA913A6c025705432c6B35c6Cf0',
    OWNER_ADDRESS: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OWNER_ADDRESS || '0x1A620655adbd8a4A25bF5F471a3D8F0a5d946570'
};

const { 
    MAINNET_CHAIN_ID, 
    MAINNET_RPC_URL,
    CONTRACT_ADDRESS: contractAddress,
    OWNER_ADDRESS: ownerAddress 
} = config;

// Current connected account
let currentAccount = null;

// Track if current user is the owner
let isOwner = false;

// DOM Elements
let connectButton, walletStatus, contractBalance, contractBalanceContainer, buyButton, coffeeSizeSelect,
    coffeeQuantity, totalPrice, increaseBtn, decreaseBtn, transactionStatus, getBalanceButton, withdrawButton,
    videoElement, videoContainer, videoOverlay, ownerControls;

// Coffee sizes and prices in ETH
const COFFEE_SIZES = {
    small: { name: "Small", price: 0.001 },
    medium: { name: "Medium", price: 0.003 },
    large: { name: "Large", price: 0.005 }
};

// ETH price in USD
let ethPriceUSD = 2000; // Default fallback price if API fails

// Currently selected coffee size
let selectedCoffeeSize = "small";

// Current quantity of coffees
let currentQuantity = 1;

// Maximum number of coffees
const MAX_COFFEE_QUANTITY = 100;

// Fetch the current ETH price
async function fetchEthPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        if (data && data.ethereum && data.ethereum.usd) {
            ethPriceUSD = data.ethereum.usd;
            console.log(`Current ETH price: $${ethPriceUSD}`);
            // Update displayed prices
            updateCoffeePricesDisplay();
        }
    } catch (error) {
        console.error('Error fetching ETH price:', error);
        // Continue with default price
    }
}

// Convert ETH to USD
function ethToUSD(ethAmount) {
    return (ethAmount * ethPriceUSD).toFixed(2);
}

// Update all displayed prices
function updateCoffeePricesDisplay() {
    // Update the prices in the coffee options
    for (const size in COFFEE_SIZES) {
        const priceElement = document.querySelector(`#${size}-coffee .coffee-details p`);
        if (priceElement) {
            const ethPrice = COFFEE_SIZES[size].price;
            const usdPrice = ethToUSD(ethPrice);
            priceElement.textContent = `${ethPrice} ETH ($${usdPrice})`;
        }
    }
    
    // Update the selected coffee text if it exists
    if (selectedCoffeeSize) {
        const selectedText = document.getElementById('selected-coffee');
        if (selectedText) {
            const info = COFFEE_SIZES[selectedCoffeeSize];
            const usdPrice = ethToUSD(info.price);
            selectedText.textContent = `Selected: ${info.name} (${info.price} ETH | $${usdPrice})`;
        }
    }
    
    // Also update the total price
    updateTotalPrice();
}

// Initialize DOM elements
function initDomElements() {
    console.log("Initializing DOM elements...");
    
    try {
        // Get all the main UI elements
        connectButton = document.getElementById('connect-button');
        walletStatus = document.getElementById('wallet-status');
        contractBalance = document.getElementById('contract-balance');
        contractBalanceContainer = document.getElementById('contract-balance-container');
        buyButton = document.getElementById('buy-coffee-button');
        coffeeSizeSelect = document.getElementById('coffee-size');
        coffeeQuantity = document.getElementById('coffee-quantity');
        totalPrice = document.getElementById('total-price');
        increaseBtn = document.getElementById('increase-coffee');
        decreaseBtn = document.getElementById('decrease-coffee');
        transactionStatus = document.getElementById('transaction-status');
        getBalanceButton = document.getElementById('get-balance-button');
        withdrawButton = document.getElementById('withdraw-button');
        ownerControls = document.getElementById('owner-controls');
        
        // Set up connect button
        if (connectButton) {
            connectButton.addEventListener('click', connectWallet);
            console.log("Connect button event listener added");
        }
        
        // Set up other button listeners
        if (buyButton) {
            buyButton.addEventListener('click', buyCoffee);
        }
        if (getBalanceButton) {
            getBalanceButton.addEventListener('click', getBalance);
        }
        if (withdrawButton) {
            withdrawButton.addEventListener('click', withdraw);
        }
        if (increaseBtn) {
            increaseBtn.addEventListener('click', increaseCoffeeQuantity);
        }
        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', decreaseCoffeeQuantity);
        }
        
        // Set up coffee size selection
        const coffeeOptions = document.querySelectorAll('.coffee-option');
        coffeeOptions.forEach(option => {
            option.addEventListener('click', function() {
                const size = this.id.replace('-coffee', ''); // e.g., 'small-coffee' -> 'small'
                selectCoffeeSize(size);
            });
        });
        
        // Select small coffee by default
        selectCoffeeSize('small');
        
        console.log("DOM elements initialized");
    } catch (error) {
        console.error("Error initializing DOM elements:", error);
    }
    
    // Initialize video
    initVideo();
}

// Handle video loading
function handleVideoLoad() {
    if (videoElement) {
        videoElement.classList.add('loaded');
    }
    if (videoContainer) {
        videoContainer.classList.add('visible');
    }
    if (videoOverlay) {
        videoOverlay.classList.add('visible');
    }
    document.body.classList.remove('loading');
    document.body.classList.add('loaded');
}

// Initialize video
function initVideo() {
    videoElement = document.getElementById('coffeeVideo');
    videoContainer = document.querySelector('.video-background');
    videoOverlay = document.querySelector('.video-overlay');
    
    if (videoElement) {
        // Set initial state
        videoElement.classList.add('loading');
        
        // Handle when video can play
        const onVideoReady = () => {
            videoElement.classList.remove('loading');
            videoElement.classList.add('loaded');
            if (videoContainer) videoContainer.classList.add('visible');
            if (videoOverlay) videoOverlay.classList.add('visible');
            document.body.classList.remove('loading');
            document.body.classList.add('loaded');
            
            // Clean up event listeners
            videoElement.removeEventListener('canplay', onVideoReady);
            videoElement.removeEventListener('loadeddata', onVideoReady);
        };
        
        // Add event listeners
        videoElement.addEventListener('canplay', onVideoReady);
        videoElement.addEventListener('loadeddata', onVideoReady);
        
        // Fallback in case events don't fire
        setTimeout(() => {
            if (!videoElement.classList.contains('loaded')) {
                onVideoReady();
            }
        }, 2000);
    } else {
        // If no video element, still remove loading state
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');
    }
    // Coffee size elements
    const smallCoffee = document.getElementById('small-coffee');
    const mediumCoffee = document.getElementById('medium-coffee');
    const largeCoffee = document.getElementById('large-coffee');
    const selectedCoffeeText = document.getElementById('selected-coffee');
    
    // Quantity selector elements
    const coffeeQuantityEl = document.getElementById('coffee-quantity');
    const increaseBtn = document.getElementById('increase-coffee');
    const decreaseBtn = document.getElementById('decrease-coffee');
    const totalPrice = document.getElementById('total-price');
    
    // Add event listeners for coffee size buttons (only if elements exist)
    if (smallCoffee) {
        smallCoffee.addEventListener('click', () => selectCoffeeSize('small'));
    }
    if (mediumCoffee) {
        mediumCoffee.addEventListener('click', () => selectCoffeeSize('medium'));
    }
    if (largeCoffee) {
        largeCoffee.addEventListener('click', () => selectCoffeeSize('large'));
    }
    
    // Add event listeners for quantity buttons
    increaseBtn.addEventListener('click', increaseCoffeeQuantity);
    decreaseBtn.addEventListener('click', decreaseCoffeeQuantity);
    
    // Add event listeners for contract buttons
    // Note: connectButton is added in initDomElements already
    // Get the buy coffee button properly
    const buyCoffeeButton = buyButton || document.getElementById('buy-coffee-button');
    if (buyCoffeeButton) {
        buyCoffeeButton.addEventListener('click', buyCoffee);
    }
    
    // Add event listeners for owner-only buttons
    getBalanceButton.addEventListener('click', () => {
        console.log("Get Balance button clicked");
        getBalance();
    });
    
    withdrawButton.addEventListener('click', () => {
        console.log("Withdraw button clicked");
        withdraw();
    });
    
    // Set initial selected coffee
    selectCoffeeSize('small');
    
    // Initially hide owner-only controls
    getBalanceButton.style.display = 'none';
    withdrawButton.style.display = 'none';
}

// Increase coffee quantity
function increaseCoffeeQuantity() {
    if (currentQuantity < MAX_COFFEE_QUANTITY) {
        currentQuantity++;
        updateQuantityDisplay();
    }
}

// Decrease coffee quantity
function decreaseCoffeeQuantity() {
    if (currentQuantity > 1) {
        currentQuantity--;
        updateQuantityDisplay();
    }
}

// Update the quantity display and total price
function updateQuantityDisplay() {
    const quantityElement = document.getElementById('coffee-quantity');
    if (quantityElement) {
        quantityElement.textContent = currentQuantity;
    }
    
    updateTotalPrice();
}

// Update the total price based on coffee size and quantity
function updateTotalPrice() {
    const totalPriceElement = document.getElementById('total-price');
    if (!totalPriceElement) return;
    
    const coffeeInfo = COFFEE_SIZES[selectedCoffeeSize];
    if (!coffeeInfo) return;
    
    const totalEthPrice = (coffeeInfo.price * currentQuantity).toFixed(5);
    const totalUsdPrice = ethToUSD(coffeeInfo.price * currentQuantity);
    
    totalPriceElement.textContent = `${totalEthPrice} ETH | $${totalUsdPrice}`;
}

// Select coffee size
function selectCoffeeSize(size) {
    console.log("Selecting coffee size:", size);
    if (!COFFEE_SIZES[size]) {
        console.error("Invalid coffee size:", size);
        return;
    }
    
    // Only proceed if wallet is connected or if we're initializing
    if (!currentAccount && document.querySelectorAll('.coffee-option.selected').length > 0) {
        console.log("Wallet not connected, but allowing initial selection");
    }
    
    // Update the selected size
    selectedCoffeeSize = size;
    
    // Update the UI to show the selected size
    const coffeeOptions = document.querySelectorAll('.coffee-option');
    coffeeOptions.forEach(option => {
        if (option.id === `${size}-coffee`) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // Update the selected coffee text
    const selectedCoffeeText = document.getElementById('selected-coffee');
    if (selectedCoffeeText) {
        const coffeeInfo = COFFEE_SIZES[size];
        selectedCoffeeText.textContent = 
            `Selected: ${size.charAt(0).toUpperCase() + size.slice(1)} (${coffeeInfo.price} ETH | $${ethToUSD(coffeeInfo.price)})`;
    }
    
    // Update the total price based on the new selection
    updateTotalPrice();
}

// Initialize the application
async function init() {
    console.log("Initializing app...");
    
    // Initialize all DOM elements and set up event listeners
    initDomElements();
    
    // Fetch ETH price first so we can display USD prices
    await fetchEthPrice();
    
    console.log("Checking for ethereum provider:", window.ethereum);

    // Check if MetaMask is installed
    if (window.ethereum) {
        console.log("MetaMask is installed!");
        
        // Check network first
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== MAINNET_CHAIN_ID) {
                walletStatus.textContent = "Please switch to Ethereum Mainnet";
                showTransactionStatus("This dApp requires Ethereum Mainnet. Please connect to Mainnet.", "warning");
                disableContractButtons(true);
            }
            
            // Check if we're already connected
            window.ethereum.request({ method: 'eth_accounts' })
                .then(handleAccountsChanged)
                .catch(err => {
                    console.error("Error checking accounts:", err);
                });

            // Listen for account and chain changes
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', (chainId) => {
                window.location.reload();
            });
            
        } catch (error) {
            console.error("Error initializing:", error);
            showTransactionStatus("Error initializing dApp. Please refresh the page.", "error");
        }
    } else {
        console.log("Please install MetaMask!");
        walletStatus.textContent = "MetaMask not installed";
        showTransactionStatus("Please install MetaMask to use this dApp!", "error");
        disableContractButtons(true);
    }
}

// Check if connected to Ethereum Mainnet
async function checkNetwork() {
    if (!window.ethereum) {
        console.error('MetaMask not detected');
        return false;
    }
    
    // Ensure MAINNET_CHAIN_ID is properly formatted
    const formattedChainId = typeof MAINNET_CHAIN_ID === 'string' ? 
        MAINNET_CHAIN_ID.startsWith('0x') ? 
            MAINNET_CHAIN_ID : 
            `0x${parseInt(MAINNET_CHAIN_ID).toString(16)}` : 
        `0x${MAINNET_CHAIN_ID.toString(16)}`;
    
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log('Current chain ID:', chainId, 'Expected:', formattedChainId);
        
        if (chainId !== formattedChainId) {
            try {
                // Try to switch to the chain
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: formattedChainId }],
                });
                return true;
            } catch (switchError) {
                // This error code indicates that the chain has not been added to MetaMask
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: formattedChainId,
                                chainName: 'Ethereum Mainnet',
                                nativeCurrency: {
                                    name: 'Ethereum',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: [MAINNET_RPC_URL],
                                blockExplorerUrls: ['https://etherscan.io']
                            }],
                        });
                        return true;
                    } catch (addError) {
                        console.error('Error adding Ethereum Mainnet:', addError);
                        showTransactionStatus('Failed to add Ethereum network. Please add it manually in MetaMask.', 'error');
                        return false;
                    }
                }
                console.error('Error switching to Ethereum Mainnet:', switchError);
                showTransactionStatus('Failed to switch to Ethereum Mainnet. Please switch manually in MetaMask.', 'error');
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Error checking network:', error);
        showTransactionStatus('Error checking network. Please refresh and try again.', 'error');
        return false;
    }
}

// Connect wallet function
async function connectWallet() {
    console.log("Connect button clicked");
    
    try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
            const errorMsg = "Please install MetaMask to use this feature!";
            console.error(errorMsg);
            showTransactionStatus(errorMsg, "error");
            return;
        }
        
        showTransactionStatus("Connecting to wallet...", "loading");
        console.log("Requesting accounts from MetaMask...");
        
        // Check and switch to Mainnet if needed
        const isMainnet = await checkNetwork();
        if (!isMainnet) {
            throw new Error("Please switch to Ethereum Mainnet to use this dApp");
        }
        
        // Request account access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        if (!accounts || accounts.length === 0) {
            throw new Error("No accounts found. Please make sure your wallet is unlocked.");
        }
        
        console.log("Connected accounts:", accounts);
        showTransactionStatus("Connected to wallet!", "success");
        
        // Process the accounts
        handleAccountsChanged(accounts);
        
        // Enable quantity controls if they exist
        if (increaseBtn) increaseBtn.disabled = false;
        if (decreaseBtn) decreaseBtn.disabled = false;
        
        // Set up account and chain change listeners
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', (chainId) => {
            window.location.reload();
        });
        
        console.log("Wallet connection successful");
    } catch (error) {
        const errorMsg = error.message || "Failed to connect to wallet";
        console.error("Error connecting to MetaMask:", error);
        showTransactionStatus(errorMsg, "error");
    }
}

// Process accounts and display wallet status
function handleAccountsChanged(accounts) {
    const body = document.body;
    if (accounts.length === 0) {
        // User has disconnected their wallet
        currentAccount = null;
        isOwner = false;
        walletStatus.textContent = "Wallet not connected";
        
        // Remove wallet-connected class
        body.classList.remove('wallet-connected');
        if (connectButton) {
            connectButton.classList.remove('connected');
            connectButton.textContent = 'Connect Wallet';
        }
        
        // Disable contract interaction
        disableContractButtons(true);
        disableCoffeeSelection(true);
        
        // Hide owner controls
        if (ownerControls) {
            ownerControls.style.display = 'none';
        }
    } else {
        currentAccount = accounts[0];
        
        // Add wallet-connected class and update button
        document.body.classList.add('wallet-connected');
        if (connectButton) {
            connectButton.classList.add('connected');
            connectButton.textContent = 'Connected';
        }
        
        // Check if this is the contract owner
        isOwner = (currentAccount.toLowerCase() === ownerAddress.toLowerCase());
        console.log("Current account:", currentAccount);
        console.log("Owner address:", ownerAddress);
        console.log("Is owner?", isOwner);
        
        // Show the current account
        if (walletStatus) {
            walletStatus.textContent = `Connected: ${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`;
        }
        
        // Show/hide owner controls based on ownership
        if (ownerControls) {
            ownerControls.style.display = isOwner ? 'block' : 'none';
        }
        
        // Enable interaction
        disableContractButtons(false);
        disableCoffeeSelection(false);
        
        // Enable buttons
        disableContractButtons(false);
        disableCoffeeSelection(false);
        
        // Show owner controls if this is the owner
        if (isOwner) {
            getBalanceButton.style.display = 'inline-block';
            withdrawButton.style.display = 'inline-block';
            
            showTransactionStatus("Owner account detected! You can manage the contract.", "info");
        } else {
            getBalanceButton.style.display = 'none';
            withdrawButton.style.display = 'none';
        }
    }
}

// Helper to enable/disable coffee selection
function disableCoffeeSelection(disabled) {
    const coffeeOptions = document.querySelectorAll('.coffee-option');
    coffeeOptions.forEach(option => {
        if (disabled) {
            option.style.pointerEvents = 'none';
            option.style.opacity = '0.5';
        } else {
            option.style.pointerEvents = 'auto';
            option.style.opacity = '1';
        }
    });
}

// Buy coffee function - allows anyone to send ETH
async function buyCoffee() {
    if (!currentAccount) {
        showTransactionStatus("Please connect your wallet first", "error");
        return;
    }
    
    // Get the selected coffee details
    const coffeeInfo = COFFEE_SIZES[selectedCoffeeSize];
    if (!coffeeInfo) {
        showTransactionStatus("Please select a coffee size", "error");
        return;
    }
    
    // Disable buttons during transaction
    disableContractButtons(true);
    disableCoffeeSelection(true);
    
    showTransactionStatus(`Sending ${currentQuantity} ${coffeeInfo.name} coffee transaction...`, "loading");
    
    try {
        // Calculate total price based on quantity
        const unitPrice = coffeeInfo.price;
        const totalPrice = unitPrice * currentQuantity;
        
        // Convert coffee size from string to uint8 for the contract (Small=0, Medium=1, Large=2)
        const coffeeSize = selectedCoffeeSize === 'small' ? 0 : selectedCoffeeSize === 'medium' ? 1 : 2;
        
        console.log(`Buying ${currentQuantity} ${coffeeInfo.name} coffee(s) for ${totalPrice} ETH`);
        console.log(`Contract address: ${contractAddress}`);
        console.log(`Coffee size: ${coffeeSize} (${selectedCoffeeSize})`);
        console.log(`Quantity: ${currentQuantity}`);
        console.log(`Total price in ETH: ${totalPrice}`);
        
        // Use ethers.js to interact with the contract
        // Create a provider and signer
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        // Create a contract instance with minimal ABI
        const minimalABI = [
            {
                "inputs": [
                    {"internalType": "enum BuyMeCoffee.CoffeeSize", "name": "_size", "type": "uint8"},
                    {"internalType": "uint256", "name": "_quantity", "type": "uint256"}
                ],
                "name": "buyCoffeeSimple",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
            }
        ];
        
        const contract = new ethers.Contract(contractAddress, minimalABI, signer);
        
        // Prepare transaction options with value
        const options = { 
            value: ethers.utils.parseEther(totalPrice.toString()),
            gasLimit: window.CONFIG.DEFAULT_GAS_LIMIT || 100000
        };
        
        console.log('Calling buyCoffeeSimple with ethers.js...');
        console.log('Transaction options:', options);
        
        // Show a user message
        alert(`You're about to send ${totalPrice} ETH (about $${ethToUSD(totalPrice)}) to the coffee contract. Please confirm the transaction in MetaMask.`);
        
        // Call buyCoffeeSimple function with proper parameters
        const tx = await contract.buyCoffeeSimple(
            coffeeSize,            // uint8 _size
            currentQuantity,        // uint256 _quantity
            options                 // transaction options with value
        );
        
        console.log('Transaction sent:', tx);
        console.log('Transaction hash:', tx.hash);
        
        // Wait for transaction confirmation
        showTransactionStatus(`Transaction sent! Waiting for confirmation...`, "loading");
        
        // Wait for the transaction to be mined
        const receipt = await tx.wait(1); // wait for 1 confirmation
        
        console.log('Transaction confirmed:', receipt);
        showTransactionStatus(`Thanks for the coffee! Transaction confirmed: ${tx.hash.substring(0, 10)}...`, "success");
        
        // Re-enable the buttons after transaction
        disableContractButtons(false);
        disableCoffeeSelection(false);
    } catch (error) {
        console.error("Error buying coffee:", error);
        showTransactionStatus(`Error: ${error.message || "Transaction failed"}`, "error");
        
        // Re-enable the buttons after error
        disableContractButtons(false);
        disableCoffeeSelection(false);
    }
}

// Get balance function - owner only
async function getBalance() {
    console.log("getBalance function called");
    console.log("Current account:", currentAccount);
    console.log("Owner address:", ownerAddress);
    console.log("Is owner?", isOwner);
    console.log("Contract address:", contractAddress);
    
    if (!currentAccount) {
        showTransactionStatus("Please connect your wallet first", "error");
        return;
    }
    
    // For debugging purposes, let's bypass the owner check temporarily
    // if (!isOwner) {
    //     showTransactionStatus("Only the owner can check the balance", "error");
    //     return;
    // }
    
    showTransactionStatus("Getting contract balance...", "loading");
    
    try {
        // Instead of calling the contract's getBalance function directly,
        // let's just get the ETH balance of the contract address
        const result = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [contractAddress, 'latest']
        });
        
        console.log("Raw balance result:", result);
        
        // Convert hex result to ETH
        const balanceWei = parseInt(result, 16);
        console.log("Balance in Wei:", balanceWei);
        
        const balanceEth = balanceWei / 1e18;
        console.log("Balance in ETH:", balanceEth);
        
        const formattedBalance = balanceEth.toFixed(6);
        
        contractBalance.textContent = `${formattedBalance} ETH`;
        const usdValue = ethToUSD(formattedBalance);
        showTransactionStatus(`Contract balance: ${formattedBalance} ETH ($${usdValue})`, "success");
        
        console.log("Balance updated:", formattedBalance, "ETH");
    } catch (error) {
        console.error("Error getting balance:", error);
        contractBalance.textContent = "Error";
        showTransactionStatus(`Error: ${error.message || "Balance check failed"}`, "error");
    }
}

// Withdraw function - owner only
async function withdraw() {
    console.log("withdraw function called");
    console.log("Current account:", currentAccount);
    console.log("Owner address:", ownerAddress);
    console.log("Is owner?", isOwner);
    console.log("Contract address:", contractAddress);
    
    if (!currentAccount) {
        showTransactionStatus("Please connect your wallet first", "error");
        return;
    }
    
    // For debugging, temporarily bypass owner check
    // if (!isOwner) {
    //     showTransactionStatus("Only the owner can withdraw funds", "error");
    //     return;
    // }
    
    showTransactionStatus("Processing withdrawal...", "loading");
    
    try {
        // First check if there's a balance to withdraw
        await getBalance();
        
        // Create the withdraw transaction with the proper function selector for withdraw()
        // The function selector for withdraw() is the first 4 bytes of keccak256("withdraw()")
        const withdrawSelector = "0x3ccfd60b"; // This is the standard selector for withdraw()
        
        console.log("Using withdraw selector:", withdrawSelector);
        
        const transactionParams = {
            from: currentAccount,
            to: contractAddress,
            data: withdrawSelector
        };
        
        console.log("Transaction params:", transactionParams);
        
        // Send the transaction
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionParams],
        });
        
        showTransactionStatus(`Withdrawal initiated! Transaction: ${txHash.substring(0, 10)}...`, "success");
        console.log("Withdrawal transaction:", txHash);
        
        // After a short delay, check the new balance
        setTimeout(async () => {
            await getBalance();
        }, 3000);
    } catch (error) {
        console.error("Error withdrawing funds:", error);
        showTransactionStatus(`Error: ${error.message || "Withdrawal failed"}`, "error");
    }
}

// Helper function to create function signatures
function createFunctionSignature(functionName) {
    // Simple 4-byte function signature calculation
    // In a real implementation, you would use a library like ethers or web3 for this
    // For now, we're using a few hard-coded signatures for our functions
    if (functionName === "buyCoffee()") {
        return "0x72db799f"; // keccak256("buyCoffee()").slice(0, 8)
    } else if (functionName === "getBalance()") {
        return "0x12065fe0"; // keccak256("getBalance()").slice(0, 8)
    } else if (functionName === "withdraw()") {
        return "0x3ccfd60b"; // keccak256("withdraw()").slice(0, 8)
    }
    return "0x00000000";
}

// Helper function to convert ETH to Wei
function ethToWei(ethAmount) {
    // 1 ETH = 10^18 Wei
    const wei = parseFloat(ethAmount) * Math.pow(10, 18);
    // Convert to hex string with 0x prefix
    return "0x" + Math.floor(wei).toString(16);
}

// Helper function to convert Wei to ETH
function weiToEth(weiAmount) {
    // 1 ETH = 10^18 Wei
    return (parseInt(weiAmount) / Math.pow(10, 18)).toFixed(5);
}

// Helper to show transaction status
function showTransactionStatus(message, type) {
    const statusElement = document.getElementById('transaction-status');
    statusElement.textContent = message;
    statusElement.className = type;
    
    // Auto-hide after 5 seconds
    if (type !== 'loading') {
        setTimeout(() => {
            if (statusElement.textContent === message) {
                statusElement.textContent = '';
                statusElement.className = '';
            }
        }, 5000);
    }
}

// Helper to enable/disable contract buttons
function disableContractButtons(disabled) {
    if (buyButton) buyButton.disabled = disabled;
    if (getBalanceButton) getBalanceButton.disabled = disabled;
    if (withdrawButton) withdrawButton.disabled = disabled;
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements first
    initDomElements();
    
    // Initialize the app
    init();
    
    // Initialize video
    initVideo();
    
    // Update prices and UI
    updateCoffeePricesDisplay();
    updateTotalPrice();
    
    // Start loading the video if element exists
    if (videoElement) {
        videoElement.load();
    } else {
        // If no video, still remove loading state
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');
    }
    
    // Check if already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
        handleAccountsChanged([window.ethereum.selectedAddress]);
    }
});
