import { NextApiRequest, NextApiResponse } from 'next';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { createWalletFromPrivateKey, createSolanaAgent, getAgentInfo } from '../../utils/agent-config';

let agentWallet: any = null;
let solanaAgent: any = null;
let tools: any = null;

async function initializeAgent() {
  if (!agentWallet) {
    agentWallet = createWalletFromPrivateKey();
    const { agent, tools: agentTools } = await createSolanaAgent(agentWallet.keypair);
    solanaAgent = agent;
    tools = agentTools;
    
    console.log(`Solana Agent initialized:`, agentWallet.publicKey);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if API key exists
  if (!process.env.OPENAI_API_KEY) {
    return res.status(401).json({ 
      error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.' 
    });
  }

  // Check RPC provider URL
  if (!process.env.RPC_PROVIDER_URL) {
    return res.status(401).json({ 
      error: 'Missing RPC_PROVIDER_URL. Please check your .env file for Solana configuration.' 
    });
  }

  // Check Solana private key
  if (!process.env.SOLANA_PRIVATE_KEY) {
    return res.status(401).json({ 
      error: 'Missing SOLANA_PRIVATE_KEY. Please check your .env file for Solana configuration.' 
    });
  }

  try {
    await initializeAgent();
    
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const agentInfo = getAgentInfo(agentWallet.publicKey);
    
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      tools: tools,
      maxSteps: 10,
      messages: messages.map((message: any) => ({
        role: message.role,
        content: message.content,
      })),
      system: `You are a Solana blockchain agent powered by Solana Agent Kit. You can execute real Solana transactions.
      
      Your wallet: ${agentWallet.publicKey}
      Network: ${agentInfo.network}
      Explorer: ${agentInfo.explorer}
      
      You can:
      - Check SPL token balances
      - Transfer SOL and SPL tokens
      - Swap tokens via Jupiter
      - Get token prices and market data
      - Check transaction history
      
      Be helpful and concise. When users ask about Solana operations, use your tools to execute them.
      Always mention the wallet address when relevant. Use Solana terminology naturally.`,
    });

    return res.status(200).json({ text: result.text });

  } catch (error: any) {
    console.error('Solana Agent error:', error);

    // Generic user-friendly error message
    const friendlyError = 'Please check your .env file configuration. Copy .env.example to .env.local and add your API keys and Solana private key.';

    return res.status(400).json({ error: friendlyError });
  }
}