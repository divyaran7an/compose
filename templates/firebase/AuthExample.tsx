import React, { useState, useEffect } from 'react';
import {
  signIn,
  createUser,
  signInWithGoogle,
  signOut,
  resetPassword,
  onAuthChange,
  getCurrentUser,
  type AuthUser,
} from '../lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { Loader2, LogOut, User, Mail, KeyRound, AlertCircle, CheckCircle, Chrome } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'reset';

const AuthExample: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (authMode === 'signin') {
        const result = await signIn(formData.email, formData.password);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess('Successfully signed in!');
          setFormData({ email: '', password: '', displayName: '' });
        }
      } else if (authMode === 'signup') {
        const result = await createUser(
          formData.email,
          formData.password,
          formData.displayName
        );
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess('Account created successfully!');
          setFormData({ email: '', password: '', displayName: '' });
        }
      } else if (authMode === 'reset') {
        const result = await resetPassword(formData.email);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess('Password reset email sent! Check your inbox.');
          setFormData({ email: '', password: '', displayName: '' });
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Successfully signed in with Google!');
      }
    } catch (err) {
      setError('Failed to sign in with Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      const result = await signOut();
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Successfully signed out!');
        setFormData({ email: '', password: '', displayName: '' });
      }
    } catch (err) {
      setError('Failed to sign out');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if Firebase is configured first, before showing loading state
  const isConfigured = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );

  if (!isConfigured) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Alert className="border-zinc-800 bg-zinc-900/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Firebase not configured. Copy <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">.env.example</code> to <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">.env.local</code> and add your Firebase credentials.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto mb-4" />
        <p className="text-zinc-400">Loading authentication...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-6">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="font-heading">Welcome back!</CardTitle>
            <CardDescription className="text-zinc-400">
              You're signed in to your Firebase account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback className="bg-zinc-800">
                  <User className="h-8 w-8 text-zinc-400" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                {user.displayName && (
                  <p className="font-medium">{user.displayName}</p>
                )}
                <p className="text-sm text-zinc-400">{user.email}</p>
                <p className="text-xs text-zinc-500">ID: {user.uid}</p>
              </div>
            </div>
            
            <Separator className="bg-zinc-800" />
            
            <Button
              onClick={handleSignOut}
              disabled={isSubmitting}
              variant="destructive"
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </>
              )}
            </Button>
          </CardContent>
        </Card>

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

  // If not loading and no user, show the sign-in form
  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="font-heading text-center">Firebase Authentication</CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Sign in to access all features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full" onValueChange={(value) => setAuthMode(value as AuthMode)}>
            <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="reset">Reset</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-zinc-300">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                    className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-zinc-300">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-black hover:bg-zinc-200"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Sign In with Email
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-zinc-300">Display Name (Optional)</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-zinc-300">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                    className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-zinc-300">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password (min 6 characters)"
                    required
                    minLength={6}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-black hover:bg-zinc-200"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="reset" className="mt-6">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-zinc-300">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                    className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-black hover:bg-zinc-200"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Send Reset Email
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {authMode !== 'reset' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-400">Or continue with</span>
                </div>
              </div>
              
              <Button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                variant="secondary"
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Chrome className="mr-2 h-4 w-4" />
                    Continue with Google
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

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

export default AuthExample;