"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { BrowserProvider, JsonRpcSigner, Eip1193Provider } from "ethers";

type WalletContextType = {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  eip1193Provider: Eip1193Provider | null;
  browserProvider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [eip1193Provider, setEip1193Provider] = useState<Eip1193Provider | null>(null);
  const [browserProvider, setBrowserProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  // Silent reconnect on page load
  useEffect(() => {
    const silentReconnect = async () => {
      const connected = localStorage.getItem("wallet.connected");
      const lastAddress = localStorage.getItem("wallet.lastAccounts");

      if (connected === "true" && lastAddress && window.ethereum) {
        try {
          // Use eth_accounts (no user prompt)
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          
          if (accounts && accounts.length > 0 && accounts[0] === lastAddress) {
            const bp = new BrowserProvider(window.ethereum as Eip1193Provider);
            const network = await bp.getNetwork();
            const s = await bp.getSigner();
            
            setEip1193Provider(window.ethereum as Eip1193Provider);
            setBrowserProvider(bp);
            setSigner(s);
            setAddress(accounts[0]);
            setChainId(Number(network.chainId));
            
            console.log("✅ Wallet reconnected silently");
          } else {
            // Clear stale data
            localStorage.removeItem("wallet.connected");
            localStorage.removeItem("wallet.lastAccounts");
            localStorage.removeItem("wallet.lastChainId");
          }
        } catch (error) {
          console.error("Silent reconnect failed:", error);
        }
      }
    };

    silentReconnect();
  }, []);

  // Event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        localStorage.setItem("wallet.lastAccounts", accounts[0]);
      }
    };

    const handleChainChanged = async (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      localStorage.setItem("wallet.lastChainId", String(newChainId));
      // Reload provider with new chain
      if (window.ethereum) {
        const bp = new BrowserProvider(window.ethereum as Eip1193Provider);
        const s = await bp.getSigner();
        setBrowserProvider(bp);
        setSigner(s);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet");
      return;
    }

    try {
      // Use eth_requestAccounts (with user prompt)
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      
      if (accounts && accounts.length > 0) {
        const bp = new BrowserProvider(window.ethereum as Eip1193Provider);
        const network = await bp.getNetwork();
        const s = await bp.getSigner();
        
        setEip1193Provider(window.ethereum as Eip1193Provider);
        setBrowserProvider(bp);
        setSigner(s);
        setAddress(accounts[0]);
        setChainId(Number(network.chainId));

        // Persist connection state
        localStorage.setItem("wallet.connected", "true");
        localStorage.setItem("wallet.lastAccounts", accounts[0]);
        localStorage.setItem("wallet.lastChainId", String(network.chainId));

        console.log("✅ Wallet connected:", accounts[0]);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setEip1193Provider(null);
    setBrowserProvider(null);
    setSigner(null);

    // Clear persistence
    localStorage.removeItem("wallet.connected");
    localStorage.removeItem("wallet.lastAccounts");
    localStorage.removeItem("wallet.lastChainId");

    console.log("✅ Wallet disconnected");
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected: !!address,
        eip1193Provider,
        browserProvider,
        signer,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

