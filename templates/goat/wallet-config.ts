import { Connection, Keypair } from "@solana/web3.js";
import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { solana, sendSOL } from "@goat-sdk/wallet-solana";
import { viem } from "@goat-sdk/wallet-viem";
import { sendETH } from "@goat-sdk/wallet-evm";
import { splToken } from "@goat-sdk/plugin-spl-token";
import { jupiter } from "@goat-sdk/plugin-jupiter";
import { USDC, PEPE, erc20 } from "@goat-sdk/plugin-erc20";
import base58 from "bs58";

type ChainType = 'solana' | 'evm';

export function getChain(): ChainType {
  const chain = process.env.GOAT_CHAIN;
  if (chain !== 'solana' && chain !== 'evm') {
    throw new Error('GOAT_CHAIN must be set to either "solana" or "evm"');
  }
  return chain as ChainType;
}

export function createWalletFromPrivateKey(chain: ChainType) {
  if (chain === 'solana') {
    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('SOLANA_PRIVATE_KEY environment variable is required for Solana');
    }
    
    const keypair = Keypair.fromSecretKey(base58.decode(privateKey));
    return {
      publicKey: keypair.publicKey.toString(),
      keypair
    };
  } else {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('WALLET_PRIVATE_KEY environment variable is required for EVM');
    }
    
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    return {
      publicKey: account.address,
      account
    };
  }
}

export async function getChainTools(chain: ChainType, wallet: any) {
  const rpcUrl = process.env.RPC_PROVIDER_URL;
  if (!rpcUrl) {
    throw new Error('RPC_PROVIDER_URL environment variable is required');
  }

  if (chain === 'solana') {
    const connection = new Connection(rpcUrl);
    
    return await getOnChainTools({
      wallet: solana({
        keypair: wallet.keypair,
        connection,
      }),
      plugins: [
        sendSOL(),
        splToken(),
        jupiter(),
      ],
    });
  } else {
    const walletClient = createWalletClient({
      account: wallet.account,
      transport: http(rpcUrl),
      chain: baseSepolia,
    });
    
    return await getOnChainTools({
      wallet: viem(walletClient),
      plugins: [
        sendETH(),
        erc20({ tokens: [USDC, PEPE] }),
      ],
    });
  }
}

export function getWalletInfo(chain: ChainType) {
  if (chain === 'solana') {
    return {
      network: 'Solana Devnet',
      explorer: 'https://explorer.solana.com',
      faucet: 'https://faucet.solana.com'
    };
  } else {
    return {
      network: 'Base Sepolia',
      explorer: 'https://sepolia.basescan.org',
      faucet: 'https://www.alchemy.com/faucets/base-sepolia'
    };
  }
}