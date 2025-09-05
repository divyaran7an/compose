# 🔐 Privy Template - Simple Auth & Wallet

A clean, minimal implementation of Privy for email authentication and embedded wallet functionality with EVM and Solana support.

## ✨ Features

### 🔐 Email Authentication
- **Email verification flow** - Send code → Enter code → Login
- **User profile display** - Shows user ID, email, and verification status
- **Simple logout** - One-click logout functionality

### 👛 Embedded Wallet Operations
- **Create wallet** - Generate embedded wallet for authenticated users
- **Export private key** - Secure private key export (optional)
- **Send transactions** - Send ETH to any address
- **Sign messages** - Message signing capability
- **Wallet status** - Display wallet address and chain information

## 🔧 Quick Setup

### 1. Get Privy App ID
1. Visit [dashboard.privy.io](https://dashboard.privy.io)
2. Create a new app
3. Copy your App ID

### 2. Environment Setup
```bash
# .env.local
NEXT_PUBLIC_PRIVY_APP_ID=your_app_id_here
```

### 3. Run the Demo
```bash
npm install
npm run dev
```

Visit: `http://localhost:3000/privy`

## 📁 File Structure

```
templates/privy/
├── config.json                    # Template configuration
├── lib/privy/config.tsx          # PrivyProvider wrapper
├── components/
│   ├── AuthExample.tsx           # Email authentication UI
│   └── WalletExample.tsx         # Wallet operations UI  
├── pages/privy.tsx               # Main demo page
├── setup.md                     # Detailed setup guide
└── README.md                    # This file
```

## 🔧 Configuration

The `config.json` defines:
- **Dependencies**: Only `@privy-io/react-auth` required
- **Environment**: `NEXT_PUBLIC_PRIVY_APP_ID` (required)
- **File mappings**: Components → destination paths

## 💡 Usage

### Authentication Flow
1. User enters email address
2. Privy sends verification code
3. User enters code to authenticate
4. Profile information displayed

### Wallet Operations
1. Authenticated users can create embedded wallets
2. Export private key (with security warnings)
3. Send ETH transactions to any address
4. Sign arbitrary messages

## 🔒 Security

- Private keys handled securely by Privy infrastructure
- No sensitive data stored in application
- Testnet recommended for development
- User input validation on all forms

## 📚 Official Documentation

This implementation follows official Privy guides:
- [Email Authentication](https://docs.privy.io/authentication/user-authentication/login-methods/email)
- [Creating Wallets](https://docs.privy.io/wallets/wallets/create/from-my-client)
- [Exporting Keys](https://docs.privy.io/wallets/wallets/export)
- [Send Transactions](https://docs.privy.io/wallets/using-wallets/ethereum/send-a-transaction)

## 🎨 Customization

The implementation uses inline styles for simplicity. For production:
- Add CSS framework (Tailwind, etc.)
- Implement proper loading states
- Add transaction status tracking
- Customize Privy theme colors
- Add error boundaries and validation

## ⚠️ Important Notes

- **Development focus**: This template is optimized for learning and prototyping
- **Production considerations**: Add proper error handling, loading states, and security measures
- **Testnet usage**: Always test with testnet before mainnet deployment
- **Key management**: Never log or store private keys in your application

Built with ❤️ using [Privy](https://privy.io) and [capx-compose](https://github.com/Capx-Fi/capx-compose) 