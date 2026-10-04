"use client";
import { useState } from "react";
import { prepareImageUpload } from "@/app/admin/upload-action";
export function ImageUpload() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Maximum image size is 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const info = await prepareImageUpload({
        filename: file.name,
        contentType: file.type,
      });
      const body = new FormData();
      for (const [k, v] of Object.entries(info.fields ?? {})) body.append(k, v);
      body.append("file", file);
      const r = await fetch(info.uploadUrl, { method: "POST", body });
      if (!r.ok) throw new Error("Upload failed. Check bucket CORS settings.");
      setUrl(info.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setBusy(false);
  }
  return (
    <div className="card mb-6 p-5">
      <h2 className="mb-3 text-xl">Upload a product image</h2>
      <input
        type="file"
        aria-label="Product image"
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={busy}
        onChange={(e) => upload(e.target.files?.[0])}
      />
      {busy && <p role="status">Uploading…</p>}
      {error && <p role="alert">{error}</p>}
      {url && (
        <label className="mt-3 block">
          Copy this URL into the product image field
          <input
            readOnly
            className="input"
            value={url}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
    </div>
  );
}
