import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

// Simple Privy Provider wrapper following official docs
interface PrivyWrapperProps {
  children: React.ReactNode;
}

export default function PrivyWrapper({ children }: PrivyWrapperProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>⚠️ Configuration Error</h2>
        <p>Please set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in your environment variables.</p>
        <p>Check the setup.md file for instructions.</p>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
        loginMethods: ['email'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
} 