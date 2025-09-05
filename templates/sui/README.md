# SUI Network Template

A production-ready Next.js template with SUI blockchain integration, featuring wallet connection and network support.

**Framework**: Next.js 14 with Pages Router  
**Blockchain**: SUI Network with dApp Kit  
**Wallets**: Automatic detection of all SUI-compatible wallets

## 🚀 Quick Start

### 1. Install a SUI Wallet

**Recommended: Sui Wallet**
- Visit [suiwallet.com](https://suiwallet.com/)
- Install the browser extension
- Create a new wallet or import existing one
- **Important**: Switch to Testnet for testing

**Alternative Wallets:**
- [Suiet](https://suiet.app/) - Popular third-party wallet
- [Martian](https://martianwallet.xyz/) - Multi-chain wallet with SUI support
- [Surf Wallet](https://surf.tech/) - Mobile-first wallet
- [Nightly](https://nightly.app/) - Multi-chain wallet

### 2. Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# SUI Network Configuration
NEXT_PUBLIC_SUI_NETWORK=testnet
# NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Network Options:
# - mainnet (production)
# - testnet (testing)
# - devnet (development)
# - localnet (local development)
```

**Custom RPC Endpoints (Optional):**
```bash
# Official SUI RPC
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Ankr
NEXT_PUBLIC_SUI_RPC_URL=https://rpc.ankr.com/sui_testnet

# Blockvision
NEXT_PUBLIC_SUI_RPC_URL=https://sui-testnet-endpoint.blockvision.org
```

### 3. Switch Wallet to Testnet

**In Sui Wallet:**
1. Click the menu (three lines)
2. Go to "Network"
3. Select "Testnet"
4. Confirm the switch

**In Suiet:**
1. Click the settings gear
2. Select "Network"
3. Choose "Testnet"

### 4. Get Test SUI

**Option 1: Official Faucet**
- Visit [faucet.testnet.sui.io](https://faucet.testnet.sui.io/)
- Connect your wallet
- Request test SUI tokens

**Option 2: Discord Faucet**
- Join [SUI Discord](https://discord.gg/sui)
- Go to #testnet-faucet channel
- Use commands to request tokens

## 🔧 Features

### Wallet Connection
- **Auto-detection**: Automatically detects all installed SUI wallets
- **Multi-wallet support**: Works with any wallet implementing SUI standard
- **Auto-connect**: Remembers previous connections
- **Connection status**: Real-time status indicators
- **Network display**: Shows current network

### User Experience
- **Responsive design**: Works on desktop and mobile
- **Loading states**: Visual feedback during connection
- **Professional UI**: Modern, clean interface
- **Error handling**: User-friendly error messages

## 📱 Usage Guide

### Connecting Your Wallet

1. **Click "Connect Wallet"** to see available wallets
2. **Select your wallet** from the list
3. **Approve the connection** in your wallet
4. **Verify connection** - you should see your wallet name and address

### Supported Wallets

The template automatically detects and supports all wallets that implement the SUI wallet standard, including:

- **Sui Wallet** - Official wallet by Mysten Labs
- **Suiet** - Feature-rich third-party wallet
- **Martian** - Multi-chain wallet
- **Surf Wallet** - Mobile-focused wallet
- **Nightly** - Cross-chain wallet
- **And more** - Any wallet following SUI standard

## 🛠 Customization

### Adding Custom Styles

The template uses styled-jsx for component styling. Modify the `<style jsx>` blocks in:
- `SuiWalletButton.tsx` - Wallet connection UI
- `example.tsx` - Main application layout

### Network Configuration

Edit `SuiProvider.tsx` to customize network settings:

```typescript
// Add custom network configurations
const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
```

### Extending Functionality

To add SUI blockchain operations:

```typescript
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';

// Get current account
const account = useCurrentAccount();

// Use SUI client for blockchain operations
const client = useSuiClient();
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub** - commit your code to a GitHub repository
2. **Connect to Vercel** - import your repository at [vercel.com](https://vercel.com)
3. **Add environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_SUI_NETWORK=testnet`
   - `NEXT_PUBLIC_SUI_RPC_URL` (optional)
4. **Deploy** - Vercel will automatically build and deploy

### Other Platforms

The template works with any platform that supports Next.js:
- **Netlify**: Add environment variables in site settings
- **Railway**: Configure environment variables in dashboard
- **AWS Amplify**: Set environment variables in app settings

## 🔒 Security Best Practices

### Environment Variables
- **Use NEXT_PUBLIC_** prefix for client-side variables
- **Never expose** private keys or sensitive data
- **Validate** all RPC endpoints before production use

### Wallet Security
- **Never ask** for private keys or seed phrases
- **Always verify** transaction details before signing
- **Test thoroughly** on testnet before mainnet
- **Use hardware wallets** for high-value operations

### Production Considerations
- **Rate limiting**: Implement rate limiting for RPC calls
- **Error handling**: Don't expose sensitive error details
- **Monitoring**: Track connection success rates
- **Fallback RPCs**: Configure multiple RPC endpoints

## 🐛 Troubleshooting

### SSR Warning in Development

If you see `useLayoutEffect` warnings in development, this is expected behavior. The SUI dApp Kit uses browser-only features that trigger warnings during server-side rendering. The template handles this by:
- Only mounting wallet providers on the client side
- Showing a loading state during server rendering
- Preventing hydration mismatches

These warnings only appear in development and don't affect production builds.

### Wallet Connection Issues

**Problem**: No wallets detected
- **Solution**: Install a SUI-compatible wallet extension
- **Check**: Browser extension is enabled
- **Try**: Refresh the page after installation

**Problem**: Connection failed
- **Solution**: Check wallet is unlocked and on correct network
- **Verify**: Website is allowed in wallet settings
- **Try**: Disconnect and reconnect

### Network Issues

**Problem**: RPC connection errors
- **Solution**: Check internet connection
- **Verify**: RPC endpoint is accessible
- **Try**: Use a different RPC endpoint

**Problem**: Wrong network
- **Solution**: Switch wallet to match app network
- **Check**: Environment variables are set correctly

### Common Errors

**"Wallet not installed"**
- Install one of the supported wallets
- Refresh the page after installation

**"User rejected connection"**
- Try connecting again
- Check wallet permissions

**"Network mismatch"**
- Switch wallet network to match app
- Verify NEXT_PUBLIC_SUI_NETWORK setting

## 📚 Learning Resources

### SUI Development
- [SUI Documentation](https://docs.sui.io/) - Official SUI docs
- [SUI TypeScript SDK](https://sdk.mystenlabs.com/typescript) - SDK documentation
- [Move Language](https://move-book.com/) - Smart contract language

### dApp Kit
- [dApp Kit Docs](https://sdk.mystenlabs.com/dapp-kit) - Official documentation
- [Examples](https://github.com/MystenLabs/sui/tree/main/sdk/dapp-kit/examples) - Code examples

### Wallet Integration
- [Wallet Standard](https://docs.sui.io/standards/wallet-standard) - SUI wallet standard
- [Wallet Kit](https://kit.suiet.app/) - Alternative wallet integration

## 🤝 Contributing

Found a bug or want to add a feature? Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on testnet
5. Submit a pull request

## 📄 License

This template is open source and available under the MIT License.

---

**Need Help?** Check the troubleshooting section above or visit the [SUI Discord](https://discord.gg/sui) for community support.