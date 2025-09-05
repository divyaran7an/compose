import { usePrivy, useWallets, useSendTransaction, useCreateWallet } from '@privy-io/react-auth';

// Privy Wallet Utilities
// References:
// - Creating Wallet: https://docs.privy.io/wallets/wallets/create/from-my-client
// - Exporting Private Key: https://docs.privy.io/wallets/wallets/export
// - Send Transaction: https://docs.privy.io/wallets/using-wallets/ethereum/send-a-transaction

export function usePrivyWallet() {
  const { authenticated, exportWallet } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const { createWallet } = useCreateWallet();

  const sendETH = async (recipient: string, amount: string) => {
    try {
      const transaction = await sendTransaction({
        to: recipient,
        value: amount
      });
      return transaction;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  };

  const handleExportWallet = async (walletAddress: string) => {
    try {
      await exportWallet();
    } catch (error) {
      console.error('Failed to export wallet:', error);
      throw error;
    }
  };

  return {
    authenticated,
    wallets,
    createWallet,
    sendETH,
    exportWallet: handleExportWallet
  };
}

export type PrivyWallet = {
  address: string;
  chainType: 'ethereum' | 'solana';
  walletClientType: string;
}; 