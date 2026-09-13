import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import { Layout } from "./components/Layout";
import { Digitize } from "./pages/Digitize";
import { MyRecords } from "./pages/MyRecords";

export function App() {
  return (
    <WalletProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Digitize />} />
          <Route path="/records" element={<MyRecords />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </WalletProvider>
  );
}
