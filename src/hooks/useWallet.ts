
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WalletAccount {
  address: string;
  balance: number;
  isConnected: boolean;
  createdAt: number;
}

interface WalletState {
  currentAccount: WalletAccount | null;
  accounts: WalletAccount[];
  isConnecting: boolean;
}

const STORAGE_KEY = 'monad_wallet_accounts';
const CURRENT_ACCOUNT_KEY = 'monad_current_account';

export const useWallet = () => {
  const { toast } = useToast();
  const [walletState, setWalletState] = useState<WalletState>({
    currentAccount: null,
    accounts: [],
    isConnecting: false
  });

  // Load wallet data from localStorage
  useEffect(() => {
    const savedAccounts = localStorage.getItem(STORAGE_KEY);
    const savedCurrentAddress = localStorage.getItem(CURRENT_ACCOUNT_KEY);
    
    if (savedAccounts) {
      const accounts: WalletAccount[] = JSON.parse(savedAccounts);
      const currentAccount = savedCurrentAddress 
        ? accounts.find(acc => acc.address === savedCurrentAddress) || null
        : null;
      
      setWalletState({
        currentAccount,
        accounts,
        isConnecting: false
      });
    }
  }, []);

  // Save accounts to localStorage
  const saveAccountsToStorage = (accounts: WalletAccount[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  };

  // Generate a fake wallet address
  const generateWalletAddress = (): string => {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  };

  // Create new wallet account
  const createAccount = async (): Promise<WalletAccount> => {
    const newAccount: WalletAccount = {
      address: generateWalletAddress(),
      balance: 0,
      isConnected: false,
      createdAt: Date.now()
    };
    
    return newAccount;
  };

  // Connect wallet
  const connectWallet = async () => {
    setWalletState(prev => ({ ...prev, isConnecting: true }));
    
    try {
      // Simulate wallet connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let accountToConnect: WalletAccount;
      
      if (walletState.accounts.length === 0) {
        // Create first account
        accountToConnect = await createAccount();
        const newAccounts = [accountToConnect];
        saveAccountsToStorage(newAccounts);
        
        setWalletState(prev => ({
          ...prev,
          accounts: newAccounts,
          currentAccount: { ...accountToConnect, isConnected: true },
          isConnecting: false
        }));
      } else {
        // Use existing account or create new one
        accountToConnect = walletState.accounts[0];
        const updatedAccount = { ...accountToConnect, isConnected: true };
        const updatedAccounts = walletState.accounts.map(acc => 
          acc.address === accountToConnect.address ? updatedAccount : acc
        );
        
        saveAccountsToStorage(updatedAccounts);
        setWalletState(prev => ({
          ...prev,
          accounts: updatedAccounts,
          currentAccount: updatedAccount,
          isConnecting: false
        }));
      }
      
      localStorage.setItem(CURRENT_ACCOUNT_KEY, accountToConnect.address);
      
      toast({
        title: "Wallet Connected! 🚀",
        description: `Connected to ${accountToConnect.address.slice(0, 6)}...${accountToConnect.address.slice(-4)}`,
        className: "border-green-500 bg-green-500/10"
      });
      
    } catch (error) {
      setWalletState(prev => ({ ...prev, isConnecting: false }));
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    if (walletState.currentAccount) {
      const updatedAccount = { ...walletState.currentAccount, isConnected: false };
      const updatedAccounts = walletState.accounts.map(acc => 
        acc.address === updatedAccount.address ? updatedAccount : acc
      );
      
      saveAccountsToStorage(updatedAccounts);
      localStorage.removeItem(CURRENT_ACCOUNT_KEY);
      
      setWalletState(prev => ({
        ...prev,
        accounts: updatedAccounts,
        currentAccount: null
      }));
      
      toast({
        title: "Wallet Disconnected",
        description: "Successfully disconnected from wallet",
      });
    }
  };

  // Update balance
  const updateBalance = (newBalance: number) => {
    if (walletState.currentAccount) {
      const updatedAccount = { ...walletState.currentAccount, balance: newBalance };
      const updatedAccounts = walletState.accounts.map(acc => 
        acc.address === updatedAccount.address ? updatedAccount : acc
      );
      
      saveAccountsToStorage(updatedAccounts);
      setWalletState(prev => ({
        ...prev,
        accounts: updatedAccounts,
        currentAccount: updatedAccount
      }));
    }
  };

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    updateBalance,
    isConnected: walletState.currentAccount?.isConnected || false,
    balance: walletState.currentAccount?.balance || 0,
    address: walletState.currentAccount?.address
  };
};
