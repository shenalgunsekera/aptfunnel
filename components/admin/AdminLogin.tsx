"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <form className="login step" onSubmit={submit}>
      <Image src="/logo.png" alt="" width={48} height={48} />
      <h1 style={{ fontSize: 22, margin: "18px 0 4px" }}>Admin sign in</h1>
      <p className="muted" style={{ margin: "0 0 24px", fontSize: 14 }}>
        Manage bookings and availability.
      </p>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      <label className="field">
        <span className="label">Password</span>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={busy || !password}>
        {busy ? <span className="spinner" /> : "Sign in"}
      </button>
    </form>
  );
}
