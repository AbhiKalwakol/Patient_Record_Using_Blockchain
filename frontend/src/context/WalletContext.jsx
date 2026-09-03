import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { BrowserProvider } from "ethers";

export const LOCAL_CHAIN_ID = 31337n;

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const sync = useCallback(async (eth) => {
    const p = new BrowserProvider(eth);
    const net = await p.getNetwork();
    const accounts = await p.send("eth_accounts", []);
    setProvider(p);
    setChainId(net.chainId);
    setAccount(accounts[0] || "");
  }, []);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    sync(eth).catch((err) => setError(err.message));

    const handleAccounts = (accs) => setAccount(accs[0] || "");
    const handleChain = () => sync(eth);

    eth.on("accountsChanged", handleAccounts);
    eth.on("chainChanged", handleChain);

    return () => {
      eth.removeListener("accountsChanged", handleAccounts);
      eth.removeListener("chainChanged", handleChain);
    };
  }, [sync]);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      setError("MetaMask is not installed.");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      await eth.request({ method: "eth_requestAccounts" });
      await sync(eth);
    } catch (err) {
      setError(err.message || "Could not connect wallet.");
    } finally {
      setConnecting(false);
    }
  }, [sync]);

  const switchToLocalhost = useCallback(async () => {
    const eth = window.ethereum;
    if (eth) {
      setError("");
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x7a69" }]
        });
      } catch (err) {
        if (err.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x7a69",
                chainName: "Hardhat Localhost",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["http://127.0.0.1:8545"]
              }
            ]
          });
        } else {
          setError(err.message || "Could not switch network.");
        }
      }
    }
  }, []);

  const getSigner = useCallback(async () => {
    if (!provider) throw new Error("Wallet not connected.");
    return provider.getSigner();
  }, [provider]);

  const value = useMemo(
    () => ({
      account,
      chainId,
      provider,
      connecting,
      error,
      wrongNetwork: chainId != null && chainId !== LOCAL_CHAIN_ID,
      hasMetaMask: Boolean(window.ethereum),
      connect,
      switchToLocalhost,
      getSigner
    }),
    [account, chainId, provider, connecting, error, connect, switchToLocalhost, getSigner]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return ctx;
}
