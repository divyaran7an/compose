# Solana Agent Kit

Advanced Solana AI agent for token operations for SPL tokens such as transferring assets, swapping, bridging, and rug checking.

## What This Agent Can Do

- **Transfer Assets**: Send SOL and SPL tokens between wallets
- **Token Swaps**: Trade tokens instantly through Jupiter DEX  
- **Balance Checks**: View your token holdings in real-time
- **Price Data**: Get real-time token prices and market information
- **Rug Checking**: Verify token safety before transactions
- **Natural Language**: Execute Solana operations through conversation

## Quick Start

1. **Environment Setup**:
   **Important**: Copy `sample.env` to `.env.local` and add your keys:
   
   ```bash
   # Already configured by CLI
   RPC_PROVIDER_URL=https://api.devnet.solana.com
   
   # Add your API keys
   OPENAI_API_KEY=your_openai_api_key
   SOLANA_PRIVATE_KEY=your_base58_encoded_private_key
   ```

2. **Access Your Agent**:
   Navigate to `/solana-agent-kit` in your application to interact with your Solana blockchain agent.

## How It Works

Your agent:
- Uses your private key to create a secure wallet connection
- Connects to Solana devnet by default for safe experimentation  
- Executes real Solana transactions through natural conversation
- Provides access to 60+ Solana operations via Solana Agent Kit
- Integrates with Jupiter DEX for token swaps

## Example Interactions

```
User: "What's my wallet address?"
Agent: "Your wallet address is 8XyZ9... on Solana devnet"

User: "Check my SOL balance"
Agent: "You have 2.45 SOL in your wallet"

User: "Transfer 0.1 SOL to 9ABC..."
Agent: "Transferring 0.1 SOL to 9ABC... Transaction confirmed!"

User: "Swap 1 SOL for USDC"
Agent: "Swapping 1 SOL for USDC via Jupiter... Swap complete!"

User: "Get price of SOL"
Agent: "Current SOL price is $180.50 USD"
```

## Supported Operations

### Token Operations
- Transfer SOL and SPL tokens
- Check token balances
- Verify token safety (rug checking)
- Get wallet information

### Trading & Market Data
- Token swaps via Jupiter Exchange
- Real-time price data
- Market data and token information
- Bridging operations

## Network Information

- **Network**: Solana Devnet (testnet)
- **Faucet**: https://faucet.solana.com
- **Explorer**: https://explorer.solana.com

## Security

- Uses your private key for wallet access (keep it secure!)
- Devnet operations by default for safe experimentation
- All transactions are logged and transparent
- Private keys never leave your environment

## Technical Details

This agent uses:
- **Solana Agent Kit** for blockchain interactions
- **Vercel AI SDK** for natural language processing
- **OpenAI GPT-4** for conversation understanding
- **Your private key** for wallet management
- **Jupiter Exchange** for token swaps

## Expand Your Agent

Want more capabilities? Install additional plugins from the [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit) for NFT operations, advanced DeFi, staking, and more.

## Getting Test Funds

Visit [Solana Faucet](https://faucet.solana.com) and request SOL for your wallet to start experimenting.

## Troubleshooting

**"SOLANA_PRIVATE_KEY environment variable is required"**
- Add your Solana private key in base58 format to .env file
- Get your private key from your Solana wallet (Phantom, etc.)

**"RPC_PROVIDER_URL environment variable is required"**
- Add a Solana RPC endpoint to your .env file
- Use https://api.devnet.solana.com for devnet

**"Missing OPENAI_API_KEY"**
- Verify your `OPENAI_API_KEY` is valid
- Check your OpenAI account has sufficient credits

**"Transaction failures"**
- Ensure your wallet has sufficient SOL for fees
- Verify you're on Solana devnet

## Learn More

- [Solana Agent Kit Repository](https://github.com/sendaifun/solana-agent-kit)
- [Solana Documentation](https://docs.solana.com)
- [Jupiter Exchange](https://jup.ag)