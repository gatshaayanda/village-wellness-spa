"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import AdminGate from "@/app/admin/admin-gate";

type Plant = { id: string; growth: number; plantedAt: string; lastWateredDate: string };
type Garden = { plants: Plant[]; paidVisitCount: number; seedsAvailable: number; today: string };
function GardenContent() {
  const [garden, setGarden] = useState<Garden | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async (user = auth.currentUser) => {
    if (!user) throw new Error("Your customer session is not ready. Open your account and try again.");
    const response = await fetch("/api/customer/garden", { headers: { Authorization: "Bearer " + await user.getIdToken() }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Your garden could not be loaded.");
    setGarden(data as Garden);
  }, []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!user) { setLoading(false); setNotice("Open your customer account to start your private garden."); return; }
      void load(user).catch(error => setNotice(error instanceof Error ? error.message : "Your garden could not be loaded.")).finally(() => setLoading(false));
    });
    return () => unsubscribe();
  }, [load]);
  async function act(action: "plant" | "water", plantId?: string) {
    const user = auth.currentUser;
    if (!user) { setNotice("Open your customer account to continue."); return; }
    setBusy(action + (plantId || ""));
    setNotice("");
    try {
      const response = await fetch("/api/customer/garden", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + await user.getIdToken() },
        body: JSON.stringify({ action, plantId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Garden action could not be saved.");
      setGarden(data as Garden);
      setNotice(action === "plant" ? "A new seed is planted in your garden." : "Water saved. Your plant has grown a little.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Garden action could not be saved.");
    } finally {
      setBusy("");
    }
  }
  return <main className="customerPage"><div className="customerShell">
    <nav className="nav"><div className="container navInner"><Link href="/" className="brand"><span className="brandMark"><img src="/icon.svg" alt="" /></span><span>Village<span>WELLNESS SPA</span></span></Link><div className="navLinks"><Link href="/account" className="textLink">My account</Link><Link href="/book" className="textLink">Book a visit</Link></div></div></nav>
    <section className="customerPanel">
      <span className="kicker">A LITTLE SPACE TO GROW</span>
      <h1>My Village Garden</h1>
      <p>Your first seed is on us. Every completed paid visit adds another seed. Plant one, then water it once a day and watch your garden grow — no scores, fees or pressure.</p>
      {loading ? <p role="status">Opening your garden…</p> : garden ? <>
        <div className="adminStats">
          <article><span>Seeds ready</span><strong>{garden.seedsAvailable}</strong></article>
          <article><span>Visits completed</span><strong>{garden.paidVisitCount}</strong></article>
          <article><span>Plants growing</span><strong>{garden.plants.length}</strong></article>
        </div>
        <div className="actions" style={{ margin: "18px 0" }}><button className="button buttonPrimary" type="button" disabled={!!busy || garden.seedsAvailable < 1} onClick={() => void act("plant")}>{busy === "plant" ? "Planting…" : "Plant a seed"}</button></div>
        {garden.plants.length ? <div className="customerOfferList">{garden.plants.map((plant,index) => {
          const bloomed = plant.growth >= 5;
          const watered = plant.lastWateredDate === garden.today;
          const symbol = bloomed ? "🌸" : plant.growth >= 2 ? "🌿" : "🌱";
          return <article className="customerOffer" key={plant.id}>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <span style={{fontSize:"2.8rem"}} aria-hidden="true">{symbol}</span>
              <div style={{flex:1}}><strong>Plant {index+1} · {bloomed ? "In bloom" : "Growing"}</strong><p>{bloomed ? "Your flower is blooming in the Village Garden." : "Growth " + plant.growth + " of 5 · " + (watered ? "Watered today" : "Ready for a little water")}</p></div>
              <button className="button buttonLight" type="button" disabled={!!busy || bloomed || watered} onClick={() => void act("water",plant.id)}>{bloomed ? "Blooming" : watered ? "Watered" : "Water"}</button>
            </div>
          </article>;
        })}</div> : <div className="customerEmpty"><strong>Your garden is ready.</strong><p>Plant your first seed to begin.</p></div>}
      </> : <p role="status">Your garden is not available right now.</p>}
      {notice && <p className="notice customerAccountMessage" role="status">{notice}</p>}
      <div className="actions" style={{marginTop:20}}><Link href="/account" className="button buttonLight">Back to my account</Link><Link href="/book" className="button buttonPrimary">Book your next visit</Link></div>
    </section>
  </div></main>;
}
export default function GardenPage() { return <AdminGate><GardenContent /></AdminGate>; }
