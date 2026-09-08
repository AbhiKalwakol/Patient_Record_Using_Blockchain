import React from "react";
import { NavLink } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

export function Layout({ children }) {
  const { account, connect, connecting } = useWallet();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>Patient Records</strong>
          <span>OCR digitize · hash on-chain · files stay local</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            Digitize
          </NavLink>
          <NavLink to="/records">
            My records
          </NavLink>
          <button className="wallet-chip" onClick={connect} type="button">
            {connecting
              ? "Connecting…"
              : account
              ? `${account.slice(0, 6)}…${account.slice(-4)}`
              : "Connect MetaMask"}
          </button>
        </nav>
      </header>
      {children}
    </div>
  );
}
