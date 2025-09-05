# Solana Web3 Template

A production-ready Next.js template with Solana blockchain integration, featuring wallet connection, transaction handling, and devnet support.

**Framework**: Next.js 14 with Pages Router  
**Blockchain**: Solana Web3.js with Wallet Adapter  
**Wallets**: Phantom, Solflare, Torus, Ledger support

## 🚀 Quick Start

### 1. Install a Solana Wallet

**Recommended: Phantom Wallet**
- Visit [phantom.app](https://phantom.app/)
- Install the browser extension
- Create a new wallet or import existing one
- **Important**: Switch to Devnet for testing

**Alternative Wallets:**
- [Solflare](https://solflare.com/) - Multi-platform wallet
- [Torus](https://tor.us/) - Web-based wallet
- [Ledger](https://www.ledger.com/) - Hardware wallet

### 2. Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Solana Network Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Optional: Custom RPC endpoints
# NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-devnet.g.alchemy.com/v2/your-api-key
# NEXT_PUBLIC_SOLANA_RPC_URL=https://rpc.ankr.com/solana_devnet
```

**Network Options:**
- `devnet` - For development and testing (recommended)
- `testnet` - Alternative test network
- `mainnet-beta` - Production network (real SOL)

### 3. Switch Wallet to Devnet

**In Phantom:**
1. Click the gear icon (Settings)
2. Go to "Developer Settings"
3. Change network to "Devnet"
4. Confirm the switch

**In Solflare:**
1. Click the network dropdown (top right)
2. Select "Devnet"

### 4. Get Test SOL

**Option 1: Use the Airdrop Feature**
- Connect your wallet in the app
- Use the "Request Airdrop" feature
- Maximum 5 SOL per request

**Option 2: Solana Faucet**
- Visit [faucet.solana.com](https://faucet.solana.com/)
- Enter your wallet address
- Request SOL (up to 5 SOL per day)

## 🔧 Features

### Wallet Connection
- **Multi-wallet support**: Phantom, Solflare, Torus, Ledger
- **Auto-connect**: Remembers previous connections
- **Connection status**: Real-time status indicators
- **Network detection**: Displays current network and RPC endpoint

### Solana Operations
- **Balance checking**: Real-time SOL balance display
- **Airdrop requests**: Get test SOL on devnet/testnet
- **SOL transfers**: Send SOL to other wallets
- **Transaction confirmation**: Wait for on-chain confirmation
- **Error handling**: Comprehensive error messages and recovery

### User Experience
- **Responsive design**: Works on desktop and mobile
- **Loading states**: Visual feedback during operations
- **Form validation**: Input validation and error prevention
- **Status messages**: Success and error notifications
- **Professional UI**: Modern, clean interface

## 📱 Usage Guide

### Connecting Your Wallet

1. **Click "Select Wallet"** to open the wallet selection modal
2. **Choose your wallet** from the available options
3. **Approve the connection** in your wallet
4. **Verify connection** - you should see your wallet address displayed

### Checking Your Balance

- Your SOL balance is displayed automatically when connected
- Click "Refresh Balance" to update manually
- Balance shows 4 decimal places for precision

### Requesting Airdrops (Devnet/Testnet Only)

1. **Enter amount** (0.1 to 5 SOL)
2. **Click "Request Airdrop"**
3. **Wait for confirmation** - this may take 10-30 seconds
4. **Balance updates automatically** after successful airdrop

### Sending SOL

1. **Enter recipient address** - the destination wallet address
2. **Enter amount** - how much SOL to send
3. **Click "Send SOL"**
4. **Confirm in wallet** - approve the transaction
5. **Wait for confirmation** - transaction will be confirmed on-chain

## 🛠 Customization

### Adding More Wallets

Edit `WalletProvider.tsx` to add additional wallet adapters:

```typescript
import { NewWalletAdapter } from '@solana/wallet-adapter-wallets';

const wallets = useMemo(
  () => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network }),
    new NewWalletAdapter(), // Add new wallet here
  ],
  [network]
);
```

### Custom RPC Endpoints

For better performance, consider using dedicated RPC providers:

```bash
# Alchemy
NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-devnet.g.alchemy.com/v2/your-api-key

# Ankr
NEXT_PUBLIC_SOLANA_RPC_URL=https://rpc.ankr.com/solana_devnet

# QuickNode
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-endpoint.solana-devnet.quiknode.pro/your-api-key/
```

### Styling Customization

The components use CSS-in-JS with styled-jsx. Modify the `<style jsx>` blocks in:
- `WalletButton.tsx` - Wallet connection UI
- `SolanaOperations.tsx` - Operations interface
- `example.tsx` - Main application layout

### Adding Custom Operations

Extend `SolanaOperations.tsx` to add more Solana functionality:

```typescript
// Example: Get account info
const getAccountInfo = useCallback(async () => {
  if (!publicKey) return;
  
  const accountInfo = await connection.getAccountInfo(publicKey);
  console.log('Account info:', accountInfo);
}, [connection, publicKey]);

// Example: Create a token account
const createTokenAccount = useCallback(async () => {
  // Implementation here
}, [connection, publicKey, sendTransaction]);
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub** - commit your code to a GitHub repository
2. **Connect to Vercel** - import your repository at [vercel.com](https://vercel.com)
3. **Add environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_SOLANA_NETWORK=devnet`
   - `NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com`
4. **Deploy** - Vercel will automatically build and deploy

### Other Platforms

The template works with any platform that supports Next.js:
- **Netlify**: Add environment variables in site settings
- **Railway**: Configure environment variables in dashboard
- **Heroku**: Use `heroku config:set` to add variables

## 🔒 Security Best Practices

### Environment Variables
- **Never commit** `.env.local` files to version control
- **Use NEXT_PUBLIC_** prefix for client-side variables
- **Validate RPC endpoints** before using in production

### Wallet Security
- **Never share** your private keys or seed phrases
- **Use hardware wallets** for mainnet applications
- **Verify transaction details** before signing
- **Test on devnet** before mainnet deployment

### Production Considerations
- **Rate limiting**: Implement rate limiting for airdrop requests
- **Input validation**: Validate all user inputs server-side
- **Error handling**: Don't expose sensitive error information
- **Monitoring**: Monitor transaction success rates and errors

## 🐛 Troubleshooting

### Wallet Connection Issues

**Problem**: Wallet not connecting
- **Solution**: Refresh the page and try again
- **Check**: Ensure wallet extension is installed and unlocked
- **Verify**: Wallet is on the correct network (devnet)

**Problem**: "Wallet not detected"
- **Solution**: Install the wallet extension and refresh
- **Check**: Extension is enabled in browser settings

### Transaction Failures

**Problem**: "Insufficient funds"
- **Solution**: Request an airdrop or add more SOL to your wallet
- **Check**: You have enough SOL for the transaction + fees

**Problem**: "Transaction failed"
- **Solution**: Check network connection and try again
- **Verify**: Recipient address is valid
- **Check**: You're on the correct network

### Airdrop Issues

**Problem**: "Airdrop failed"
- **Solution**: You may have hit rate limits, try again later
- **Check**: You're on devnet or testnet (not mainnet)
- **Verify**: Amount is between 0.1 and 5 SOL

### Network Issues

**Problem**: "Failed to fetch balance"
- **Solution**: Check your internet connection
- **Verify**: RPC endpoint is accessible
- **Try**: Switch to a different RPC endpoint

## 📚 Learning Resources

### Solana Development
- [Solana Documentation](https://docs.solana.com/) - Official Solana docs
- [Solana Cookbook](https://solanacookbook.com/) - Code examples and guides
- [Anchor Framework](https://www.anchor-lang.com/) - Solana program development

### Wallet Adapter
- [Wallet Adapter Docs](https://github.com/solana-labs/wallet-adapter) - Official documentation
- [React Integration](https://github.com/solana-labs/wallet-adapter/tree/master/packages/react) - React-specific guides

### Web3.js
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) - JavaScript SDK documentation
- [Examples](https://github.com/solana-labs/solana-web3.js/tree/master/examples) - Code examples

## 🤝 Contributing

Found a bug or want to add a feature? Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on devnet
5. Submit a pull request

## 📄 License

This template is open source and available under the MIT License.

---

**Need Help?** Check the troubleshooting section above or open an issue in the repository.
