"use client";

import { onAuthStateChanged, signInWithCustomToken, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";

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
    try {
      const role = await getDoc(doc(db, "admins", nextUser.uid));
      const allowed = role.exists() && ["owner", "staff"].includes(String(role.data().role));
      setAuthorized(allowed);
      if (!allowed) await signOut(auth);
    } catch {
      setAuthorized(false);
      await signOut(auth);
    } finally {
      setChecking(false);
    }
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
      if (!response.ok || !payload.token) throw new Error(payload.error ?? "Access denied. Check the access word and try again.");
      const credential = await signInWithCustomToken(auth, payload.token);
      const role = await getDoc(doc(db, "admins", credential.user.uid));
      const allowed = role.exists() && ["owner", "staff"].includes(String(role.data().role));
      if (!allowed) {
        await signOut(auth);
        throw new Error("This access account is not authorized for Village Wellness Spa Admin.");
      }
      setAuthorized(true);
      setAccessWord("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not sign you in. Check the access word and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <main className="adminPage"><div className="adminShell"><div className="emptyState"><h1>Opening Village Wellness Spa Admin</h1><p>Checking access…</p></div></div></main>;
  if (user && authorized) return <div className="adminAuthorized"><div className="adminAccountBar"><span>Village Wellness Spa Admin · Authorized access</span><button className="button buttonLight" type="button" onClick={() => void signOut(auth)}>Sign out</button></div>{children}</div>;

  return <main className="adminPage"><div className="adminShell"><section className="adminPanel" style={{ maxWidth: 520, margin: "80px auto" }}>
    <span className="kicker">VILLAGE WELLNESS SPA · ADMIN</span>
    <h1>Admin</h1>
    <p>Enter your authorized access word to manage appointments, services, products and clinic hours.</p>
    <form className="adminForm" onSubmit={signIn}>
      <label>Access word<input type="password" value={accessWord} onChange={event => setAccessWord(event.target.value)} autoComplete="current-password" required autoFocus /></label>
      {error && <p role="alert">{error}</p>}
      <button className="button buttonPrimary" type="submit" disabled={busy}>{busy ? "Checking access…" : "Enter Admin"}</button>
    </form>
  </section></div></main>;
}
