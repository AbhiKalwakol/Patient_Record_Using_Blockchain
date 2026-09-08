import React, { useState, useMemo } from "react";
import { useWallet } from "../context/WalletContext";
import { isContractConfigured, getContract, hashRecord } from "../lib/contract";
import { saveDocument } from "../lib/idb";
import { recognizeImage } from "../lib/ocr";

const DOC_TYPES = ["Lab report", "Prescription", "Discharge summary", "Other"];

export function Digitize() {
  const wallet = useWallet();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState("");
  const [banner, setBanner] = useState(null);

  const isImage = useMemo(() => Boolean(file && file.type.startsWith("image/")), [file]);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    setBanner(null);
    setOcrText("");
    setProgress(0);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected || null);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : "");
  }

  async function handleOcr() {
    if (!file) return;
    if (!isImage) {
      setBanner({ kind: "error", text: "Upload a PNG or JPG scan for OCR." });
      return;
    }
    setBusy("ocr");
    setBanner(null);
    try {
      const text = await recognizeImage(file, setProgress);
      setOcrText(text);
      if (!text) {
        setBanner({ kind: "warn", text: "OCR finished but found no text. You can type the record manually." });
      }
    } catch (err) {
      setBanner({ kind: "error", text: err.message || "OCR failed." });
    } finally {
      setBusy("");
    }
  }

  async function handleSeal() {
    if (!file || !wallet.account) return;
    if (!isContractConfigured()) {
      setBanner({ kind: "error", text: "Contract is not deployed. Start Hardhat and run npm run deploy." });
      return;
    }
    setBusy("seal");
    setBanner(null);
    try {
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const hash = await hashRecord(fileBytes, ocrText);
      const signer = await wallet.getSigner();
      const contract = getContract(signer);
      const tx = await contract.addRecord(hash, docType);
      const receipt = await tx.wait();

      await saveDocument({
        contentHash: hash,
        ocrText,
        fileBlob: file,
        fileName: file.name,
        mimeType: file.type,
        txHash: receipt.hash,
        wallet: wallet.account,
        docType,
        createdAt: Date.now()
      });

      setBanner({ kind: "ok", text: `Sealed on-chain. Transaction ${receipt.hash.slice(0, 10)}…` });
    } catch (err) {
      const msg = err?.reason || err?.shortMessage || err?.message || "Transaction failed.";
      setBanner({ kind: "error", text: msg });
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card">
      <h1>Digitize a record</h1>
      <p className="lede">
        Scan stays in this browser. Only a keccak256 hash and document type go to the local chain.
      </p>

      {!wallet.hasMetaMask && <div className="banner error">Install MetaMask to continue.</div>}
      {wallet.error && <div className="banner error">{wallet.error}</div>}
      {wallet.wrongNetwork && (
        <div className="banner warn">
          Wrong network.{" "}
          <button className="ghost" type="button" onClick={wallet.switchToLocalhost}>
            Switch to Hardhat localhost
          </button>
        </div>
      )}
      {!wallet.account && wallet.hasMetaMask && (
        <div className="banner info">Connect MetaMask to seal a record.</div>
      )}
      {banner && <div className={`banner ${banner.kind}`}>{banner.text}</div>}

      <div className="row split">
        <div>
          <label htmlFor="scan">Scan or photo (PNG / JPG)</label>
          <input
            id="scan"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileChange}
          />
          {previewUrl && (
            <p>
              <img className="preview" src={previewUrl} alt="Record preview" />
            </p>
          )}

          <label htmlFor="docType">Document type</label>
          <select id="docType" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ocr">Extracted text (editable)</label>
          <textarea
            id="ocr"
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            placeholder="Run OCR, then correct names, dates, or notes."
          />
          {busy === "ocr" && <p className="meta">Recognizing text… {progress}%</p>}
        </div>
      </div>

      <div className="actions">
        <button
          className="ghost"
          type="button"
          disabled={!file || busy !== ""}
          onClick={handleOcr}
        >
          {busy === "ocr" ? "Running OCR…" : "Run OCR"}
        </button>
        <button
          className="primary"
          type="button"
          disabled={!file || !wallet.account || wallet.wrongNetwork || busy !== ""}
          onClick={handleSeal}
        >
          {busy === "seal" ? "Sealing…" : "Seal hash on chain"}
        </button>
      </div>
    </section>
  );
}
