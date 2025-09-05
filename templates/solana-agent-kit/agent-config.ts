import { Keypair } from "@solana/web3.js";
import { SolanaAgentKit, createVercelAITools, KeypairWallet } from "solana-agent-kit";
import TokenPlugin from "@solana-agent-kit/plugin-token";
import bs58 from "bs58";

type AgentInfo = {
  publicKey: string;
  network: string;
  explorer: string;
  faucet: string;
};

export function createWalletFromPrivateKey() {
  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SOLANA_PRIVATE_KEY environment variable is required');
  }
  
  // Follow official docs pattern exactly
  const keyPair = Keypair.fromSecretKey(bs58.decode(privateKey));
  return {
    publicKey: keyPair.publicKey.toString(),
    keypair: keyPair
  };
}

export async function createSolanaAgent(keypair: Keypair) {
  const rpcUrl = process.env.RPC_PROVIDER_URL;
  if (!rpcUrl) {
    throw new Error('RPC_PROVIDER_URL environment variable is required');
  }
  
  // Follow official V2 docs pattern exactly
  const wallet = new KeypairWallet(keypair, rpcUrl);
  
  // Initialize with V2 pattern - empty config object
  const agent = new SolanaAgentKit(wallet, rpcUrl, {})
    .use(TokenPlugin);
  
  // Create Vercel AI tools
  const tools = createVercelAITools(agent, agent.actions);
  
  return { agent, tools };
}

export function getAgentInfo(publicKey?: string): AgentInfo {
  return {
    publicKey: publicKey || '',
    network: 'Solana Devnet',
    explorer: 'https://explorer.solana.com',
    faucet: 'https://faucet.solana.com'
  };
}