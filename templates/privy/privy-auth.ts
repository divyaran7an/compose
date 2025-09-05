import { usePrivy, useLoginWithEmail } from '@privy-io/react-auth';

// Privy Authentication Utilities
// Reference: https://docs.privy.io/authentication/user-authentication/login-methods/email

export function usePrivyAuth() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithEmail();

  return {
    ready,
    authenticated,
    user,
    logout,
    sendCode,
    loginWithCode
  };
}

export type PrivyUser = {
  id: string;
  email?: {
    address: string;
  };
  createdAt: Date;
};

export interface AuthState {
  ready: boolean;
  authenticated: boolean;
  user: PrivyUser | null;
} 