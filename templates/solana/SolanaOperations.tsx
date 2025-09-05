import React, { FC, useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionSignature,
  clusterApiUrl,
} from '@solana/web3.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { 
  Loader2, 
  RefreshCw, 
  Send, 
  Coins, 
  AlertCircle, 
  CheckCircle, 
  DollarSign, 
  Zap,
  Copy,
  Wallet as WalletIcon
} from 'lucide-react';

interface SolanaOperationsProps {
  className?: string;
}

interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

export const SolanaOperations: FC<SolanaOperationsProps> = ({ className }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  // State management
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [airdropAmount, setAirdropAmount] = useState('1');

  // Clear messages after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Get SOL balance for connected wallet
  const getBalance = useCallback(async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
      setSuccess(`Balance updated: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch balance. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  // Request airdrop (devnet/testnet only)
  const requestAirdrop = useCallback(async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }

    const amount = parseFloat(airdropAmount);
    if (isNaN(amount) || amount <= 0 || amount > 5) {
      setError('Please enter a valid amount between 0.1 and 5 SOL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );

      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      setSuccess(`Airdrop successful! ${amount} SOL added to your wallet.`);
      
      // Refresh balance
      await getBalance();
    } catch (err) {
      console.error('Error requesting airdrop:', err);
      setError('Airdrop failed. Make sure you\'re on devnet/testnet and haven\'t exceeded rate limits.');
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, airdropAmount, getBalance]);

  // Send SOL to another address
  const sendSOL = useCallback(async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }

    if (!recipientAddress) {
      setError('Please enter a recipient address');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate recipient address
      const recipientPubkey = new PublicKey(recipientAddress);
      
      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      setSuccess(`Transaction successful! Sent ${amount} SOL to ${recipientAddress.slice(0, 8)}...`);
      
      // Clear form and refresh balance
      setRecipientAddress('');
      setTransferAmount('');
      await getBalance();
    } catch (err) {
      console.error('Error sending transaction:', err);
      if (err instanceof Error) {
        setError(`Transaction failed: ${err.message}`);
      } else {
        setError('Transaction failed. Please check your inputs and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, sendTransaction, recipientAddress, transferAmount, getBalance]);

  // Auto-fetch balance when wallet connects
  useEffect(() => {
    if (publicKey) {
      getBalance();
    } else {
      setBalance(null);
    }
  }, [publicKey, getBalance]);

  if (!publicKey) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
            <WalletIcon className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-200 mb-2">Wallet Required</h3>
          <p className="text-zinc-400 text-sm">
            Please connect your Solana wallet to access blockchain operations like balance checking, airdrops, and SOL transfers.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setSuccess('Address copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-xl flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Solana Operations
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Manage your SOL balance, request airdrops, and send transactions on Solana devnet
        </CardDescription>
      </CardHeader>

      {/* Wallet Info Card */}
      <Card className="border-zinc-800 bg-zinc-800/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <WalletIcon className="h-5 w-5" />
            Wallet Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Address</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyAddress}
              className="h-6 px-2"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs font-mono text-zinc-400 break-all bg-zinc-900 p-2 rounded">
            {publicKey?.toString()}
          </p>
          
          <Separator className="bg-zinc-700" />
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Balance</span>
            <Badge variant={balance !== null && balance > 0 ? "default" : "secondary"} className="font-mono">
              {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
            </Badge>
          </div>
          
          <Button
            onClick={getBalance}
            disabled={loading}
            variant="outline"
            className="w-full border-zinc-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Balance
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Airdrop Card */}
      <Card className="border-zinc-800 bg-zinc-800/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Request Airdrop
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Get test SOL on devnet/testnet for experimenting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="number"
              value={airdropAmount}
              onChange={(e) => setAirdropAmount(e.target.value)}
              placeholder="Amount (SOL)"
              min="0.1"
              max="5"
              step="0.1"
              className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400"
            />
            <Button
              onClick={requestAirdrop}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Airdrop
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Maximum 5 SOL per request on devnet/testnet. Rate limits may apply.
          </p>
        </CardContent>
      </Card>

      {/* Send Transaction Card */}
      <Card className="border-zinc-800 bg-zinc-800/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send SOL
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Transfer SOL to another Solana address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="Recipient wallet address (e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM)"
              className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400 font-mono text-sm"
            />
            <Input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="Amount (SOL)"
              min="0.001"
              step="0.001"
              className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400"
            />
            <Button
              onClick={sendSOL}
              disabled={loading || !recipientAddress || !transferAmount}
              className="w-full bg-white text-black hover:bg-zinc-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send SOL
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive" className="border-red-800 bg-red-900/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-800 bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-200">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SolanaOperations; 