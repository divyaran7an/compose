import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { viem } from "@goat-sdk/wallet-viem";
import { sendETH } from "@goat-sdk/wallet-evm";
import { USDC, PEPE, erc20 } from "@goat-sdk/plugin-erc20";

type ChainType = 'evm';

export function getChain(): ChainType {
  const chain = process.env.GOAT_CHAIN;
  if (chain !== 'evm') {
    throw new Error('GOAT_CHAIN must be set to "evm"');
  }
  return chain as ChainType;
}

export function createWalletFromPrivateKey(chain: ChainType) {
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

export async function getChainTools(chain: ChainType, wallet: any) {
  const rpcUrl = process.env.RPC_PROVIDER_URL || 'https://sepolia.base.org';
  
  const walletClient = createWalletClient({
    account: wallet.account,
    transport: http(rpcUrl),
    chain: baseSepolia,
  });
  
  const tools = await getOnChainTools({
    wallet: viem(walletClient),
    plugins: [
      sendETH(),
      erc20({
        tokens: [USDC, PEPE],
      })
    ],
  });
  
  return tools;
}

export function getWalletInfo(chain: ChainType) {
  return {
    network: 'Base Sepolia',
    explorer: 'https://sepolia.basescan.org'
  };
}