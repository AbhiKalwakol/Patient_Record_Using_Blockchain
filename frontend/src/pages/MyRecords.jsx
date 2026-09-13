import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { isContractConfigured, getContract, hashRecord } from "../lib/contract";
import { getDocument } from "../lib/idb";

export function MyRecords() {
  const wallet = useWallet();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wallet.account || wallet.wrongNetwork || !wallet.provider) {
      setRecords([]);
      return;
    }
    let cancelled = false;
    const urls = [];

    async function fetchRecords() {
      if (!isContractConfigured()) {
        setError("Contract is not deployed. Start Hardhat and run npm run deploy.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const contract = getContract(wallet.provider);
        const onChainRecords = await contract.getRecords(wallet.account);

        const loaded = await Promise.all(
          onChainRecords.map(async (rec, idx) => {
            const hash = rec.contentHash;
            const localDoc = await getDocument(hash);
            let url = "";
            if (localDoc?.fileBlob) {
              url = URL.createObjectURL(localDoc.fileBlob);
              if (cancelled) {
                URL.revokeObjectURL(url);
              } else {
                urls.push(url);
              }
            }
            return {
              index: idx,
              contentHash: hash,
              docType: rec.docType,
              timestamp: Number(rec.timestamp) * 1000,
              uploader: rec.uploader,
              local: localDoc,
              previewUrl: url,
              verify: null
            };
          })
        );

        if (!cancelled) {
          setRecords(loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load records.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRecords();

    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [wallet.account, wallet.provider, wallet.wrongNetwork]);

  async function handleVerify(index) {
    const rec = records.find((r) => r.index === index);
    if (!rec) return;
    if (!rec.local?.fileBlob) {
      setRecords((prev) =>
        prev.map((r) =>
          r.index === index
            ? { ...r, verify: { ok: false, text: "No local file in this browser to verify." } }
            : r
        )
      );
      return;
    }

    const fileBytes = new Uint8Array(await rec.local.fileBlob.arrayBuffer());
    const hash = await hashRecord(fileBytes, rec.local.ocrText || "");
    const match = hash.toLowerCase() === rec.contentHash.toLowerCase();

    setRecords((prev) =>
      prev.map((r) =>
        r.index === index
          ? {
              ...r,
              verify: {
                ok: match,
                text: match
                  ? "Hash matches the chain. This copy is unchanged."
                  : "Hash mismatch. The local file or OCR text was altered."
              }
            }
          : r
      )
    );
  }

  if (!wallet.account) {
    return (
      <section className="card">
        <h1>My records</h1>
        <p className="lede">Connect MetaMask to load hashes sealed by this wallet.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h1>My records</h1>
      <p className="lede">
        On-chain metadata for {wallet.account.slice(0, 6)}…{wallet.account.slice(-4)}. Previews exist only if you digitized them in this browser.
      </p>

      {wallet.wrongNetwork && (
        <div className="banner warn">Switch to Hardhat localhost (chain 31337).</div>
      )}
      {error && <div className="banner error">{error}</div>}
      {loading && <p className="meta">Loading from the chain…</p>}
      {!loading && records.length === 0 && !error && (
        <div className="banner info">No records yet. Digitize a scan first.</div>
      )}

      <div className="record-list">
        {records.map((rec) => (
          <article className="record" key={`${rec.contentHash}-${rec.index}`}>
            <strong>{rec.docType}</strong>
            <p className="meta">
              {new Date(rec.timestamp).toLocaleString()} · uploader {rec.uploader}
            </p>
            <p className="meta hash">{rec.contentHash}</p>
            {rec.local?.txHash && <p className="meta hash">tx {rec.local.txHash}</p>}
            {rec.previewUrl && (
              <p>
                <img className="preview" src={rec.previewUrl} alt="" />
              </p>
            )}
            {rec.local?.ocrText && <p className="meta">{rec.local.ocrText}</p>}
            {!rec.local && <p className="meta">No local copy in IndexedDB for this hash.</p>}
            {rec.verify && (
              <div className={`banner ${rec.verify.ok ? "ok" : "error"}`}>
                {rec.verify.text}
              </div>
            )}
            <div className="actions">
              <button className="ghost" type="button" onClick={() => handleVerify(rec.index)}>
                Verify hash
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
