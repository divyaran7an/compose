import { ethers } from 'ethers';
import networksConfig from '../config/networks.json';

export interface NetworkConfig {
  chainId: string;
  chainIdDecimal: number;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: string;
    public: string;
    env: string;
  };
  blockExplorerUrls: string[];
  iconUrls: string[];
  isTestnet: boolean;
  category: 'mainnet' | 'testnet';
  layer: 'L1' | 'L2';
  parentChain?: string;
  faucets: string[];
}

export interface NetworkProvider {
  name: string;
  website: string;
  supportedNetworks: string[];
}

export class NetworkManager {
  private networks: Record<string, NetworkConfig>;
  private providers: Record<string, NetworkProvider>;
  private currentNetwork: NetworkConfig | null = null;
  private provider: ethers.BrowserProvider | null = null;

  constructor() {
    this.networks = networksConfig.networks as Record<string, NetworkConfig>;
    this.providers = networksConfig.providers as Record<string, NetworkProvider>;
  }

  /**
   * Get all available networks
   */
  getAllNetworks(): Record<string, NetworkConfig> {
    return this.networks;
  }

  /**
   * Get networks by category (mainnet/testnet)
   */
  getNetworksByCategory(category: 'mainnet' | 'testnet'): Record<string, NetworkConfig> {
    return Object.fromEntries(
      Object.entries(this.networks).filter(([_, network]) => network.category === category)
    );
  }

  /**
   * Get networks by layer (L1/L2)
   */
  getNetworksByLayer(layer: 'L1' | 'L2'): Record<string, NetworkConfig> {
    return Object.fromEntries(
      Object.entries(this.networks).filter(([_, network]) => network.layer === layer)
    );
  }

  /**
   * Get a specific network by key
   */
  getNetwork(networkKey: string): NetworkConfig | null {
    return this.networks[networkKey] || null;
  }

  /**
   * Get network by chain ID
   */
  getNetworkByChainId(chainId: number | string): NetworkConfig | null {
    const chainIdStr = typeof chainId === 'number' ? `0x${chainId.toString(16)}` : chainId;
    const chainIdDecimal = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
    
    return Object.values(this.networks).find(
      network => network.chainId === chainIdStr || network.chainIdDecimal === chainIdDecimal
    ) || null;
  }

  /**
   * Get the current network
   */
  getCurrentNetwork(): NetworkConfig | null {
    return this.currentNetwork;
  }

  /**
   * Get RPC URL for a network (prioritizes environment variable, falls back to default)
   */
  getRpcUrl(networkKey: string): string {
    const network = this.getNetwork(networkKey);
    if (!network) {
      throw new Error(`Network ${networkKey} not found`);
    }

    // Try to get from environment variable first
    const envVarName = network.rpcUrls.env;
    if (typeof window !== 'undefined' && process.env[envVarName]) {
      return process.env[envVarName]!;
    }

    // Fall back to default RPC URL
    return network.rpcUrls.default;
  }

  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum;
  }

  /**
   * Get current network from MetaMask
   */
  async getCurrentNetworkFromWallet(): Promise<NetworkConfig | null> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const network = this.getNetworkByChainId(chainId);
      this.currentNetwork = network;
      return network;
    } catch (error) {
      console.error('Failed to get current network:', error);
      return null;
    }
  }

  /**
   * Switch to a specific network
   */
  async switchToNetwork(networkKey: string): Promise<boolean> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    const network = this.getNetwork(networkKey);
    if (!network) {
      throw new Error(`Network ${networkKey} not found`);
    }

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });

      this.currentNetwork = network;
      return true;
    } catch (switchError: any) {
      // If the network is not added to MetaMask, add it
      if (switchError.code === 4902) {
        return await this.addNetworkToWallet(networkKey);
      }
      throw switchError;
    }
  }

  /**
   * Add a network to MetaMask
   */
  async addNetworkToWallet(networkKey: string): Promise<boolean> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    const network = this.getNetwork(networkKey);
    if (!network) {
      throw new Error(`Network ${networkKey} not found`);
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: network.chainId,
            chainName: network.name,
            nativeCurrency: network.nativeCurrency,
            rpcUrls: [this.getRpcUrl(networkKey)],
            blockExplorerUrls: network.blockExplorerUrls,
            iconUrls: network.iconUrls,
          },
        ],
      });

      this.currentNetwork = network;
      return true;
    } catch (error) {
      console.error('Failed to add network:', error);
      return false;
    }
  }

  /**
   * Validate network connectivity
   */
  async validateNetworkConnectivity(networkKey: string): Promise<boolean> {
    try {
      const rpcUrl = this.getRpcUrl(networkKey);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Try to get the latest block number
      await provider.getBlockNumber();
      return true;
    } catch (error) {
      console.error(`Network ${networkKey} connectivity failed:`, error);
      return false;
    }
  }

  /**
   * Get provider for current network
   */
  async getProvider(): Promise<ethers.BrowserProvider | null> {
    if (!this.isMetaMaskInstalled()) {
      return null;
    }

    if (!this.provider) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }

    return this.provider;
  }

  /**
   * Get provider for specific network (using RPC)
   */
  getNetworkProvider(networkKey: string): ethers.JsonRpcProvider {
    const rpcUrl = this.getRpcUrl(networkKey);
    return new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Get balance for an address on a specific network
   */
  async getBalance(address: string, networkKey?: string): Promise<string> {
    let provider: ethers.Provider;

    if (networkKey) {
      provider = this.getNetworkProvider(networkKey);
    } else {
      const browserProvider = await this.getProvider();
      if (!browserProvider) {
        throw new Error('No provider available');
      }
      provider = browserProvider;
    }

    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Get gas price for a specific network
   */
  async getGasPrice(networkKey?: string): Promise<bigint> {
    let provider: ethers.Provider;

    if (networkKey) {
      provider = this.getNetworkProvider(networkKey);
    } else {
      const browserProvider = await this.getProvider();
      if (!browserProvider) {
        throw new Error('No provider available');
      }
      provider = browserProvider;
    }

    const feeData = await provider.getFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  /**
   * Check if network supports EIP-1559 (Type 2 transactions)
   */
  async supportsEIP1559(networkKey?: string): Promise<boolean> {
    try {
      let provider: ethers.Provider;

      if (networkKey) {
        provider = this.getNetworkProvider(networkKey);
      } else {
        const browserProvider = await this.getProvider();
        if (!browserProvider) {
          return false;
        }
        provider = browserProvider;
      }

      const feeData = await provider.getFeeData();
      return feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getBlockExplorerUrl(networkKey: string, txHash: string): string {
    const network = this.getNetwork(networkKey);
    if (!network || network.blockExplorerUrls.length === 0) {
      throw new Error(`No block explorer available for network ${networkKey}`);
    }

    return `${network.blockExplorerUrls[0]}/tx/${txHash}`;
  }

  /**
   * Get block explorer URL for an address
   */
  getAddressExplorerUrl(networkKey: string, address: string): string {
    const network = this.getNetwork(networkKey);
    if (!network || network.blockExplorerUrls.length === 0) {
      throw new Error(`No block explorer available for network ${networkKey}`);
    }

    return `${network.blockExplorerUrls[0]}/address/${address}`;
  }

  /**
   * Get faucet URLs for testnet networks
   */
  getFaucetUrls(networkKey: string): string[] {
    const network = this.getNetwork(networkKey);
    if (!network) {
      throw new Error(`Network ${networkKey} not found`);
    }

    if (!network.isTestnet) {
      throw new Error(`Network ${networkKey} is not a testnet`);
    }

    return network.faucets;
  }

  /**
   * Get supported providers for a network
   */
  getSupportedProviders(networkKey: string): NetworkProvider[] {
    return Object.values(this.providers).filter(provider =>
      provider.supportedNetworks.includes(networkKey)
    );
  }

  /**
   * Listen for network changes
   */
  onNetworkChange(callback: (network: NetworkConfig | null) => void): () => void {
    if (!this.isMetaMaskInstalled()) {
      return () => {};
    }

    const handleChainChanged = async (chainId: string) => {
      const network = this.getNetworkByChainId(chainId);
      this.currentNetwork = network;
      callback(network);
    };

    window.ethereum.on('chainChanged', handleChainChanged);

    // Return cleanup function
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }

  /**
   * Add a custom network (for extending the template)
   */
  addCustomNetwork(key: string, config: NetworkConfig): void {
    this.networks[key] = config;
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): {
    totalNetworks: number;
    mainnets: number;
    testnets: number;
    l1Networks: number;
    l2Networks: number;
  } {
    const networks = Object.values(this.networks);
    
    return {
      totalNetworks: networks.length,
      mainnets: networks.filter(n => n.category === 'mainnet').length,
      testnets: networks.filter(n => n.category === 'testnet').length,
      l1Networks: networks.filter(n => n.layer === 'L1').length,
      l2Networks: networks.filter(n => n.layer === 'L2').length,
    };
  }
}

// Export a singleton instance
export const networkManager = new NetworkManager();

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
} 