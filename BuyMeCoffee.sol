// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title BuyMeCoffee contract
 * @dev Allows users to send ETH as coffee donations to the contract owner
 */
contract BuyMeCoffee {
    // Address of the contract owner
    address payable public owner;
    
    // Coffee sizes and prices
    enum CoffeeSize { Small, Medium, Large }
    
    mapping(CoffeeSize => uint256) public coffeePrices;
    
    // Minimum amount for coffee
    uint256 public constant MINIMUM_COFFEE = 0.0001 ether;
    
    // Maximum number of stored coffees to prevent DoS
    uint256 public constant MAX_STORED_COFFEES = 100;
    
    // Maximum quantity per transaction
    uint256 public constant MAX_QUANTITY = 100;
    
    // Reentrancy guard
    bool private locked;
    
    // Event emitted when a new coffee is bought
    event NewCoffee(
        address indexed from,
        uint256 timestamp,
        string name,
        string message,
        CoffeeSize size,
        uint256 quantity
    );

    // Coffee structure
    struct Coffee {
        address from;
        uint256 timestamp;
        string name;
        string message;
        CoffeeSize size;
        uint256 quantity;
    }

    // List of all coffees received
    Coffee[] public coffees;

    // Modifier to prevent reentrancy
    modifier nonReentrant() {
        require(!locked, "No reentrancy");
        locked = true;
        _;
        locked = false;
    }

    /**
     * @dev Constructor to initialize the contract
     */
    constructor() {
        owner = payable(msg.sender);
        
        // Set the prices for different coffee sizes (in ETH)
        coffeePrices[CoffeeSize.Small] = 0.001 ether;
        coffeePrices[CoffeeSize.Medium] = 0.003 ether;
        coffeePrices[CoffeeSize.Large] = 0.005 ether;
    }

    /**
     * @dev Buy a coffee for the contract owner with size and quantity
     * @param _size Size of coffee (Small, Medium, Large)
     * @param _quantity Number of coffees to purchase (1-100)
     * @param _name Name of the coffee buyer
     * @param _message Message from the coffee buyer
     */
    function buyCoffee(
        CoffeeSize _size,
        uint256 _quantity,
        string memory _name,
        string memory _message
    ) public payable {
        require(_quantity > 0 && _quantity <= MAX_QUANTITY, "Invalid quantity");
        require(msg.value >= coffeePrices[_size] * _quantity, "Insufficient ETH sent");
        require(bytes(_name).length <= 50, "Name too long");
        require(bytes(_message).length <= 500, "Message too long");
        
        // Store only limited number of coffees to prevent DoS
        if (coffees.length < MAX_STORED_COFFEES) {
            coffees.push(Coffee(
                msg.sender,
                block.timestamp,
                _name,
                _message,
                _size,
                _quantity
            ));
        }
        
        emit NewCoffee(msg.sender, block.timestamp, _name, _message, _size, _quantity);
    }
    
    /**
     * @dev Simple version to buy a coffee with default name and message
     * @param _size Size of coffee (Small, Medium, Large)
     * @param _quantity Number of coffees to purchase (1-100)
     */
    function buyCoffeeSimple(
        CoffeeSize _size,
        uint256 _quantity
    ) public payable {
        buyCoffee(_size, _quantity, "Anonymous", "Enjoy your coffee!");
    }
    
    /**
     * @dev Legacy function for compatibility
     */
    function buyCoffee() public payable {
        require(msg.value >= MINIMUM_COFFEE, "Coffee costs at least 0.0001 ETH!");
        
        // Default to small coffee with quantity of 1
        CoffeeSize size = CoffeeSize.Small;
        uint256 quantity = 1;
        
        // Store only limited number of coffees to prevent DoS
        if (coffees.length < MAX_STORED_COFFEES) {
            coffees.push(Coffee(
                msg.sender,
                block.timestamp,
                "Anonymous",
                "Enjoy your coffee!",
                size,
                quantity
            ));
        }
        
        emit NewCoffee(msg.sender, block.timestamp, "Anonymous", "Enjoy your coffee!", size, quantity);
    }
    
    /**
     * @dev Get all the coffees sent to the contract
     */
    function getCoffees() public view returns (Coffee[] memory) {
        return coffees;
    }
    
    /**
     * @dev Get the current balance of the contract
     */
    function getBalance() public view returns (uint256) {
        require(msg.sender == owner, "Only the owner can check balance");
        return address(this).balance;
    }
    
    /**
     * @dev Allow the owner to withdraw all the ETH from the contract
     * Following Checks-Effects-Interactions pattern for security
     * Also uses nonReentrant modifier to prevent reentrancy attacks
     */
    function withdraw() public nonReentrant {
        require(msg.sender == owner, "Only the owner can withdraw");
        require(address(this).balance > 0, "No funds to withdraw");
        
        uint256 amount = address(this).balance;
        
        // Clear the balance first (effect) before transfer (interaction)
        // This helps prevent reentrancy attacks
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Failed to withdraw");
    }
    
    /**
     * @dev Accepts plain ETH transfers and emits a NewCoffee event with default values
     * This allows users to send ETH directly to the contract without calling a specific function
     */
    receive() external payable {
        require(msg.value >= MINIMUM_COFFEE, "Amount sent is less than minimum coffee price");
        
        // Default to small coffee with quantity of 1
        CoffeeSize size = CoffeeSize.Small;
        uint256 quantity = 1;
        
        // Store only limited number of coffees to prevent DoS
        if (coffees.length < MAX_STORED_COFFEES) {
            coffees.push(Coffee(
                msg.sender,
                block.timestamp,
                "Anonymous",
                "Thanks for the coffee!",
                size,
                quantity
            ));
        }
        
        emit NewCoffee(msg.sender, block.timestamp, "Anonymous", "Thanks for the coffee!", size, quantity);
    }
}