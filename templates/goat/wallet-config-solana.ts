import { Connection, Keypair } from "@solana/web3.js";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { solana, sendSOL } from "@goat-sdk/wallet-solana";
import { splToken } from "@goat-sdk/plugin-spl-token";
import { jupiter } from "@goat-sdk/plugin-jupiter";
import base58 from "bs58";

type ChainType = 'solana';

export function getChain(): ChainType {
  const chain = process.env.GOAT_CHAIN;
  if (chain !== 'solana') {
    throw new Error('GOAT_CHAIN must be set to "solana"');
  }
  return chain as ChainType;
}

export function createWalletFromPrivateKey(chain: ChainType) {
  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SOLANA_PRIVATE_KEY environment variable is required for Solana');
  }
  
  const keypair = Keypair.fromSecretKey(base58.decode(privateKey));
  return {
    publicKey: keypair.publicKey.toString(),
    keypair
  };
}

export async function getChainTools(chain: ChainType, wallet: any) {
  const rpcUrl = process.env.RPC_PROVIDER_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl);
  
  const tools = await getOnChainTools({
    wallet: solana({
      keypair: wallet.keypair,
      connection,
    }),
    plugins: [
      sendSOL(),
      splToken(),
      jupiter()
    ],
  });
  
  return tools;
}

export function getWalletInfo(chain: ChainType) {
  return {
    network: 'Solana Devnet',
    explorer: 'https://explorer.solana.com'
  };
}