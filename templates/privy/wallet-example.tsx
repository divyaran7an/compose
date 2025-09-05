import { useState } from 'react';
import { usePrivy, useWallets, useSendTransaction, useCreateWallet } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { 
  Loader2, 
  Wallet, 
  Send, 
  Key, 
  PenTool, 
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Plus,
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';

export default function WalletExample() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Privy hooks
  const { authenticated, exportWallet } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const { createWallet } = useCreateWallet();

  if (!authenticated) {
    return (
      <div className="p-6">
        <Alert className="border-zinc-800 bg-zinc-900/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please authenticate first to use Privy wallet features.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

  const handleCreateWallet = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await createWallet();
      setSuccess('Privy wallet created successfully!');
    } catch (error: any) {
      console.error('Error creating wallet:', error);
      setError(error.message || 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportWallet = async () => {
    if (!embeddedWallet) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await exportWallet();
      setSuccess('Private key exported securely via Privy');
    } catch (error: any) {
      console.error('Error exporting wallet:', error);
      setError(error.message || 'Failed to export wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTransaction = async () => {
    if (!recipient || !amount || !embeddedWallet) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const txReceipt = await sendTransaction({
        to: recipient,
        value: parseFloat(amount),
      });
      console.log('Transaction sent:', txReceipt);
      setSuccess('Transaction sent successfully!');
      setRecipient('');
      setAmount('');
    } catch (error: any) {
      console.error('Error sending transaction:', error);
      setError(error.message || 'Failed to send transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignMessage = async () => {
    if (!message || !embeddedWallet) return;
    
    setError('Message signing requires additional wallet provider setup. See Privy docs for implementation.');
  };

  const handleCopyAddress = () => {
    if (embeddedWallet?.address) {
      navigator.clipboard.writeText(embeddedWallet.address);
      setSuccess('Address copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Wallet Status */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Privy Embedded Wallet
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Manage your Privy wallet and perform blockchain operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {embeddedWallet ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Address</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyAddress}
                      className="h-6 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs font-mono text-zinc-400 break-all bg-zinc-800 p-2 rounded">
                    {embeddedWallet.address}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Chain ID</span>
                  <span className="text-sm text-zinc-400">{embeddedWallet.chainId}</span>
                </div>
              </div>
              
              <Button
                onClick={handleExportWallet}
                variant="outline"
                className="w-full border-zinc-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Key className="mr-2 h-4 w-4" />
                )}
                Export Private Key
              </Button>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
                <Wallet className="h-8 w-8 text-zinc-400" />
              </div>
              <p className="text-zinc-400">No Privy wallet found</p>
              <Button 
                onClick={handleCreateWallet}
                disabled={isLoading}
                className="bg-white text-black hover:bg-zinc-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Privy Wallet
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {embeddedWallet && (
        <>
          {/* Export Warning */}
          <Alert className="border-amber-800/50 bg-amber-900/20">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-200">
              <strong>Security Notice:</strong> Exporting your private key will display it on screen. 
              Keep it secure and never share it with anyone. Privy handles this securely.
            </AlertDescription>
          </Alert>

          {/* Send Transaction */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Transaction
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Send ETH to another address using your Privy wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-zinc-300">Recipient Address</Label>
                <Input
                  id="recipient"
                  type="text"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 font-mono text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-zinc-300">Amount (ETH)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.001"
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                />
              </div>
              
              <Button 
                onClick={handleSendTransaction}
                disabled={!recipient || !amount || isLoading}
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Transaction
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Sign Message */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Sign Message
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Sign a message with your Privy wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message" className="text-zinc-300">Message</Label>
                <Input
                  id="message"
                  type="text"
                  placeholder="Enter message to sign"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                />
              </div>
              
              <Button 
                onClick={handleSignMessage}
                disabled={!message || isLoading}
                variant="secondary"
                className="w-full bg-zinc-800 hover:bg-zinc-700"
              >
                <PenTool className="mr-2 h-4 w-4" />
                Sign Message
              </Button>
              
              <Alert className="border-zinc-800">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-zinc-400 text-xs">
                  Message signing requires additional wallet provider setup. 
                  See{' '}
                  <a 
                    href="https://docs.privy.io/wallets/using-wallets/ethereum/sign-a-message" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white underline inline-flex items-center gap-1"
                  >
                    Privy docs
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {' '}for implementation details.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}

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
}