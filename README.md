# capx-compose

A modular CLI tool for scaffolding AI apps with pre-configured integrations and best practices. Built for the AI IDE era with working examples you can import to Cursor, Claude, or any AI editor to start building immediately.

```bash
npx capx-compose my-app
```

[![npm version](https://img.shields.io/npm/v/capx-compose.svg)](https://www.npmjs.com/package/capx-compose)
[![Downloads](https://img.shields.io/npm/dm/capx-compose.svg)](https://www.npmjs.com/package/capx-compose)
[![Discord](https://img.shields.io/discord/YOUR_DISCORD_ID?color=7289da&label=Discord&logo=discord&logoColor=white)](https://discord.com/invite/capx)
[![X Follow](https://img.shields.io/twitter/follow/0xCapx?style=social)](https://x.com/0xCapx)

## Table of Contents

- [Overview](#overview)
- [Who Needs This](#who-needs-this)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [Available Plugins](#available-plugins)
  - [Plugin Compatibility](#plugin-compatibility-rules)
  - [Common Configurations](#common-configurations)
- [Usage](#usage)
  - [CLI Options](#cli-options)
  - [Project Structure](#project-structure)
  - [Environment Variables](#environment-variables)
- [Development](#development)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Overview

capx-compose is a command-line tool that generates Next.js starter templates for AI apps. It handles the initial configuration of common services like AI SDKs, databases, authentication, and blockchain integrations, allowing developers to focus on building features rather than setup.

## Features

- **Ready-to-extend templates** - Working code that AI IDEs can actually build on
- **Everything you need to ship** - Auth, database, AI, blockchain - all pre-wired
- **No dependency hell** - Pre-resolved conflicts so you can start building immediately  
- **Examples built-in** - Working code that scales from hackathon to startup
- **One command setup** - From zero to running app in under 3 minutes
- **Modern stack** - Next.js 14, TypeScript, Tailwind, shadcn/ui

## Who Needs This

- **Hackathon Hackers**: Ship your idea without getting caught up with setup
- **Indie Hackers**: Stop rebuilding the same auth + database + AI stack 
- **Web3 → AI Devs**: Wallet connections + LLM streaming already solved
- **AI → Web3 Devs**: Add blockchain without the Solidity rabbit hole

*Or anyone tired of wiring up the same services for the nth time.*

## Motivation

Modern AI apps need complex components that developers aren't always familiar with:
- **Auth systems** that actually work (social login, wallets with Privy)
- **LLM integration** with streaming, function calling, and error handling
- **Database setup** with real-time subscriptions (Supabase/Firebase)
- **Blockchain connectivity** for Web3 features (EVM, Solana, Sui)

Setting this up takes hours of debugging, reading docs, and fixing version conflicts.

**Our approach:** Start with working code that AI coding assistants can extend. Whether you're using Cursor, Claude, Windsurf, or any other AI-powered editor, these tools work best when they have boilerplate to build on rather than starting from scratch. capx-compose provides that foundation with a running app in under 3 minutes.

## Getting Started

### Installation

```bash
npm install -g capx-compose
```

Or use directly with npx:

```bash
npx capx-compose my-app
```

### Quick Start

#### Interactive Setup (Recommended)

```bash
npx capx-compose my-app
```

Follow the prompts to select your desired configuration.

#### Direct Configuration

```bash
# AI chat app
npx capx-compose my-app --plugins="vercel-ai" --yes

# AI with database
npx capx-compose my-app --plugins="vercel-ai,supabase" --yes

# Web3 AI app
npx capx-compose my-app --plugins="vercel-ai,evm,privy" --yes

# AI agent with DeFi capabilities
npx capx-compose my-app --plugins="vercel-ai,goat,supabase" --yes
```

## Configuration

### Available Plugins

| Plugin | Description | Use Case |
|--------|-------------|----------|
| `vercel-ai` | Vercel AI SDK with OpenAI integration | Streaming chat with GPT models |
| `supabase` | PostgreSQL with auth examples included | User auth, real-time data |
| `firebase` | Firestore with auth | Document storage, offline sync |
| `vercel-kv` | Redis-compatible caching | Session storage, caching |
| `evm` | Multi-chain support (ETH, Base, Arbitrum, Polygon) | Web3 transactions across chains |
| `solana` | Solana blockchain integration | Solana dApps |
| `sui` | Sui blockchain with wallet connection | Sui dApps with wallet UI |
| `privy` | Web3 authentication | Social login + embedded wallets |
| `goat` | AI agent for EVM & Solana (swaps, sends, balances) | Multi-chain DeFi agent |
| `solana-agent-kit` | Advanced Solana agent for DeFi | Token ops, swaps, Jupiter integration |

### Plugin Compatibility Rules

- **Minimum**: 1 plugin required
- **Maximum**: 6 plugins allowed
- **Databases**: Choose either `supabase` OR `firebase` (not both)
- **Blockchains**: Choose one - `evm`, `solana`, OR `sui` (not multiple)
- **Agents**: Choose either `goat` OR `solana-agent-kit` (not both)
- **Auth**: `privy` requires a blockchain plugin (`evm`, `solana`, or `sui`)

### Common Configurations

```bash
# Web2 AI App
--plugins="vercel-ai,supabase"

# Web3 DeFi Dashboard
--plugins="evm,privy,vercel-ai"

# AI Agent Platform
--plugins="goat,vercel-ai,supabase,vercel-kv"

# Solana AI App
--plugins="solana,vercel-ai,firebase"

# Sui Blockchain App
--plugins="sui,privy,vercel-ai"
```

## Usage

### CLI Options

```bash
capx-compose <project-name> [options]

Options:
  --plugins <list>              Comma-separated list of plugins
  --dependency-strategy <type>  Resolution strategy (smart|highest|compatible)
  --package-manager <pm>        Package manager (npm|yarn|pnpm)
  --typescript                  Enable TypeScript (default: true)
  --tailwind                    Enable Tailwind CSS (default: true)
  --eslint                      Enable ESLint (default: true)
  --yes                         Skip interactive prompts
  --skip-install                Skip dependency installation
  --help                        Display help
  --version                     Display version
```

### Project Structure

```
my-app/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API routes
│   │   ├── chat/            # Example chat implementation
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   ├── lib/                 # Utility functions and configs
│   └── types/              # TypeScript definitions
├── public/                  # Static assets
├── .env.example            # Environment variables template
├── .env.local              # Your environment variables (create this)
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

### Environment Variables

Each plugin adds its required variables to `.env.example`:

```bash
# Copy the template
cp .env.example .env.local

# Example variables (plugin-dependent)
OPENAI_API_KEY=sk-...                    # For vercel-ai
NEXT_PUBLIC_SUPABASE_URL=https://...     # For supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # For supabase
NEXT_PUBLIC_PRIVY_APP_ID=...             # For privy
```

## Development

### Prerequisites

- Node.js 18.0.0 or higher
- npm 7.0.0 or higher

### Local Development

```bash
# Clone the repository
git clone https://github.com/capx-ai/capx-compose.git
cd capx-compose

# Install dependencies
npm install

# Run tests
npm test

# Test CLI locally
capx-compose test-app --skip-install
```

## Contributing

We welcome contributions, especially new plugin integrations.

### Adding a Plugin

Create a new folder in `/templates/[plugin-name]/` with:
- `config.json` - Dependencies and metadata
- `example.tsx` - Working example code  
- `.env.example` - Required environment variables
- `setup.md` - Setup instructions

Test locally with `capx-compose test-app --plugins="your-plugin" --skip-install` and submit a PR.

### Priority Areas

- More AI SDKs (LangChain, direct OpenAI)
- Payment processing (Stripe, crypto payments)
- More auth providers
- Bug fixes and docs improvements

## Support

- [GitHub Issues](https://github.com/capx-ai/capx-compose/issues) - Bug reports and feature requests
- [Discord](https://discord.com/invite/capx) - Community support and discussions
- [Dev Guide](https://guide.capx.ai/) - Guides and API docs

## About Capx

Capx is building infrastructure for the convergence of AI and blockchain. capx-compose is part of our commitment to making this intersection more accessible to developers. Learn more at [capx.ai](https://capx.ai).

## License

MIT

## Acknowledgments

Built with and for the developer community. Special thanks to early contributors and hackathon participants who provided feedback.

---

Made with ❤️ at [Capx](https://x.com/0xCapx)