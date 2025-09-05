import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthExample from '../components/AuthExample';
import FirestoreExample from '../components/FirestoreExample';
import { getCurrentUser, onAuthChange, type AuthUser } from '../lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { Loader2, Shield, Database, Zap, Rocket, ArrowRight, Copy, CheckCircle, FileText, Lock, Cloud, Sparkles } from 'lucide-react';

const FirebasePage: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    // Check if Firebase is configured
    const checkEnvConfig = () => {
      const hasConfig = !!(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      );
      setEnvConfigured(hasConfig);
    };

    checkEnvConfig();

    return () => unsubscribe();
  }, []);

  const handleCopyEnvCommand = () => {
    navigator.clipboard.writeText('cp .env.example .env.local');
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        <div className="relative flex h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto mb-4" />
            <p className="text-zinc-400">Loading Firebase...</p>
          </div>
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
        <section className="px-6 pt-8 pb-16">
          <div className="mx-auto max-w-6xl text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                Ship Firebase Apps
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400 md:text-xl">
              Authentication configured. Real-time database ready. Deploy powerful apps instantly.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                <Shield className="mr-1 h-3 w-3" />
                Auth Ready
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                <Database className="mr-1 h-3 w-3" />
                Live Database
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                <Zap className="mr-1 h-3 w-3" />
                Real-time Sync
              </Badge>
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                <Rocket className="mr-1 h-3 w-3" />
                Production Ready
              </Badge>
            </div>
          </div>
        </section>

        {/* Environment Setup Alert */}
        {!envConfigured && (
          <section className="px-6 pb-8">
            <div className="mx-auto max-w-4xl">
              <Alert className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-medium text-white mb-1">Quick Start</p>
                    <p className="text-zinc-400">Copy .env.example to .env.local and add your Firebase credentials</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyEnvCommand}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white"
                  >
                    {copiedEnv ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Command
                      </>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          </section>
        )}

        {/* Main Content */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-6xl">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-zinc-900/50 backdrop-blur border border-zinc-800">
                <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800">
                  <FileText className="mr-2 h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="auth" className="data-[state=active]:bg-zinc-800">
                  <Lock className="mr-2 h-4 w-4" />
                  Authentication
                </TabsTrigger>
                <TabsTrigger value="firestore" className="data-[state=active]:bg-zinc-800">
                  <Database className="mr-2 h-4 w-4" />
                  Firestore Database
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-8 space-y-8">
                {/* Feature Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-heading">
                        <Shield className="h-5 w-5" />
                        Authentication
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Complete authentication system with email/password, social login, and secure session management
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2 text-sm text-zinc-300">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Email/Password Authentication
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Google OAuth Integration
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Password Reset Functionality
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Real-time Auth State
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          User Profile Management
                        </li>
                      </ul>
                      <Button 
                        className="w-full bg-white text-black hover:bg-zinc-200"
                        onClick={() => document.querySelector('[data-value="auth"]')?.click()}
                      >
                        Try Authentication
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-heading">
                        <Database className="h-5 w-5" />
                        Firestore Database
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Real-time NoSQL database with offline support, live sync, and granular security rules
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2 text-sm text-zinc-300">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Complete CRUD Operations
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Real-time Data Sync
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Advanced Querying & Filtering
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          User-specific Data Isolation
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Server Timestamps
                        </li>
                      </ul>
                      <Button 
                        className="w-full bg-white text-black hover:bg-zinc-200"
                        disabled={!user}
                        onClick={() => document.querySelector('[data-value="firestore"]')?.click()}
                      >
                        {user ? 'Try Firestore' : 'Sign In Required'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Setup Guide */}
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-heading">
                      <Rocket className="h-5 w-5" />
                      Quick Setup Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold">
                          1
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-medium">Create Firebase Project</h4>
                          <p className="text-sm text-zinc-400">
                            Go to{' '}
                            <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-white underline">
                              Firebase Console
                            </a>{' '}
                            and create a new project
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold">
                          2
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-medium">Enable Authentication</h4>
                          <p className="text-sm text-zinc-400">
                            Enable Email/Password and Google sign-in methods in Authentication settings
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold">
                          3
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-medium">Create Firestore Database</h4>
                          <p className="text-sm text-zinc-400">
                            Set up Firestore in production mode with appropriate security rules
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold">
                          4
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-medium">Configure Environment Variables</h4>
                          <p className="text-sm text-zinc-400">
                            Add your Firebase config to environment variables (see README.md)
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tech Stack */}
                <div>
                  <h2 className="mb-6 text-center text-2xl font-bold">Technology Stack</h2>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                        <Cloud className="mb-2 h-8 w-8 text-zinc-400" />
                        <h3 className="font-medium">Firebase SDK v10+</h3>
                        <p className="text-sm text-zinc-400">Latest modular SDK</p>
                      </CardContent>
                    </Card>
                    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                        <FileText className="mb-2 h-8 w-8 text-zinc-400" />
                        <h3 className="font-medium">TypeScript</h3>
                        <p className="text-sm text-zinc-400">Type safety</p>
                      </CardContent>
                    </Card>
                    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                        <Zap className="mb-2 h-8 w-8 text-zinc-400" />
                        <h3 className="font-medium">React Hooks</h3>
                        <p className="text-sm text-zinc-400">Modern patterns</p>
                      </CardContent>
                    </Card>
                    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                        <Database className="mb-2 h-8 w-8 text-zinc-400" />
                        <h3 className="font-medium">Real-time Updates</h3>
                        <p className="text-sm text-zinc-400">Live sync</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="auth" className="mt-8">
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                  <CardContent className="p-0">
                    <AuthExample />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="firestore" className="mt-8">
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                  <CardContent className="p-0">
                    <FirestoreExample />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>

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
};

export default FirebasePage;