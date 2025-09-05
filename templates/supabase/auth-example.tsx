import React, { useState, useEffect } from 'react';
import { createClient, User, Session, AuthError } from '@supabase/supabase-js';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { Shield, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Key, Copy, User as UserIcon, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

// Supabase client setup (works for both local dev and Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Auth mode type
type AuthMode = 'signin' | 'signup' | 'reset';

// User profile interface
interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  email_confirmed_at: string | null;
}

export default function SupabaseAuthPage() {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Show configuration error if Supabase is not set up
  if (!supabase) {
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
                  Ship Auth Apps
                </span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400 md:text-xl">
                Complete authentication system. Social login. Everything configured.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  <Shield className="mr-1 h-3 w-3" />
                  Secure Auth
                </Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  <Mail className="mr-1 h-3 w-3" />
                  Email/Password
                </Badge>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  <UserIcon className="mr-1 h-3 w-3" />
                  Social Login
                </Badge>
              </div>
            </div>
          </section>

          {/* Configuration Alert */}
          <div className="px-6 pb-24">
            <div className="mx-auto max-w-4xl">
              <Alert variant="destructive" className="border-red-800 bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-4">
                    <div>
                      <strong>Configuration Required</strong> - Set up your Supabase environment variables:
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span>1. Copy environment variables:</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key')}
                          className="h-6 px-2 text-xs border-zinc-700"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div>2. Add to your <code className="bg-red-950 px-1 rounded">.env.local</code> file</div>
                      <div>3. Get values from your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-red-300 hover:text-red-200 underline">Supabase Dashboard</a></div>
                      <div>4. Enable email/password auth in Authentication settings</div>
                      <div>5. Restart your development server</div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-auto">
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

  // Initialize auth state and set up listener
  useEffect(() => {
    // Get initial session
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user);
      }
      setInitialLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user);
        if (event === 'SIGNED_IN') {
          setMessage('Successfully signed in!');
        }
      } else {
        setUserProfile(null);
        if (event === 'SIGNED_OUT') {
          setMessage('Successfully signed out!');
        }
      }
      
      // Clear messages after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user profile information
  async function loadUserProfile(user: User) {
    try {
      const profile: UserProfile = {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || '',
        email_confirmed_at: user.email_confirmed_at || null
      };
      setUserProfile(profile);
    } catch (err: any) {
      console.error('Error loading user profile:', err);
    }
  }

  // Clear form and messages
  function clearForm() {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setMessage(null);
  }

  // Validate form inputs
  function validateForm(): string | null {
    if (!email.trim()) return 'Email is required';
    if (!email.includes('@')) return 'Please enter a valid email';
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (authMode === 'signup' && password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (authMode === 'signin') {
        await handleSignIn();
      } else if (authMode === 'signup') {
        await handleSignUp();
      } else if (authMode === 'reset') {
        await handlePasswordReset();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  // Sign in with email and password
  async function handleSignIn() {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) throw error;
    
    if (data.user) {
      clearForm();
      setMessage('Sign in successful!');
    }
  }

  // Sign up with email and password
  async function handleSignUp() {
    const { data, error } = await supabase!.auth.signUp({
      email: email.trim(),
      password: password
    });

    if (error) throw error;

    if (data.user) {
      clearForm();
      if (data.user.email_confirmed_at) {
        setMessage('Account created and signed in successfully!');
      } else {
        setMessage('Account created! Please check your email to confirm your account.');
      }
    }
  }

  // Send password reset email
  async function handlePasswordReset() {
    const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;

    setMessage('Password reset email sent! Check your inbox.');
    clearForm();
  }

// Sign out
  async function handleSignOut() {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase!.auth.signOut();
      if (error) throw error;
      clearForm();
    } catch (err: any) {
      setError(err.message || 'Error signing out');
    } finally {
      setLoading(false);
    }
  }

  // Sign in with Google (example social provider)
  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Error signing in with Google');
      setLoading(false);
    }
  }

  // Format date for display
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  // Show loading spinner during initial load
  if (initialLoading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-zinc-400">Loading authentication state...</div>
        </div>
      </main>
    );
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
        <section className="px-6 py-8 pb-4">
          <div className="mx-auto max-w-6xl text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                Ship Auth Apps
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400 md:text-xl">
              Complete authentication demo. Social login enabled.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                <Shield className="mr-1 h-3 w-3" />
                Secure Auth
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                <Mail className="mr-1 h-3 w-3" />
                Email/Password
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                <UserIcon className="mr-1 h-3 w-3" />
                Social Login
              </Badge>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="px-6 pb-24">
          <div className="mx-auto max-w-lg space-y-8">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="border-red-800 bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {message && (
              <Alert className="border-green-800 bg-green-900/20">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-400">{message}</AlertDescription>
              </Alert>
            )}

            {user ? (
              // Authenticated user view
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <CardTitle className="font-heading text-xl">Welcome back!</CardTitle>
                      <CardDescription className="text-zinc-400">
                        You're successfully authenticated
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-zinc-400">Email Address</Label>
                        <div className="bg-zinc-800/50 px-3 py-2 rounded-md text-sm font-mono">
                          {userProfile?.email}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-400">User ID</Label>
                        <div className="bg-zinc-800/50 px-3 py-2 rounded-md text-sm font-mono break-all">
                          {userProfile?.id}
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="bg-zinc-800" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        <div>
                          <div className="text-zinc-400">Account created</div>
                          <div className="text-zinc-200">
                            {userProfile?.created_at && formatDate(userProfile.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4 text-zinc-400" />
                        <div>
                          <div className="text-zinc-400">Last sign in</div>
                          <div className="text-zinc-200">
                            {userProfile?.last_sign_in_at && formatDate(userProfile.last_sign_in_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-zinc-400" />
                        <div>
                          <div className="text-zinc-400">Email status</div>
                          <div className="flex items-center gap-1">
                            {userProfile?.email_confirmed_at ? (
                              <><CheckCircle className="h-3 w-3 text-green-500" /><span className="text-green-400">Verified</span></>
                            ) : (
                              <><AlertCircle className="h-3 w-3 text-amber-500" /><span className="text-amber-400">Pending</span></>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSignOut}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {loading ? 'Signing out...' : 'Sign Out'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              // Authentication form
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl text-center">Authentication</CardTitle>
                  <CardDescription className="text-zinc-400 text-center">
                    Sign in to your account or create a new one
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={authMode} onValueChange={(value) => { setAuthMode(value as AuthMode); clearForm(); }} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-zinc-800/50">
                      <TabsTrigger value="signin" className="data-[state=active]:bg-zinc-700">
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="data-[state=active]:bg-zinc-700">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Sign Up
                      </TabsTrigger>
                      <TabsTrigger value="reset" className="data-[state=active]:bg-zinc-700">
                        <Key className="h-4 w-4 mr-2" />
                        Reset
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value={authMode} className="space-y-4 mt-6">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-zinc-300">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            placeholder="Enter your email"
                            className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                            required
                          />
                        </div>

                        {authMode !== 'reset' && (
                          <div className="space-y-2">
                            <Label htmlFor="password" className="text-zinc-300">Password</Label>
                            <div className="relative">
                              <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                placeholder="Enter your password"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 pr-10"
                                required
                              />
                              <Button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1 bg-transparent hover:bg-transparent text-zinc-400 hover:text-white"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        )}

                        {authMode === 'signup' && (
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
                            <Input
                              id="confirmPassword"
                              type={showPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              disabled={loading}
                              placeholder="Confirm your password"
                              className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                              required
                            />
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-white text-black hover:bg-zinc-200"
                        >
                          {loading ? 'Processing...' : 
                           authMode === 'signin' ? 'Sign In' :
                           authMode === 'signup' ? 'Create Account' :
                           'Send Reset Email'}
                        </Button>
                      </form>

                      {/* Social login */}
                      {authMode !== 'reset' && (
                        <>
                          <Separator className="bg-zinc-800" />
                          <div className="text-center text-sm text-zinc-400">
                            or continue with
                          </div>
                          <Button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            variant="outline"
                            className="w-full border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800"
                          >
                            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continue with Google
                          </Button>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Features Documentation */}
            <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="font-heading text-xl">Authentication Features</CardTitle>
                <CardDescription className="text-zinc-400">
                  Complete auth system with advanced security features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-zinc-200">Email/Password</div>
                        <div className="text-sm text-zinc-400">Sign up, sign in, and password reset</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-zinc-200">Session Management</div>
                        <div className="text-sm text-zinc-400">Automatic session handling and persistence</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-zinc-200">Social Login</div>
                        <div className="text-sm text-zinc-400">Google OAuth integration (configurable)</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-zinc-200">Real-time Auth</div>
                        <div className="text-sm text-zinc-400">Auth state changes with event listeners</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-zinc-200">User Profile</div>
                        <div className="text-sm text-zinc-400">Display user information and account details</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-zinc-200">Form Validation</div>
                        <div className="text-sm text-zinc-400">Client-side validation with error handling</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-zinc-200">Security</div>
                        <div className="text-sm text-zinc-400">Password visibility toggle and secure practices</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-zinc-200">TypeScript</div>
                        <div className="text-sm text-zinc-400">Full type safety with interfaces</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-6 bg-zinc-800" />
                
                <div className="space-y-2">
                  <h3 className="font-medium text-zinc-200">Setup Instructions</h3>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• Enable email/password auth in your Supabase dashboard</div>
                    <div>• Configure OAuth providers in Authentication → Settings</div>
                    <div>• Set up email templates for password reset and confirmation</div>
                    <div>• Configure redirect URLs for production deployment</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto">
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