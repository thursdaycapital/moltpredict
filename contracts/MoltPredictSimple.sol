// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MoltPredict {
    address public owner;
    uint256 public feePercent = 2;
    
    struct Market {
        uint256 id;
        string title;
        uint256 totalPool;
        uint256 endTime;
        bool resolved;
        string result;
        address creator;
    }
    
    Market[] public markets;
    mapping(uint256 => uint256) public totalYesBets;
    mapping(uint256 => uint256) public totalNoBets;
    mapping(uint256 => mapping(address => uint256)) public yesBets;
    mapping(uint256 => mapping(address => uint256)) public noBets;
    
    event MarketCreated(uint256 indexed id, string title, address creator, uint256 endTime);
    event BetPlaced(uint256 indexed id, address indexed bettor, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed id, string result);
    
    constructor() {
        owner = msg.sender;
    }
    
    function createMarket(string memory title, uint256 duration) external returns (uint256) {
        markets.push(Market({
            id: markets.length + 1,
            title: title,
            totalPool: 0,
            endTime: block.timestamp + duration,
            resolved: false,
            result: "",
            creator: msg.sender
        }));
        
        emit MarketCreated(markets.length, title, msg.sender, markets[markets.length - 1].endTime);
        return markets.length;
    }
    
    function betYes(uint256 marketId) external payable {
        require(marketId <= markets.length && marketId > 0, "Invalid market");
        Market storage m = markets[marketId - 1];
        require(!m.resolved && block.timestamp < m.endTime, "Market closed");
        require(msg.value > 0, "No bet");
        
        m.totalPool += msg.value;
        totalYesBets[marketId] += msg.value;
        yesBets[marketId][msg.sender] += msg.value;
        
        emit BetPlaced(marketId, msg.sender, true, msg.value);
    }
    
    function betNo(uint256 marketId) external payable {
        require(marketId <= markets.length && marketId > 0, "Invalid market");
        Market storage m = markets[marketId - 1];
        require(!m.resolved && block.timestamp < m.endTime, "Market closed");
        require(msg.value > 0, "No bet");
        
        m.totalPool += msg.value;
        totalNoBets[marketId] += msg.value;
        noBets[marketId][msg.sender] += msg.value;
        
        emit BetPlaced(marketId, msg.sender, false, msg.value);
    }
    
    function resolveMarket(uint256 marketId, string memory result) external {
        require(marketId <= markets.length && marketId > 0, "Invalid market");
        Market storage m = markets[marketId - 1];
        require(msg.sender == m.creator, "Only creator");
        require(!m.resolved && block.timestamp >= m.endTime, "Not ready");
        
        m.resolved = true;
        m.result = result;
        
        uint256 fee = m.totalPool * feePercent / 100;
        uint256 pool = m.totalPool - fee;
        
        if (keccak256(abi.encodePacked(result)) == keccak256(abi.encodePacked("Yes")) && totalYesBets[marketId] > 0) {
            // Pay yes bettors
            for (uint256 i = 0; i < markets.length; i++) {
                address bettor = payable(address(uint160(i + 1)));
                if (yesBets[marketId][bettor] > 0) {
                    uint256 share = yesBets[marketId][bettor] * pool / totalYesBets[marketId];
                    (bool success,) = bettor.call{value: share}("");
                    success;
                }
            }
        } else if (totalNoBets[marketId] > 0) {
            // Pay no bettors
            for (uint256 i = 0; i < markets.length; i++) {
                address bettor = payable(address(uint160(i + 1)));
                if (noBets[marketId][bettor] > 0) {
                    uint256 share = noBets[marketId][bettor] * pool / totalNoBets[marketId];
                    (bool success,) = bettor.call{value: share}("");
                    success;
                }
            }
        }
        
        // Fee to owner
        (bool success,) = owner.call{value: fee}("");
        success;
        
        emit MarketResolved(marketId, result);
    }
    
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }
}
