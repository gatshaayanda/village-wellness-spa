"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type GardenSave = { highScore: number };
const STORAGE_KEY = "village-wellness-garden-best-v1";

function GardenContent() {
  const [planted, setPlanted] = useState(false);
  const [growth, setGrowth] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as GardenSave;
      setHighScore(Math.max(0, Number(saved.highScore) || 0));
    } catch {
      setHighScore(0);
    }
    setReady(true);
  }, []);

  function plantSeed() {
    setPlanted(true);
    setGrowth(0);
    setNotice("A new seed is in the soil. Give it a little water.");
  }

  function water() {
    if (!planted || growth >= 5) return;
    const next = growth + 1;
    setGrowth(next);
    setNotice(next === 5 ? "Your flower is ready. Pick it to add to your garden score." : "A little growth. Keep watering.");
  }

  function harvest() {
    if (!planted || growth < 5) return;
    const nextScore = score + 10;
    setScore(nextScore);
    const nextBest = Math.max(highScore, nextScore);
    setHighScore(nextBest);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ highScore: nextBest })); } catch { /* Local scoring is optional when storage is unavailable. */ }
    setPlanted(false);
    setGrowth(0);
    setNotice("Flower collected. Your garden is looking lovely.");
  }

  const stage = growth === 0 ? "Seed" : growth < 2 ? "Sprout" : growth < 4 ? "Growing" : growth < 5 ? "Almost there" : "In bloom";
  const plant = !planted ? "🪴" : growth === 0 ? "🌰" : growth < 2 ? "🌱" : growth < 4 ? "🌿" : growth < 5 ? "🌷" : "🌸";

  return (
    <main className="customerPage">
      <div className="customerShell">
        <nav className="nav">
          <div className="container navInner">
            <Link href="/" className="brand" aria-label="Village Wellness Spa home">
              <span className="brandMark"><img src="/icon.svg" alt="" /></span>
              <span>Village<span>WELLNESS SPA</span></span>
            </Link>
            <div className="navLinks"><Link href="/account" className="textLink">My account</Link><Link href="/treatments" className="textLink">Treatments</Link></div>
          </div>
        </nav>
        <section className="customerPanel" aria-labelledby="garden-title">
          <span className="kicker">A LITTLE SPACE TO GROW</span>
          <h1 id="garden-title">Village Garden</h1>
          <p>A quiet little break. Plant a seed, water it until it blooms, and collect flowers for your garden score. No sign-in, forms or purchases needed.</p>
          <div className="adminStats">
            <article><span>Your flowers</span><strong>{score}</strong></article>
            <article><span>Personal best</span><strong>{ready ? highScore : "—"}</strong></article>
            <article><span>Plant stage</span><strong>{planted ? stage : "Ready to plant"}</strong></article>
          </div>
          <div style={{display:"grid",justifyItems:"center",gap:14,padding:"28px 12px",margin:"18px 0",borderRadius:18,background:"linear-gradient(180deg,#eaf7ed 0%,#f9f5e8 100%)"}}>
            <span aria-hidden="true" style={{fontSize:"5rem",lineHeight:1}}>{plant}</span>
            <strong style={{color:"#315b3b"}}>{planted ? stage : "Your garden plot is waiting"}</strong>
            {planted && <div style={{display:"flex",gap:7,width:"min(100%,280px)"}} aria-label={growth + " of 5 growth steps"}>{Array.from({length:5},(_,i)=><span key={i} style={{height:8,flex:1,borderRadius:99,background:i<growth?"#20b273":"#d8e4d7"}}/>)}</div>}
            {!planted ? <button className="button buttonPrimary" type="button" onClick={plantSeed}>Plant a seed</button> : growth < 5 ? <button className="button buttonPrimary" type="button" onClick={water}>Water your plant</button> : <button className="button buttonPrimary" type="button" onClick={harvest}>Pick flower · +10</button>}
          </div>
          {notice && <p className="notice customerAccountMessage" role="status">{notice}</p>}
          <p className="orderTruth">Your personal best is saved on this device. It is not connected to your spa visits or customer account.</p>
          <div className="actions" style={{marginTop:20}}><Link href="/account" className="button buttonLight">Back to my account</Link><Link href="/book" className="button buttonPrimary">Book a visit</Link></div>
        </section>
      </div>
    </main>
  );
}

export default function GardenPage() {
  return <GardenContent />;
}
