# 🚀 Privy Integration Setup

This demo showcases simple Privy integration with email authentication and embedded wallet operations.

## ⚡ Quick Start

### 1. Get Your Privy App ID
1. Go to [dashboard.privy.io](https://dashboard.privy.io)
2. Create a new app
3. Copy your App ID from the dashboard

### 2. Set Environment Variables
Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_app_id_here
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Development Server
```bash
npm run dev
```

### 5. Visit the Demo
Open [http://localhost:3000/privy](http://localhost:3000/privy) in your browser.

## 🔧 What's Included

### Email Authentication
- Send verification code to email
- Login with verification code  
- User profile display
- Logout functionality

### Wallet Operations
- Create embedded wallet
- Export private key (optional)
- Send ETH transactions
- Sign messages
- Wallet provider integration

## 📚 References

This implementation follows the official Privy documentation:

- [Email Authentication](https://docs.privy.io/authentication/user-authentication/login-methods/email)
- [Creating Wallets](https://docs.privy.io/wallets/wallets/create/from-my-client)
- [Exporting Private Keys](https://docs.privy.io/wallets/wallets/export)
- [Wallet Provider](https://docs.privy.io/wallets/using-wallets/ethereum/web3-integrations#ethers)
- [Send Transactions](https://docs.privy.io/wallets/using-wallets/ethereum/send-a-transaction)

## 🔒 Security Notes

- Private keys are handled securely by Privy
- Never log or store private keys in your application
- Use testnet for development and testing
- Always validate user inputs before transactions

## 🛠️ Customization

The implementation uses simple inline styles for clarity. In production, you might want to:

- Add a CSS framework like Tailwind CSS
- Implement proper error handling and loading states
- Add transaction history and status tracking
- Customize the Privy appearance theme 