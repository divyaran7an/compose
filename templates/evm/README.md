# EVM Multi-Network Integration Template

A comprehensive template for building applications that support multiple EVM-compatible blockchain networks including Ethereum, Base, Arbitrum, Optimism, and Polygon.

## 🌐 Supported Networks

### Mainnet Networks
- **Ethereum** (Layer 1) - The original blockchain
- **Base** (Layer 2) - Coinbase's Ethereum L2
- **Arbitrum One** (Layer 2) - Optimistic rollup scaling solution
- **Optimism** (Layer 2) - Optimistic rollup by Optimism Foundation
- **Polygon** (Layer 1) - Ethereum-compatible blockchain

### Testnet Networks
- **Ethereum Sepolia** - Ethereum's primary testnet
- **Base Sepolia** - Base testnet for development
- **Arbitrum Sepolia** - Arbitrum testnet
- **Optimism Sepolia** - Optimism testnet
- **Polygon Amoy** - Polygon's testnet

## 🚀 Quick Start

### Prerequisites

1. **MetaMask Wallet**: Install the [MetaMask browser extension](https://metamask.io/download/)
2. **Node.js**: Version 16 or higher
3. **RPC Access**: API keys from providers like Alchemy, Infura, or QuickNode

### Installation

This template is automatically configured when you create a project with the EVM plugin:

```bash
npx capx-compose my-evm-app --plugins=evm
cd my-evm-app
npm install
```

### Environment Configuration

Create a `.env.local` file in your project root with your RPC endpoints:

```env
# Ethereum Networks
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Base Networks
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Arbitrum Networks
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR-API-KEY
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Optimism Networks
NEXT_PUBLIC_OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR-API-KEY
NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL=https://opt-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Polygon Networks
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY
NEXT_PUBLIC_POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR-API-KEY
```

### Start Development

```bash
npm run dev
```

Navigate to `/evm` to see the multi-network demo.

## 🔧 Configuration

### Network Configuration

Networks are configured in `src/config/networks.json`. Each network includes:

- **Chain ID**: Hexadecimal and decimal format
- **RPC URLs**: Default, public, and environment variable references
- **Block Explorers**: For transaction and address lookup
- **Native Currency**: Symbol, name, and decimals
- **Faucets**: For testnet token acquisition
- **Layer Information**: L1 or L2 classification

### Adding Custom Networks

To add a new EVM-compatible network:

1. **Add to networks.json**:
```json
{
  "your-network": {
    "chainId": "0x1234",
    "chainIdDecimal": 4660,
    "name": "Your Network",
    "shortName": "your",
    "nativeCurrency": {
      "name": "Your Token",
      "symbol": "YOUR",
      "decimals": 18
    },
    "rpcUrls": {
      "default": "https://rpc.yournetwork.com",
      "public": "https://public-rpc.yournetwork.com",
      "env": "NEXT_PUBLIC_YOUR_NETWORK_RPC_URL"
    },
    "blockExplorerUrls": ["https://explorer.yournetwork.com"],
    "iconUrls": ["https://icon.yournetwork.com/icon.png"],
    "isTestnet": false,
    "category": "mainnet",
    "layer": "L1",
    "faucets": []
  }
}
```

2. **Add environment variable**:
```env
NEXT_PUBLIC_YOUR_NETWORK_RPC_URL=https://your-rpc-endpoint.com
```

3. **Update networkUtils.ts** (optional):
```typescript
// Add to color map
const colorMap: Record<string, string> = {
  // ... existing networks
  'your-network': '#YOUR_COLOR',
};

// Add to icon map
const iconMap: Record<string, string> = {
  // ... existing networks
  'your-network': '🔶', // Your emoji
};
```

## 🛠 Core Components

### NetworkManager

The `NetworkManager` class handles all network operations:

```typescript
import { networkManager } from '../utils/NetworkManager';

// Get all networks
const networks = networkManager.getAllNetworks();

// Switch to a network
await networkManager.switchToNetwork('base');

// Get current network
const current = networkManager.getCurrentNetwork();

// Check connectivity
const isConnected = await networkManager.validateNetworkConnectivity('ethereum');
```

### Network Utilities

Helper functions for common operations:

```typescript
import {
  formatNativeCurrency,
  getNetworkDisplayName,
  shortenAddress,
  isValidAddress
} from '../utils/networkUtils';

// Format currency with proper symbol
const formatted = formatNativeCurrency('1.5', 'polygon'); // "1.5000 MATIC"

// Get display name
const name = getNetworkDisplayName('base'); // "Base (L2)"

// Shorten address
const short = shortenAddress('0x1234...5678'); // "0x1234...5678"
```

## 💰 Getting Testnet Tokens

### Ethereum Sepolia
- [Alchemy Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
- [Sepolia Faucet](https://sepoliafaucet.com)
- [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

### Base Sepolia
- [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- [Alchemy Base Faucet](https://www.alchemy.com/faucets/base-sepolia)

### Arbitrum Sepolia
- [Alchemy Arbitrum Faucet](https://www.alchemy.com/faucets/arbitrum-sepolia)

### Optimism Sepolia
- [Alchemy Optimism Faucet](https://www.alchemy.com/faucets/optimism-sepolia)

### Polygon Amoy
- [Polygon Faucet](https://faucet.polygon.technology)

## 🌉 Layer 2 Bridges

### Base
- **Official Bridge**: [bridge.base.org](https://bridge.base.org)
- **Supports**: ETH bridging from Ethereum

### Arbitrum
- **Official Bridge**: [bridge.arbitrum.io](https://bridge.arbitrum.io)
- **Supports**: ETH and ERC-20 tokens

### Optimism
- **Official Bridge**: [app.optimism.io/bridge](https://app.optimism.io/bridge)
- **Supports**: ETH and ERC-20 tokens

## 📡 RPC Providers

### Alchemy
- **Website**: [alchemy.com](https://www.alchemy.com)
- **Supports**: All networks in this template
- **Free Tier**: 300M compute units/month

### Infura
- **Website**: [infura.io](https://infura.io)
- **Supports**: Ethereum, Arbitrum, Optimism, Polygon
- **Free Tier**: 100K requests/day

### QuickNode
- **Website**: [quicknode.com](https://www.quicknode.com)
- **Supports**: All networks in this template
- **Free Tier**: Available with limitations

### Public RPCs
Each network includes public RPC endpoints as fallbacks, but these may have rate limits.

## 🔍 Block Explorers

- **Ethereum**: [etherscan.io](https://etherscan.io)
- **Base**: [basescan.org](https://basescan.org)
- **Arbitrum**: [arbiscan.io](https://arbiscan.io)
- **Optimism**: [optimistic.etherscan.io](https://optimistic.etherscan.io)
- **Polygon**: [polygonscan.com](https://polygonscan.com)

## 💡 Usage Examples

### Basic Wallet Connection

```typescript
import { networkManager } from '../utils/NetworkManager';

const connectWallet = async () => {
  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    
    // Get current network
    const network = await networkManager.getCurrentNetworkFromWallet();
    console.log('Connected to:', network?.name);
    
    // Get balance
    const balance = await networkManager.getBalance(accounts[0]);
    console.log('Balance:', balance);
  } catch (error) {
    console.error('Connection failed:', error);
  }
};
```

### Network Switching

```typescript
const switchToBase = async () => {
  try {
    const success = await networkManager.switchToNetwork('base');
    if (success) {
      console.log('Switched to Base network');
    }
  } catch (error) {
    console.error('Network switch failed:', error);
  }
};
```

### Sending Transactions

```typescript
import { parseNativeCurrency, getRecommendedGasLimit } from '../utils/networkUtils';

const sendTransaction = async (to: string, amount: string) => {
  try {
    const provider = await networkManager.getProvider();
    const signer = await provider.getSigner();
    
    const tx = await signer.sendTransaction({
      to,
      value: parseNativeCurrency(amount),
      gasLimit: getRecommendedGasLimit('transfer')
    });
    
    console.log('Transaction sent:', tx.hash);
    await tx.wait();
    console.log('Transaction confirmed');
  } catch (error) {
    console.error('Transaction failed:', error);
  }
};
```

### Multi-Network Balance Checking

```typescript
const checkBalanceAcrossNetworks = async (address: string) => {
  const networks = ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon'];
  
  for (const networkKey of networks) {
    try {
      const balance = await networkManager.getBalance(address, networkKey);
      const network = networkManager.getNetwork(networkKey);
      console.log(`${network?.name}: ${balance} ${network?.nativeCurrency.symbol}`);
    } catch (error) {
      console.error(`Failed to get balance for ${networkKey}:`, error);
    }
  }
};
```

## 🔒 Security Best Practices

### Environment Variables
- Never commit API keys to version control
- Use different API keys for development and production
- Rotate API keys regularly

### RPC Endpoints
- Use reputable providers (Alchemy, Infura, QuickNode)
- Implement fallback RPC endpoints
- Monitor RPC usage and costs

### Wallet Integration
- Always validate user inputs
- Implement proper error handling
- Use secure connection methods
- Verify transaction details before signing

### Network Validation
- Validate network configurations
- Check RPC connectivity before operations
- Handle network switching failures gracefully

## 🐛 Troubleshooting

### Common Issues

#### "MetaMask is not installed"
- Install MetaMask browser extension
- Refresh the page after installation
- Check if MetaMask is enabled for your site

#### "Network switch failed"
- Check if the network is added to MetaMask
- Verify RPC endpoint is accessible
- Try adding the network manually to MetaMask

#### "RPC endpoint not responding"
- Check your API key and rate limits
- Try using a different RPC provider
- Verify the endpoint URL is correct

#### "Transaction failed"
- Check account balance for gas fees
- Verify recipient address is valid
- Ensure network supports the transaction type

### Network-Specific Issues

#### Base Network
- Ensure you have ETH for gas fees (not BASE tokens)
- Use Base-specific RPC endpoints
- Bridge ETH from Ethereum if needed

#### Polygon Network
- Gas fees are paid in MATIC, not ETH
- Polygon has different gas price dynamics
- Use Polygon-specific faucets for testnet MATIC

#### Layer 2 Networks
- Bridging can take time (minutes to hours)
- Different networks have different finality times
- Check bridge status if transfers are delayed

### Debug Mode

Enable debug logging by setting:

```typescript
// In your component
console.log('Network Manager Debug:', {
  currentNetwork: networkManager.getCurrentNetwork(),
  allNetworks: networkManager.getAllNetworks(),
  stats: networkManager.getNetworkStats()
});
```

## 📚 Additional Resources

### Documentation
- [Ethereum Documentation](https://ethereum.org/developers)
- [Base Documentation](https://docs.base.org)
- [Arbitrum Documentation](https://docs.arbitrum.io)
- [Optimism Documentation](https://docs.optimism.io)
- [Polygon Documentation](https://docs.polygon.technology)

### Tools
- [MetaMask](https://metamask.io) - Browser wallet
- [Ethers.js](https://docs.ethers.org) - Ethereum library
- [Remix](https://remix.ethereum.org) - Smart contract IDE
- [Hardhat](https://hardhat.org) - Development environment

### Community
- [Ethereum Discord](https://discord.gg/ethereum-org)
- [Base Discord](https://discord.gg/buildonbase)
- [Arbitrum Discord](https://discord.gg/arbitrum)
- [Optimism Discord](https://discord.gg/optimism)
- [Polygon Discord](https://discord.gg/polygon)

## 🤝 Contributing

To contribute to this template:

1. Fork the repository
2. Create a feature branch
3. Add your network configuration
4. Test with all supported networks
5. Submit a pull request

## 📄 License

This template is open source and available under the MIT License.

---

**Happy building on multiple EVM networks! 🚀** 