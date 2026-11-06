"use client";

import { onAuthStateChanged, signInWithCustomToken, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import Link from "next/link";

const ADMIN_UID = "tripple-s-one-word-admin";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [accessWord, setAccessWord] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    setUser(nextUser);
    if (!nextUser) {
      setAuthorized(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    // The server has already validated ADMIN_PASSWORD and minted this dedicated UID.
    // Avoid a second browser-side Firestore role read during sign-in.
    const allowed = nextUser.uid === ADMIN_UID;
    setAuthorized(allowed);
    if (!allowed) await signOut(auth);
    setChecking(false);
  }), []);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ word: accessWord }),
      });
      const payload = await response.json() as { token?: string; error?: string };
      if (!response.ok || !payload.token) throw new Error(payload.error ?? "Access denied. Check the admin password and try again.");
      const credential = await signInWithCustomToken(auth, payload.token);
      if (credential.user.uid !== ADMIN_UID) {
        await signOut(auth);
        throw new Error("The server returned an unexpected admin account. Please try again.");
      }
      setUser(credential.user);
      setAuthorized(true);
      setAccessWord("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not sign you in. Check the admin password and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <main className="adminPage"><div className="adminShell"><div className="emptyState"><h1>Opening Village Wellness Spa Admin</h1><p>Checking access…</p></div></div></main>;
  if (user && authorized) return <div className="adminAuthorized"><div className="adminAccountBar"><span>Village Wellness Spa Admin · Authorized access</span><div className="actions"><Link href="/admin/queue" className="button buttonLight">Walk-ins & visits ↗</Link><button className="button buttonLight" type="button" onClick={() => void signOut(auth)}>Sign out</button></div></div>{children}</div>;

  return <main className="adminPage"><div className="adminShell"><section className="adminPanel" style={{ maxWidth: 520, margin: "80px auto" }}>
    <span className="kicker">VILLAGE WELLNESS SPA · ADMIN</span>
    <h1>Admin</h1>
    <p>Enter your admin password to manage appointments, services, products and clinic hours.</p>
    <form className="adminForm" onSubmit={signIn}>
      <label>Admin password<input type="password" value={accessWord} onChange={event => setAccessWord(event.target.value)} autoComplete="current-password" required autoFocus /></label>
      {error && <p role="alert">{error}</p>}
      <button className="button buttonPrimary" type="submit" disabled={busy}>{busy ? "Checking access…" : "Open admin ↗"}</button>
    </form>
  </section></div></main>;
}
