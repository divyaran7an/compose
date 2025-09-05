// Main Privy integration exports
export { default as PrivyWrapper } from './config';
export { usePrivyAuth, type PrivyUser, type AuthState } from './auth';
export { usePrivyWallet, type PrivyWallet } from './wallet';

// Re-export commonly used Privy hooks
export { 
  usePrivy,
  useWallets,
  useLoginWithEmail,
  useSendTransaction,
  useCreateWallet
} from '@privy-io/react-auth'; 