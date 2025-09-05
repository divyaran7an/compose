import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getChain, createWalletFromPrivateKey, getChainTools, getWalletInfo } from '../../utils/wallet-config';

export const runtime = 'edge';
export const maxDuration = 30;

let agentWallet: any = null;
let chainType: any = null;
let tools: any = null;

async function initializeAgent() {
  if (!agentWallet) {
    chainType = getChain();
    agentWallet = createWalletFromPrivateKey(chainType);
    tools = await getChainTools(chainType, agentWallet);
    
    console.log(`GOAT Agent initialized on ${chainType}:`, agentWallet.publicKey);
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await initializeAgent();
    
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check blockchain configuration
    if (!process.env.GOAT_CHAIN) {
      return new Response(JSON.stringify({ 
        error: 'Missing GOAT_CHAIN. Please check your .env file for OpenAI and blockchain configuration.' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (process.env.GOAT_CHAIN !== 'solana' && process.env.GOAT_CHAIN !== 'evm') {
      return new Response(JSON.stringify({ 
        error: 'Invalid GOAT_CHAIN value. Please check your .env file for OpenAI and blockchain configuration.' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.RPC_PROVIDER_URL) {
      return new Response(JSON.stringify({ 
        error: 'Missing RPC_PROVIDER_URL. Please check your .env file for OpenAI and blockchain configuration.' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check wallet private key based on chain type
    if (process.env.GOAT_CHAIN === 'solana' && !process.env.SOLANA_PRIVATE_KEY) {
      return new Response(JSON.stringify({ 
        error: 'Missing wallet private key. Please check your .env file for OpenAI and blockchain configuration.' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (process.env.GOAT_CHAIN === 'evm' && !process.env.WALLET_PRIVATE_KEY) {
      return new Response(JSON.stringify({ 
        error: 'Missing wallet private key. Please check your .env file for OpenAI and blockchain configuration.' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const walletInfo = getWalletInfo(chainType);
    
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      tools: tools,
      maxSteps: 10,
      messages: messages.map((message: any) => ({
        role: message.role,
        content: message.content,
      })),
      system: `You are a crypto agent powered by GOAT SDK. You can execute real blockchain transactions.
      
      Your wallet: ${agentWallet.publicKey}
      Network: ${walletInfo.network}
      Explorer: ${walletInfo.explorer}
      
      You can:
      - Check token balances
      - Send tokens to addresses
      - Swap tokens
      - View transaction history
      
      Be concise and helpful. When users ask about blockchain operations, use your tools to execute them.
      Always mention the wallet address when relevant. Use crypto terminology naturally.`,
    });

    return new Response(JSON.stringify({ text: result.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('GOAT Agent error:', error);

    // Generic user-friendly error message
    const friendlyError = 'Please check your .env file configuration. Copy .env.example to .env.local and add your API keys and private key.';

    return new Response(JSON.stringify({ 
      error: friendlyError
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}