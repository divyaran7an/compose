import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { networkManager, NetworkConfig } from '../utils/NetworkManager';
import {
  formatNativeCurrency,
  getNetworkDisplayName,
  getNetworkColor,
  getNetworkIcon,
  shortenAddress,
  getGasPriceInGwei,
  getNetworkStatus,
  getTestnetNetworks,
  getMainnetNetworksByLayer,
  getBridgeInfo,
  isValidAddress,
  parseNativeCurrency,
  getRecommendedGasLimit
} from '../utils/networkUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

interface WalletState {
  account: string | null;
  balance: string | null;
  isConnected: boolean;
}

interface NetworkStatus {
  isConnected: boolean;
  blockNumber?: number;
  gasPrice?: string;
  error?: string;
}

export default function EVMMultiNetworkDemo() {
  const [wallet, setWallet] = useState<WalletState>({
    account: null,
    balance: null,
    isConnected: false
  });
  
  const [currentNetwork, setCurrentNetwork] = useState<NetworkConfig | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [networkStatuses, setNetworkStatuses] = useState<Record<string, NetworkStatus>>({});
  const [mounted, setMounted] = useState(false);
  
  // Transaction state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txLoading, setTxLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Network data
  const [networks] = useState(() => networkManager.getAllNetworks());
  const [networkStats] = useState(() => networkManager.getNetworkStats());

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return mounted && typeof window !== 'undefined' && window.ethereum;
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const account = accounts[0];
        setWallet(prev => ({ ...prev, account, isConnected: true }));

        // Get current network
        const network = await networkManager.getCurrentNetworkFromWallet();
        setCurrentNetwork(network);
        
        if (network) {
          setSelectedNetwork(network.shortName);
          setError(null);
        } else {
          setError('Connected to an unsupported network. Please switch to a supported network.');
          setSelectedNetwork('');
        }

        // Get balance
        await updateBalance(account);
      }
    } catch (err: any) {
      setError(`Failed to connect wallet: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWallet({ account: null, balance: null, isConnected: false });
    setCurrentNetwork(null);
    setSelectedNetwork('');
    setError(null);
    setSuccess(null);
    setTxHash(null);
  };

  // Update balance
  const updateBalance = async (account: string) => {
    try {
      const balance = await networkManager.getBalance(account);
      setWallet(prev => ({ ...prev, balance }));
    } catch (err) {
      console.error('Failed to get balance:', err);
    }
  };

  // Switch network
  const switchNetwork = async (networkKey: string) => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed');
      return;
    }

    if (!networkKey) {
      setError('Invalid network selection');
      return;
    }

    const network = networkManager.getNetwork(networkKey);
    if (!network) {
      setError(`Network configuration not found for: ${networkKey}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await networkManager.switchToNetwork(networkKey);
      if (success) {
        setCurrentNetwork(network);
        setSelectedNetwork(networkKey);
        setSuccess(`Successfully switched to ${network.name}`);
        
        if (wallet.account) {
          await updateBalance(wallet.account);
        }
      } else {
        setError(`Failed to switch to ${network.name}`);
      }
    } catch (err: any) {
      console.error('Network switch error:', err);
      setError(`Failed to switch network: ${err.message || 'Unknown error'}`);
      
      // Reset selection to current network if switch fails
      if (currentNetwork) {
        setSelectedNetwork(currentNetwork.shortName);
      }
    } finally {
      setLoading(false);
    }
  };

  // Send transaction
  const sendTransaction = async () => {
    if (!wallet.account || !recipient || !amount) {
      setError('Please fill in all transaction fields');
      return;
    }

    if (!isValidAddress(recipient)) {
      setError('Invalid recipient address');
      return;
    }

    setTxLoading(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      const provider = await networkManager.getProvider();
      if (!provider) {
        throw new Error('No provider available');
      }

      const signer = await provider.getSigner();
      const value = parseNativeCurrency(amount);
      const gasLimit = getRecommendedGasLimit('transfer');

      const tx = await signer.sendTransaction({
        to: recipient,
        value,
        gasLimit
      });

      setTxHash(tx.hash);
      setSuccess('Transaction sent successfully!');
      
      // Wait for confirmation
      await tx.wait();
      
      // Update balance
      await updateBalance(wallet.account);
      
      // Clear form
      setRecipient('');
      setAmount('');
    } catch (err: any) {
      setError(`Transaction failed: ${err.message}`);
    } finally {
      setTxLoading(false);
    }
  };

  // Check network statuses
  const checkNetworkStatuses = async () => {
    const statusPromises = Object.keys(networks).map(async (networkKey) => {
      const status = await getNetworkStatus(networkKey);
      return [networkKey, status] as [string, NetworkStatus];
    });

    const results = await Promise.all(statusPromises);
    const statusMap = Object.fromEntries(results);
    setNetworkStatuses(statusMap);
  };

  // Listen for account and network changes
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setWallet(prev => ({ ...prev, account: accounts[0] }));
          updateBalance(accounts[0]);
        }
      };

      const cleanup = networkManager.onNetworkChange((network) => {
        setCurrentNetwork(network);
        if (!network) {
          setError('Switched to an unsupported network. Please switch to a supported network.');
          setSelectedNetwork('');
        } else {
          setError(null);
          setSelectedNetwork(network.shortName);
        }
        if (wallet.account) {
          updateBalance(wallet.account);
        }
      });

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        cleanup();
      };
    }
  }, [wallet.account]);

  // Check network statuses on mount
  useEffect(() => {
    setMounted(true);
    checkNetworkStatuses();
  }, []);

  const testnets = getTestnetNetworks();
  const mainnetsByLayer = getMainnetNetworksByLayer();
  
  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Grid background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex justify-between items-center p-6">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            ← Back to Home
          </Link>
          <a href="https://twitter.com/0xcapx" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <svg width="40" height="14" viewBox="0 0 735 257" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M393.371 60.1076C428.418 39.3368 466.736 49.4457 488.168 73.7358C510.685 99.1 513.774 136.777 495.43 165.276C484.54 181.975 469.643 192.797 450.397 197.607C431.15 202.417 412.435 199.002 395.185 189.59V235.814C395.185 247.037 388.286 255.478 378.117 256.215C367.583 257.13 358.681 249.225 358.143 238.203C357.96 235.99 358.143 233.786 358.143 231.581V71.1384C358.042 68.2175 358.409 65.2993 359.228 62.4966C361.77 55.6906 366.49 51.4658 373.578 50.3596C380.295 49.0769 386.108 51.4658 390.829 56.6124C391.762 57.7109 392.612 58.8793 393.371 60.1076ZM395.367 124.071C394.282 141.355 408.626 162.495 433.138 162.495C453.842 162.679 470.736 145.396 470.918 124.256C470.918 102.932 454.206 85.6563 433.138 85.8406C409.354 86.025 394.456 106.427 395.367 124.071Z" fill="#E6E6E6"/>
              <path d="M284.264 64.3382C285.539 63.4244 285.539 62.318 285.896 61.3962C289.713 53.3075 297.704 49.0828 306.242 50.7342C310.287 51.4901 313.961 53.6097 316.664 56.748C319.368 59.8862 320.943 63.8584 321.132 68.0178V179.96C321.259 182.897 320.826 185.831 319.857 188.602C316.95 195.953 311.509 200.178 303.7 200.731C296.072 201.1 290.236 197.605 286.442 190.991C285.827 189.862 285.282 188.694 284.81 187.496C283.535 187.127 282.815 188.233 282.086 188.787C239.404 219.482 180.707 197.789 166.95 145.586C156.416 105.88 178.933 64.1538 217.069 52.4176C239.404 45.4272 260.629 48.9224 280.272 61.9733C281.718 62.5428 283.065 63.341 284.264 64.3382ZM201.632 125.737C201.608 129.27 202.036 132.792 202.907 136.214C209.624 162.869 240.497 174.26 261.564 157.722C280.454 143.012 282.268 114.521 265.524 97.4304C256.812 88.6122 246.097 84.5559 233.749 86.584C214.891 89.8868 201.814 106.064 201.632 125.737Z" fill="#E6E6E6"/>
              <path d="M594.467 93.1272C594.575 93.257 594.709 93.3614 594.861 93.433C595.013 93.5046 595.178 93.5417 595.346 93.5417C595.514 93.5417 595.679 93.5046 595.831 93.433C595.983 93.3614 596.117 93.257 596.225 93.1272C600.835 87.4355 605.437 81.9041 609.88 76.5571C615.511 69.751 620.968 62.929 626.591 56.155C631.676 50.2709 638.028 47.6976 645.655 49.7418C648.438 50.4709 651.012 51.8541 653.167 53.7789C655.322 55.7037 657 58.1159 658.061 60.8196C659.123 63.5234 659.54 66.4425 659.278 69.3399C659.016 72.2373 658.083 75.0313 656.554 77.495C655.2 79.5623 653.683 81.5142 652.015 83.331C641.846 95.8288 631.676 108.183 621.324 120.648C618.101 124.729 619.123 123.374 622.401 127.863L654.082 166.158C663.88 176.828 659.627 192.941 646.416 197.278C639.153 199.683 631.526 197.278 626.441 191.025C617.356 179.994 608.462 169.148 599.377 158.157C598.474 157.051 597.746 156.129 596.835 155.031C595.021 152.826 594.839 152.826 593.026 155.215C584.852 164.955 576.861 174.88 568.687 184.62C566.873 186.832 565.234 189.037 563.42 191.033C556.521 199.122 545.259 200.404 537.283 193.791C529.11 186.993 528.207 175.409 534.908 166.951C546.17 153.171 557.424 139.567 568.687 125.963C570.865 123.205 570.865 123.205 568.687 120.632C557.788 107.396 546.898 94.1774 536.001 81.1104C531.588 75.8035 529.213 70.1038 531.066 63.2897C531.804 60.0836 533.368 57.1326 535.6 54.7373C537.831 52.3419 540.649 50.5878 543.768 49.6534C546.887 48.719 550.194 48.6378 553.354 49.4179C556.514 50.1981 559.413 51.8118 561.757 54.0948C562.842 55.201 563.935 56.4997 565.02 57.7744C573.462 68.0996 590.412 88.3013 594.467 93.1272Z" fill="#8DBC1A"/>
              <path d="M79.6253 45.4856C99.4258 45.4856 116.494 52.2917 131.383 65.1581C139.739 72.5093 140.824 84.2695 133.759 92.1739C130.85 95.5177 126.849 97.6916 122.487 98.2994C118.125 98.9071 113.693 97.9081 109.999 95.4847C108.367 94.3783 107.092 93.0797 105.46 91.9895C86.3809 76.3653 56.7436 81.1431 43.303 101.738C28.4131 124.529 40.7607 155.961 67.6418 162.943C81.8033 166.623 94.6971 164.05 106.142 154.67C111.947 149.708 118.49 148.057 125.57 150.814C128.313 151.846 130.773 153.526 132.745 155.714C134.718 157.901 136.145 160.535 136.909 163.394C137.673 166.253 137.751 169.255 137.137 172.151C136.524 175.047 135.235 177.753 133.379 180.043C131.884 181.666 130.298 183.199 128.627 184.636C111.203 198.264 91.4024 204.301 69.4238 201.367C40.9112 197.359 19.6613 182.248 7.31376 155.961C-10.8472 117.177 5.1357 66.9779 52.7122 50.0791C61.3292 46.8913 70.4517 45.3343 79.6253 45.4856Z" fill="#E6E6E6"/>
              <rect x="675.089" y="3.13166" width="56.1296" height="56.9095" rx="27.877" stroke="#E6E6E6" strokeWidth="6.26869"/>
              <path d="M695.457 40.8973V21.3586H703.891C705.341 21.3586 706.61 21.6225 707.698 22.1504C708.785 22.6783 709.631 23.4384 710.235 24.4306C710.84 25.4228 711.142 26.6122 711.142 27.9987C711.142 29.398 710.83 30.5778 710.207 31.5382C709.59 32.4986 708.722 33.2237 707.602 33.7134C706.489 34.2031 705.188 34.448 703.7 34.448H698.663V30.3266H702.632C703.255 30.3266 703.786 30.2502 704.225 30.0976C704.67 29.9386 705.01 29.6874 705.246 29.3439C705.487 29.0004 705.608 28.552 705.608 27.9987C705.608 27.439 705.487 26.9842 705.246 26.6344C705.01 26.2782 704.67 26.0175 704.225 25.8521C703.786 25.6804 703.255 25.5945 702.632 25.5945H700.762V40.8973H695.457ZM706.906 31.9293L711.79 40.8973H706.028L701.258 31.9293H706.906Z" fill="#E6E6E6"/>
            </svg>
          </a>
        </div>

        {/* Hero Section */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                EVM Integration
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400 md:text-xl">
              Connect. Switch. Transact. Experience seamless multi-network functionality.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                {networkStats.totalNetworks} Networks
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                {networkStats.mainnets} Mainnets
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                {networkStats.testnets} Testnets
              </Badge>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="px-6 pb-24">
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="border-red-800 bg-red-900/20">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-green-800 bg-green-900/20">
                <AlertDescription className="text-green-400">{success}</AlertDescription>
              </Alert>
            )}

            {/* MetaMask Installation */}
            {!isMetaMaskInstalled() && (
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-orange-500/10">
                    <svg className="h-8 w-8 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <CardTitle className="font-heading text-2xl">MetaMask Required</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Install MetaMask to connect your wallet and start using the demo
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
                      Install MetaMask
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Wallet Connection */}
            {isMetaMaskInstalled() && (
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Wallet Connection</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Connect your MetaMask wallet to get started
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!wallet.isConnected ? (
                    <Button 
                      onClick={connectWallet} 
                      disabled={loading}
                      className="w-full bg-white text-black hover:bg-zinc-200"
                    >
                      {loading ? 'Connecting...' : 'Connect MetaMask'}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-800/50 rounded-lg">
                        <div className="space-y-2">
                          <Label className="text-zinc-400">Account</Label>
                          <div className="font-mono text-sm bg-zinc-900 px-3 py-2 rounded">
                            {shortenAddress(wallet.account!)}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-400">Balance</Label>
                          <div className="font-medium">
                            {wallet.balance ? (
                              currentNetwork 
                                ? formatNativeCurrency(wallet.balance, currentNetwork.shortName) 
                                : `${parseFloat(wallet.balance).toFixed(4)} ETH`
                            ) : 'Loading...'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="flex-1 min-w-0">
                          <Label className="text-zinc-400">Current Network</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className="border-zinc-700"
                              style={{ borderColor: currentNetwork ? getNetworkColor(currentNetwork.shortName) : '#6B7280' }}
                            >
                              {currentNetwork ? (
                                <>
                                  {getNetworkIcon(currentNetwork.shortName)} {getNetworkDisplayName(currentNetwork.shortName)}
                                </>
                              ) : (
                                'Unknown Network'
                              )}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          onClick={disconnectWallet}
                          variant="outline"
                          className="border-zinc-700 hover:border-zinc-600"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Network Switcher */}
            {wallet.isConnected && (
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Network Switcher</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Switch between different blockchain networks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-zinc-300">Select Network</Label>
                      <Select value={selectedNetwork} onValueChange={switchNetwork} disabled={loading}>
                        <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue placeholder="Select a network" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectGroup>
                            <SelectLabel className="text-zinc-300">Mainnet Networks</SelectLabel>
                            {mainnetsByLayer.L1.map(({ key, network }) => {
                              const status = networkStatuses[key];
                              return (
                                <SelectItem key={key} value={key} className="text-white focus:bg-zinc-700">
                                  <div className="flex items-center gap-2">
                                    {getNetworkIcon(key)}
                                    <span>{network.name}</span>
                                    <span className="text-xs text-zinc-400">({network.nativeCurrency.symbol})</span>
                                    <span className="ml-auto text-xs">
                                      {status ? (status.isConnected ? '🟢' : '🔴') : '⚪'}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                            {mainnetsByLayer.L2.map(({ key, network }) => {
                              const status = networkStatuses[key];
                              return (
                                <SelectItem key={key} value={key} className="text-white focus:bg-zinc-700">
                                  <div className="flex items-center gap-2">
                                    {getNetworkIcon(key)}
                                    <span>{network.name}</span>
                                    <span className="text-xs text-zinc-400">({network.nativeCurrency.symbol} • L2)</span>
                                    <span className="ml-auto text-xs">
                                      {status ? (status.isConnected ? '🟢' : '🔴') : '⚪'}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel className="text-zinc-300">Testnet Networks</SelectLabel>
                            {testnets.map(({ key, network }) => {
                              const status = networkStatuses[key];
                              return (
                                <SelectItem key={key} value={key} className="text-white focus:bg-zinc-700">
                                  <div className="flex items-center gap-2">
                                    {getNetworkIcon(key)}
                                    <span>{network.name}</span>
                                    <span className="text-xs text-zinc-400">({network.nativeCurrency.symbol})</span>
                                    <span className="ml-auto text-xs">
                                      {status ? (status.isConnected ? '🟢' : '🔴') : '⚪'}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={checkNetworkStatuses}
                      variant="outline"
                      className="border-zinc-700 hover:border-zinc-600"
                    >
                      Refresh Network Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction Form */}
            {wallet.isConnected && currentNetwork && (
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Send Transaction</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Send {currentNetwork.nativeCurrency.symbol} to any address on {currentNetwork.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="recipient" className="text-zinc-300">
                          Recipient Address
                        </Label>
                        <Input
                          id="recipient"
                          type="text"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          placeholder="0x..."
                          className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-zinc-300">
                          Amount ({currentNetwork.nativeCurrency.symbol})
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.01"
                          step="0.001"
                          min="0"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                        />
                      </div>
                    </div>
                    
                    <Button
                      onClick={sendTransaction}
                      disabled={txLoading || !recipient || !amount}
                      className="w-full bg-white text-black hover:bg-zinc-200"
                    >
                      {txLoading ? 'Sending...' : `Send ${currentNetwork.nativeCurrency.symbol}`}
                    </Button>

                    {txHash && (
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-400 font-medium">Transaction Sent</span>
                        </div>
                        <div className="text-sm text-zinc-300">
                          <strong>Hash:</strong>{' '}
                          <a
                            href={networkManager.getBlockExplorerUrl(currentNetwork.shortName, txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300 font-mono underline break-all"
                          >
                            {txHash}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Testnet Faucets */}
            {currentNetwork?.isTestnet && (
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Testnet Faucets</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Get free testnet tokens for development and testing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {testnets
                      .filter(({ key }) => key === currentNetwork.shortName)
                      .map(({ key, network, faucets }) => (
                        <div key={key} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getNetworkIcon(key)}</span>
                            <span className="font-medium">{network.name}</span>
                          </div>
                          <div className="grid gap-2">
                            {faucets.map((faucet, index) => (
                              <Button
                                key={index}
                                asChild
                                variant="outline"
                                className="border-zinc-700 hover:border-zinc-600"
                              >
                                <a href={faucet} target="_blank" rel="noopener noreferrer">
                                  Get {network.nativeCurrency.symbol} - Faucet {index + 1}
                                </a>
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <p className="text-center text-sm text-zinc-400">
              Crafted with ❤️ at{' '}
              <a 
                href="https://twitter.com/0xcapx" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-white hover:text-zinc-300 transition-colors"
              >
                Capx
              </a>
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}