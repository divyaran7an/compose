# capx-compose Examples

Explore what you can build with capx-compose through interactive examples and template combinations.

## 🚀 Quick Start

```bash
# Try the interactive example builder
node examples/example-builder.js
```

This tool helps you explore all 18 possible template combinations by creating real projects you can test.

## 📋 What's Available

### Single Templates (6)
- **Supabase** - Database with authentication
- **Firebase** - Real-time database with offline support  
- **Vercel AI** - AI chat interfaces with streaming
- **Vercel KV** - Redis caching and real-time features
- **Solana** - Web3 wallet integration and transactions
- **EVM** - Multi-chain Ethereum applications

### Combined Templates (12)
- **Database + AI** (Supabase/Firebase + Vercel AI)
- **Database + Cache** (Supabase/Firebase + Vercel KV)  
- **Web3 + AI** (Solana/EVM + Vercel AI)
- **Web3 + Cache** (Solana/EVM + Vercel KV)
- **Full Stack** (Database + AI + Cache combinations)

## 🛠️ Using the Example Builder

### Basic Usage
```bash
node examples/example-builder.js
```

The tool will:
1. **Create projects** for each template combination
2. **Show required environment variables** 
3. **Provide setup instructions**
4. **Wait for you to test** the generated project
5. **Generate a report** of your exploration

### Example Workflow
```bash
# 1. Run the builder
node examples/example-builder.js

# 2. For each generated project:
cd test-project-name
cp .env.example .env
# Add your API keys to .env
npm install
npm run dev

# 3. Test at http://localhost:3000
# 4. Return to builder and provide feedback
```

### Required API Keys

Set up accounts and get API keys from:
- **Supabase**: [supabase.com](https://supabase.com) → New Project → Settings → API
- **Firebase**: [console.firebase.google.com](https://console.firebase.google.com) → Project Settings
- **OpenAI**: [platform.openai.com](https://platform.openai.com) → API Keys  
- **Vercel KV**: [vercel.com](https://vercel.com) → Storage → KV
- **Infura**: [infura.io](https://infura.io) → Create Project
- **Alchemy**: [alchemy.com](https://alchemy.com) → Create App

## 💡 Quick Examples

### AI Chat App
```bash
capx-compose my-chat --plugins="vercel-ai" --yes
```

### Database App  
```bash
capx-compose my-app --plugins="supabase" --yes
```

### Full Stack App
```bash
capx-compose my-fullstack --plugins="supabase,vercel-ai,vercel-kv" --yes
```

## 🔧 Troubleshooting

**Script won't run?**
```bash
# Make sure you're in the right directory
pwd  # Should show /path/to/capx-compose
chmod +x examples/example-builder.js
```

**Missing environment variables?**
- The tool shows exactly which variables you need
- Copy the exact variable names provided
- Get API keys from the links above

**Build errors?**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

**Ready to explore?** Run `node examples/example-builder.js` to get started! 🚀 