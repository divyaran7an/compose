import { useState } from 'react';
import { usePrivy, useLoginWithEmail } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Loader2, Mail, LogOut, User, Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function AuthExample() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Main Privy hooks
  const { ready, authenticated, user, logout } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithEmail();

  // Loading state
  if (!ready) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto mb-4" />
        <p className="text-zinc-400">Loading Privy...</p>
      </div>
    );
  }

  // Authenticated state
  if (authenticated) {
    return (
      <div className="p-6 space-y-6">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Authenticated with Privy
            </CardTitle>
            <CardDescription className="text-zinc-400">
              You're signed in and ready to use Privy features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User className="h-6 w-6 text-zinc-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">User ID</p>
                  <p className="text-xs text-zinc-400 font-mono">{user?.id}</p>
                </div>
              </div>
              
              <Separator className="bg-zinc-800" />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium">Email</span>
                </div>
                <p className="text-sm text-zinc-300 pl-6">{user?.email?.address}</p>
              </div>
            </div>
            
            <Button 
              onClick={logout}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email input state
  const handleSendCode = async () => {
    if (!email) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await sendCode({ email });
      setSuccess('Verification code sent! Check your email.');
    } catch (error: any) {
      console.error('Error sending code:', error);
      setError(error.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Login with code
  const handleLogin = async () => {
    if (!code) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await loginWithCode({ code });
      setSuccess('Successfully logged in!');
    } catch (error: any) {
      console.error('Error logging in:', error);
      setError(error.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Privy Email Authentication
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Sign in securely with your email address using Privy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Input Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                />
                <Button 
                  onClick={handleSendCode}
                  disabled={!email || isLoading}
                  className="bg-white text-black hover:bg-zinc-200"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                We'll send a verification code to your email
              </p>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Verification Code Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-zinc-300">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isLoading}
                className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
              />
              <p className="text-xs text-zinc-500">
                Check your email for the verification code
              </p>
            </div>
            
            <Button 
              onClick={handleLogin}
              disabled={!code || isLoading}
              className="w-full bg-white text-black hover:bg-zinc-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Sign In with Code
                </>
              )}
            </Button>
          </div>

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
        </CardContent>
      </Card>

      {/* Privy Info */}
      <Alert className="border-zinc-800 bg-zinc-900/50">
        <Mail className="h-4 w-4" />
        <AlertDescription className="text-zinc-300">
          <strong>Powered by Privy:</strong> This authentication flow is handled securely by Privy's infrastructure. 
          No passwords are stored - just email verification codes.
        </AlertDescription>
      </Alert>
    </div>
  );
}