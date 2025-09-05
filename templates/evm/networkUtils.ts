import { ethers } from 'ethers';
import { NetworkConfig, networkManager } from './NetworkManager';

/**
 * Format native currency amount with proper symbol
 */
export function formatNativeCurrency(
  amount: string | bigint,
  networkKey: string,
  decimals: number = 4
): string {
  const network = networkManager.getNetwork(networkKey);
  if (!network) {
    return `${amount} ETH`;
  }

  const formattedAmount = typeof amount === 'bigint' 
    ? parseFloat(ethers.formatEther(amount)).toFixed(decimals)
    : parseFloat(amount).toFixed(decimals);

  return `${formattedAmount} ${network.nativeCurrency.symbol}`;
}

/**
 * Parse native currency amount to wei
 */
export function parseNativeCurrency(amount: string): bigint {
  return ethers.parseEther(amount);
}

/**
 * Get network display name with layer info
 */
export function getNetworkDisplayName(networkKey: string): string {
  const network = networkManager.getNetwork(networkKey);
  if (!network) {
    return 'Unknown Network';
  }

  const layerInfo = network.layer === 'L2' ? ` (${network.layer})` : '';
  const testnetInfo = network.isTestnet ? ' Testnet' : '';
  
  return `${network.name}${layerInfo}${testnetInfo}`;
}

/**
 * Get network color for UI theming
 */
export function getNetworkColor(networkKey: string): string {
  const colorMap: Record<string, string> = {
    'ethereum': '#627EEA',
    'ethereum-sepolia': '#627EEA',
    'base': '#0052FF',
    'base-sepolia': '#0052FF',
    'arbitrum': '#28A0F0',
    'arbitrum-sepolia': '#28A0F0',
    'optimism': '#FF0420',
    'optimism-sepolia': '#FF0420',
    'polygon': '#8247E5',
    'polygon-amoy': '#8247E5',
  };

  return colorMap[networkKey] || '#6B7280';
}

/**
 * Get network icon emoji
 */
export function getNetworkIcon(networkKey: string): string {
  const iconMap: Record<string, string> = {
    'ethereum': '⟠',
    'ethereum-sepolia': '⟠',
    'base': '🔵',
    'base-sepolia': '🔵',
    'arbitrum': '🔷',
    'arbitrum-sepolia': '🔷',
    'optimism': '🔴',
    'optimism-sepolia': '🔴',
    'polygon': '🟣',
    'polygon-amoy': '🟣',
  };

  return iconMap[networkKey] || '🌐';
}

/**
 * Check if address is valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!isValidAddress(address)) {
    return address;
  }
  
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Get gas price in Gwei
 */
export async function getGasPriceInGwei(networkKey?: string): Promise<string> {
  try {
    const gasPrice = await networkManager.getGasPrice(networkKey);
    return ethers.formatUnits(gasPrice, 'gwei');
  } catch {
    return '0';
  }
}

/**
 * Estimate transaction cost
 */
export async function estimateTransactionCost(
  gasLimit: bigint,
  networkKey?: string
): Promise<{ cost: string; costFormatted: string }> {
  try {
    const gasPrice = await networkManager.getGasPrice(networkKey);
    const cost = gasPrice * gasLimit;
    const costEth = ethers.formatEther(cost);
    
    const network = networkKey ? networkManager.getNetwork(networkKey) : null;
    const symbol = network?.nativeCurrency.symbol || 'ETH';
    
    return {
      cost: costEth,
      costFormatted: `${parseFloat(costEth).toFixed(6)} ${symbol}`
    };
  } catch {
    return { cost: '0', costFormatted: '0 ETH' };
  }
}

/**
 * Get network status (connectivity check)
 */
export async function getNetworkStatus(networkKey: string): Promise<{
  isConnected: boolean;
  blockNumber?: number;
  gasPrice?: string;
  error?: string;
}> {
  try {
    const isConnected = await networkManager.validateNetworkConnectivity(networkKey);
    
    if (!isConnected) {
      return { isConnected: false, error: 'Network unreachable' };
    }

    const provider = networkManager.getNetworkProvider(networkKey);
    const [blockNumber, gasPrice] = await Promise.all([
      provider.getBlockNumber(),
      networkManager.getGasPrice(networkKey)
    ]);

    return {
      isConnected: true,
      blockNumber,
      gasPrice: ethers.formatUnits(gasPrice, 'gwei')
    };
  } catch (error) {
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all testnet networks with faucet information
 */
export function getTestnetNetworks(): Array<{
  key: string;
  network: NetworkConfig;
  faucets: string[];
}> {
  const testnets = networkManager.getNetworksByCategory('testnet');
  
  return Object.entries(testnets).map(([key, network]) => ({
    key,
    network,
    faucets: network.faucets
  }));
}

/**
 * Get mainnet networks grouped by layer
 */
export function getMainnetNetworksByLayer(): {
  L1: Array<{ key: string; network: NetworkConfig }>;
  L2: Array<{ key: string; network: NetworkConfig }>;
} {
  const mainnets = networkManager.getNetworksByCategory('mainnet');
  
  const result = { L1: [], L2: [] } as {
    L1: Array<{ key: string; network: NetworkConfig }>;
    L2: Array<{ key: string; network: NetworkConfig }>;
  };

  Object.entries(mainnets).forEach(([key, network]) => {
    result[network.layer].push({ key, network });
  });

  return result;
}

/**
 * Get bridge information for L2 networks
 */
export function getBridgeInfo(networkKey: string): {
  hasBridge: boolean;
  parentChain?: string;
  bridgeUrls?: string[];
} {
  const network = networkManager.getNetwork(networkKey);
  
  if (!network || network.layer === 'L1') {
    return { hasBridge: false };
  }

  const bridgeUrls: Record<string, string[]> = {
    'base': ['https://bridge.base.org'],
    'base-sepolia': ['https://bridge.base.org'],
    'arbitrum': ['https://bridge.arbitrum.io'],
    'arbitrum-sepolia': ['https://bridge.arbitrum.io'],
    'optimism': ['https://app.optimism.io/bridge'],
    'optimism-sepolia': ['https://app.optimism.io/bridge'],
  };

  return {
    hasBridge: true,
    parentChain: network.parentChain,
    bridgeUrls: bridgeUrls[networkKey] || []
  };
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string, chars: number = 6): string {
  if (!hash || hash.length < 10) {
    return hash;
  }
  
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

/**
 * Get network-specific transaction parameters
 */
export async function getNetworkTxParams(networkKey?: string): Promise<{
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  type: 0 | 2;
}> {
  try {
    const supportsEIP1559 = await networkManager.supportsEIP1559(networkKey);
    
    if (supportsEIP1559) {
      let provider;
      if (networkKey) {
        provider = networkManager.getNetworkProvider(networkKey);
      } else {
        provider = await networkManager.getProvider();
      }
      
      if (provider) {
        const feeData = await provider.getFeeData();
        return {
          maxFeePerGas: feeData.maxFeePerGas || undefined,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
          type: 2
        };
      }
    }

    // Fallback to legacy transaction
    const gasPrice = await networkManager.getGasPrice(networkKey);
    return {
      gasPrice,
      type: 0
    };
  } catch {
    // Default fallback
    return {
      gasPrice: BigInt(20000000000), // 20 gwei
      type: 0
    };
  }
}

/**
 * Validate network configuration
 */
export function validateNetworkConfig(config: NetworkConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.chainId || !config.chainId.startsWith('0x')) {
    errors.push('Invalid chainId format');
  }

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Network name is required');
  }

  if (!config.nativeCurrency?.symbol) {
    errors.push('Native currency symbol is required');
  }

  if (!config.rpcUrls?.default) {
    errors.push('Default RPC URL is required');
  }

  if (!config.blockExplorerUrls || config.blockExplorerUrls.length === 0) {
    errors.push('At least one block explorer URL is required');
  }

  if (!['mainnet', 'testnet'].includes(config.category)) {
    errors.push('Category must be either mainnet or testnet');
  }

  if (!['L1', 'L2'].includes(config.layer)) {
    errors.push('Layer must be either L1 or L2');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get recommended gas limit for common operations
 */
export function getRecommendedGasLimit(operation: 'transfer' | 'contract' | 'deploy'): bigint {
  const gasLimits = {
    transfer: BigInt(21000),
    contract: BigInt(100000),
    deploy: BigInt(2000000)
  };

  return gasLimits[operation] || gasLimits.contract;
}

/**
 * Convert between different units
 */
export const units = {
  toWei: (amount: string) => ethers.parseEther(amount),
  fromWei: (amount: bigint) => ethers.formatEther(amount),
  toGwei: (amount: string) => ethers.parseUnits(amount, 'gwei'),
  fromGwei: (amount: bigint) => ethers.formatUnits(amount, 'gwei'),
};

/**
 * Network comparison utility
 */
export function compareNetworks(networkKey1: string, networkKey2: string): {
  same: boolean;
  differences: string[];
} {
  const network1 = networkManager.getNetwork(networkKey1);
  const network2 = networkManager.getNetwork(networkKey2);
  
  if (!network1 || !network2) {
    return { same: false, differences: ['One or both networks not found'] };
  }

  const differences: string[] = [];

  if (network1.layer !== network2.layer) {
    differences.push(`Layer: ${network1.layer} vs ${network2.layer}`);
  }

  if (network1.category !== network2.category) {
    differences.push(`Category: ${network1.category} vs ${network2.category}`);
  }

  if (network1.nativeCurrency.symbol !== network2.nativeCurrency.symbol) {
    differences.push(`Currency: ${network1.nativeCurrency.symbol} vs ${network2.nativeCurrency.symbol}`);
  }

  return {
    same: differences.length === 0,
    differences
  };
} 