// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * MoltPredict Smart Contract
 * 
 * Prediction market contract for Monad blockchain.
 * Handles market creation, betting, and resolution.
 */

contract MoltPredict {
    
    // State variables
    address public owner;
    uint256 public platformFeePercent = 2; // 2% platform fee
    
    // Market structure
    struct Market {
        uint256 id;
        string title;
        string description;
        MarketType marketType;
        address creator;
        uint256 totalPool;
        uint256 endDate;
        MarketStatus status;
        string resolution; // Outcome ID or value
        string resolutionReason;
        uint256 createdAt;
    }
    
    // Prediction structure
    struct Prediction {
        uint256 id;
        uint256 marketId;
        address predictor;
        string outcomeId; // For binary/categorical
        uint256 amount; // In wei
        uint256 timestamp;
    }
    
    // Outcome structure
    struct Outcome {
        string id;
        string name;
        uint256 totalBets;
    }
    
    enum MarketType { Binary, Categorical, Scalar }
    enum MarketStatus { Open, Resolved, Cancelled }
    
    // Mappings
    mapping(uint256 => Market) public markets;
    mapping(uint256 => Prediction[]) public marketPredictions;
    mapping(uint256 => Outcome[]) public marketOutcomes;
    mapping(address => uint256[]) public userPredictions;
    
    // Counters
    uint256 private marketCounter = 0;
    
    // Events
    event MarketCreated(uint256 indexed marketId, string title, address creator);
    event PredictionPlaced(uint256 indexed marketId, address predictor, string outcomeId, uint256 amount);
    event MarketResolved(uint256 indexed marketId, string resolution);
    event WinningsDistributed(uint256 indexed marketId, address winner, uint256 amount);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier marketExists(uint256 marketId) {
        require(marketId > 0 && marketId <= marketCounter, "Market does not exist");
        _;
    }
    
    modifier marketOpen(uint256 marketId) {
        require(markets[marketId].status == MarketStatus.Open, "Market is not open");
        require(block.timestamp < markets[marketId].endDate, "Market has ended");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
    }
    
    // Create a new binary market
    function createBinaryMarket(
        string memory title,
        string memory description,
        uint256 duration
    ) external returns (uint256) {
        return _createMarket(
            title,
            description,
            MarketType.Binary,
            duration,
            new string[](0)
        );
    }
    
    // Create a new categorical market
    function createCategoricalMarket(
        string memory title,
        string memory description,
        uint256 duration,
        string[] memory outcomeNames
    ) external returns (uint256) {
        require(outcomeNames.length >= 2, "Need at least 2 outcomes");
        return _createMarket(
            title,
            description,
            MarketType.Categorical,
            duration,
            outcomeNames
        );
    }
    
    // Internal market creation
    function _createMarket(
        string memory title,
        string memory description,
        MarketType marketType,
        uint256 duration,
        string[] memory outcomeNames
    ) internal returns (uint256) {
        marketCounter++;
        uint256 newMarketId = marketCounter;
        
        Market storage market = markets[newMarketId];
        market.id = newMarketId;
        market.title = title;
        market.description = description;
        market.marketType = marketType;
        market.creator = msg.sender;
        market.totalPool = 0;
        market.endDate = block.timestamp + duration;
        market.status = MarketStatus.Open;
        market.createdAt = block.timestamp;
        
        // Initialize outcomes
        if (marketType == MarketType.Binary) {
            marketOutcomes[newMarketId].push(Outcome("yes", "Yes", 0));
            marketOutcomes[newMarketId].push(Outcome("no", "No", 0));
        } else if (marketType == MarketType.Categorical) {
            for (uint256 i = 0; i < outcomeNames.length; i++) {
                marketOutcomes[newMarketId].push(Outcome(
                    _toString(i),
                    outcomeNames[i],
                    0
                ));
            }
        }
        
        emit MarketCreated(newMarketId, title, msg.sender);
        
        return newMarketId;
    }
    
    // Place a prediction/bet
    function predict(
        uint256 marketId,
        string memory outcomeId,
        uint256 amount
    ) external payable marketExists(marketId) marketOpen(marketId) {
        require(msg.value >= amount, "Insufficient funds");
        
        Market storage market = markets[marketId];
        market.totalPool += amount;
        
        // Update outcome total
        Outcome[] storage outcomes = marketOutcomes[marketId];
        for (uint256 i = 0; i < outcomes.length; i++) {
            if (keccak256(abi.encodePacked(outcomes[i].id)) == keccak256(abi.encodePacked(outcomeId))) {
                outcomes[i].totalBets += amount;
                break;
            }
        }
        
        // Record prediction
        uint256 predictionId = marketPredictions[marketId].length;
        marketPredictions[marketId].push(Prediction(
            predictionId,
            marketId,
            msg.sender,
            outcomeId,
            amount,
            block.timestamp
        ));
        
        userPredictions[msg.sender].push(predictionId);
        
        emit PredictionPlaced(marketId, msg.sender, outcomeId, amount);
    }
    
    // Resolve market (only creator)
    function resolveMarket(
        uint256 marketId,
        string memory resolution,
        string memory reason
    ) external marketExists(marketId) {
        Market storage market = markets[marketId];
        require(msg.sender == market.creator, "Only creator can resolve");
        require(market.status == MarketStatus.Open, "Market already resolved");
        
        market.status = MarketStatus.Resolved;
        market.resolution = resolution;
        market.resolutionReason = reason;
        
        emit MarketResolved(marketId, resolution);
        
        // Distribute winnings
        _distributeWinnings(marketId, resolution);
    }
    
    // Internal function to distribute winnings
    function _distributeWinnings(uint256 marketId, string memory winningOutcome) internal {
        Market storage market = markets[marketId];
        Prediction[] storage predictions = marketPredictions[marketId];
        
        // Calculate total winning bets
        uint256 totalWinningBets = 0;
        for (uint256 i = 0; i < predictions.length; i++) {
            if (keccak256(abi.encodePacked(predictions[i].outcomeId)) == keccak256(abi.encodePacked(winningOutcome))) {
                totalWinningBets += predictions[i].amount;
            }
        }
        
        require(totalWinningBets > 0, "No winning bets");
        
        uint256 totalPool = market.totalPool;
        uint256 platformFee = (totalPool * platformFeePercent) / 100;
        uint256 winnerPool = totalPool - platformFee;
        
        // Distribute to winners proportionally
        for (uint256 i = 0; i < predictions.length; i++) {
            if (keccak256(abi.encodePacked(predictions[i].outcomeId)) == keccak256(abi.encodePacked(winningOutcome))) {
                uint256 share = (predictions[i].amount * winnerPool) / totalWinningBets;
                payable(predictions[i].predictor).transfer(share);
                emit WinningsDistributed(marketId, predictions[i].predictor, share);
            }
        }
        
        // Transfer platform fee to owner
        if (platformFee > 0) {
            payable(owner).transfer(platformFee);
        }
    }
    
    // Get market details
    function getMarket(uint256 marketId) external view returns (
        uint256 id,
        string memory title,
        string memory description,
        MarketType marketType,
        address creator,
        uint256 totalPool,
        uint256 endDate,
        MarketStatus status,
        string memory resolution,
        uint256 createdAt,
        uint256 predictionCount
    ) {
        Market storage market = markets[marketId];
        return (
            market.id,
            market.title,
            market.description,
            market.marketType,
            market.creator,
            market.totalPool,
            market.endDate,
            market.status,
            market.resolution,
            market.createdAt,
            marketPredictions[marketId].length
        );
    }
    
    // Get market outcomes
    function getOutcomes(uint256 marketId) external view returns (Outcome[] memory) {
        return marketOutcomes[marketId];
    }
    
    // Get user predictions
    function getUserPredictions(address user) external view returns (uint256[] memory) {
        return userPredictions[user];
    }
    
    // Get total markets count
    function getMarketsCount() external view returns (uint256) {
        return marketCounter;
    }
    
    // Update platform fee (only owner)
    function setPlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 10, "Fee too high"); // Max 10%
        platformFeePercent = newFeePercent;
    }
    
    // Emergency withdraw (only owner)
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    // Helper function to convert uint to string
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (temp != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + temp % 10));
            temp /= 10;
        }
        return string(buffer);
    }
    
    // Fallback function
    receive() external payable {}
}
