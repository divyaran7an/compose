# GOAT AI Agent

Deploy an AI agent that executes real blockchain transactions through natural conversation. Powered by GOAT SDK (Great Onchain Agent Toolkit).

## What This Agent Can Do

- **Send Tokens**: Transfer ETH, SOL, and other tokens between wallets
- **Check Balances**: View your token holdings in real-time  
- **Token Swaps**: Trade USDC for PEPE and other token pairs
- **Natural Language**: Execute blockchain operations through conversation

## Quick Start

1. **Blockchain Selection**:
   When you selected GOAT during setup, you chose either Base (EVM) or Solana as your blockchain.

2. **Environment Setup**:
   The CLI automatically configured your environment based on your selection. 
   
   **Important**: Copy `.env.example` to `.env.local` and add your API keys:
   
   ```bash
   # Already configured by CLI
   GOAT_CHAIN=evm  # (your selected blockchain)
   RPC_PROVIDER_URL=https://sepolia.base.org  # (your RPC endpoint)
   
   # Add your API keys
   OPENAI_API_KEY=your_openai_api_key
   
   # For EVM chains: Add your private key
   WALLET_PRIVATE_KEY=0x1234567890abcdef...
   
   # For Solana: Add your private key  
   # SOLANA_PRIVATE_KEY=base58_encoded_private_key
   ```

3. **Access Your Agent**:
   Navigate to `/goat` in your application to interact with your blockchain agent.

## How It Works

Your agent:
- Uses your private key to create a secure wallet connection
- Connects to your specified blockchain (EVM or Solana) 
- Operates on testnet by default for safe experimentation
- Executes real transactions through natural conversation

## Example Interactions

**EVM (Base Sepolia):**
```
User: "What's my wallet address?"
Agent: "Your wallet address is 0x742d35Cc6Bf2c... on Base Sepolia testnet"

User: "Check my ETH balance"
Agent: "You have 0.45 ETH in your wallet"

User: "Send 0.1 ETH to 0x123..."
Agent: "Sending 0.1 ETH to 0x123... Transaction confirmed!"

User: "Swap 10 USDC for PEPE"
Agent: "Swapping 10 USDC for PEPE tokens... Swap complete!"
```

**Solana (Devnet):**
```
User: "Check my SOL balance"
Agent: "You have 2.5 SOL in your wallet"

User: "Send 0.1 SOL to 9ABC..."
Agent: "Sending 0.1 SOL to 9ABC... Transaction confirmed!"

User: "Swap 1 SOL for USDC via Jupiter"
Agent: "Swapping 1 SOL for USDC... Swap complete!"
```

## Supported Networks

### Solana
- **Network**: Devnet (testnet)
- **Faucet**: https://faucet.solana.com
- **Explorer**: https://explorer.solana.com

### EVM Chains
- **Network**: Base Sepolia (testnet)
- **Faucet**: https://www.alchemy.com/faucets/base-sepolia
- **Explorer**: https://sepolia.basescan.org

## Security

- Uses your private key for wallet access (keep it secure!)
- Testnet operations by default for safe experimentation
- All transactions are logged and transparent
- Private keys never leave your environment

## Technical Details

This agent uses:
- **GOAT SDK** for blockchain interactions
- **Vercel AI SDK** for natural language processing  
- **OpenAI GPT-4** for conversation understanding
- **Your private key** for wallet management

## Getting Test Funds

**For Solana**: Visit [Solana Faucet](https://faucet.solana.com) and request SOL for your wallet

**For EVM**: Visit [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia) and request test ETH

## Supported Operations

### EVM (Base Sepolia)
- Send ETH to any address
- Check ETH balance
- Swap USDC for PEPE tokens
- ERC-20 token operations

### Solana (Devnet)
- Send SOL to any address
- Check SOL balance  
- Swap tokens via Jupiter DEX
- SPL token operations

## Troubleshooting

**"GOAT_CHAIN must be set"**
- Set `GOAT_CHAIN=evm` or `GOAT_CHAIN=solana` in your .env file

**"WALLET_PRIVATE_KEY environment variable is required"**
- Add your EVM private key to .env file (for EVM chains)

**"SOLANA_PRIVATE_KEY environment variable is required"**
- Add your Solana private key in base58 format to .env file

**"Transaction failures"**
- Ensure your wallet has sufficient test funds for transactions
- Verify you're connected to the correct testnet

## Learn More

- [GOAT SDK Repository](https://github.com/goat-sdk/goat/)