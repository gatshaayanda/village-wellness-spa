"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getClinicSettings, getPublicServices, type ServiceRecord } from "@/lib/firebase/data";
import { defaultClinicSettings, isAnnouncementVisible, type ClinicSettings } from "@/lib/tripple-s/clinic-settings";

export default function Home() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(defaultClinicSettings);

  useEffect(() => {
    let active = true;
    void Promise.all([getPublicServices(), getClinicSettings()])
      .then(([items, settings]) => {
        if (!active) return;
        setServices(items.filter(item => item.active));
        setClinicSettings(settings);
      })
      .catch(() => {
        if (active) setServices([]);
      });
    return () => { active = false; };
  }, []);

  const heroImage = services.find(item => item.imageUrl)?.imageUrl;
  const showAnnouncement = isAnnouncementVisible(clinicSettings);

  return (
    <main className="site villageHome villageHomeRefresh">
      {showAnnouncement && (
        <div className="publicAnnouncement" role="status">
          <strong>{clinicSettings.announcement.title || "Clinic notice"}</strong>
          <span>{clinicSettings.announcement.message}</span>
        </div>
      )}

      <header className="villageAppHeader villageRefreshHeader">
        <Link href="/" className="brand" aria-label="Village Wellness Spa home">
          <span className="brandMark"><img src="/icon.svg" alt="" /></span>
          <span>Village<span>WELLNESS SPA</span></span>
        </Link>
        <nav className="villageHeaderActions" aria-label="Quick access">
          <Link href="/treatments" className="villageHeaderSecondary">Treatments</Link>
          <Link href="/account" className="villageAccountShortcut"><span aria-hidden="true">◎</span><span>My account</span></Link>
          <Link href="/admin" className="villageAdminShortcut">Admin</Link>
        </nav>
      </header>

      <div className="villageHomeContent villageRefreshContent">
        <section className="villageRefreshHero" aria-labelledby="village-home-title">
          <div
            className="villageRefreshHeroImage"
            aria-hidden="true"
            style={heroImage ? { backgroundImage: `linear-gradient(90deg,rgba(42,18,31,.82),rgba(42,18,31,.18)),url("${heroImage}")` } : undefined}
          />
          <div className="villageRefreshHeroCopy">
            <span className="villageRefreshEyebrow">VILLAGE WELLNESS SPA · GABORONE</span>
            <h1 id="village-home-title">Feel good in your skin.<br /><em>Feel cared for.</em></h1>
            <p>Thoughtful treatments, personal attention and a calmer way to care for yourself.</p>
            <div className="villageRefreshActions">
              <Link href="/queue" className="villageRefreshPrimary">Join the walk-in queue <span aria-hidden="true">↗</span></Link>
              <Link href="/book" className="villageRefreshSecondary">Book an appointment</Link>
            </div>
            <small className="villageRefreshNote">Already at the spa? Join the queue here. Planning ahead? Book a future appointment.</small>
          </div>
          <span className="villageRefreshHeroTag">SKIN HEALTH · AESTHETICS · WELLNESS</span>
        </section>

        <section className="villageRefreshDestinations" aria-label="Explore Village Wellness Spa">
          <Link href="/treatments"><span aria-hidden="true">✦</span><strong>Explore treatments</strong><small>Find care that fits your goals</small></Link>
          <Link href="/account"><span aria-hidden="true">◎</span><strong>My account</strong><small>Keep visits and future bookings together</small></Link>
          <Link href="/book"><span aria-hidden="true">◷</span><strong>Book ahead</strong><small>Choose a future date and time</small></Link>
        </section>

        <section className="villageRefreshServices" aria-labelledby="village-services-title">
          <div className="villageRefreshSectionHeading">
            <div><span className="kicker">PERSONALISED CARE</span><h2 id="village-services-title">Explore the treatments.</h2></div>
            <Link href="/treatments">View all treatments ↗</Link>
          </div>
          {services.length ? (
            <div className="villageRefreshServiceGrid">
              {services.slice(0, 3).map(item => (
                <Link href={"/treatments/" + encodeURIComponent(item.id)} className="villageRefreshService" key={item.id}>
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="villageRefreshServiceMark" aria-hidden="true">V</span>}
                  <span><strong>{item.name}</strong><small>{item.duration || "Ask our team about this treatment"}</small></span>
                  <b aria-hidden="true">↗</b>
                </Link>
              ))}
            </div>
          ) : (
            <div className="villageRefreshServiceEmpty"><strong>Your next step starts with a conversation.</strong><span>Browse the treatment catalogue or ask the team for guidance.</span><Link href="/treatments">Explore the catalogue ↗</Link></div>
          )}
        </section>

        <section className="villageRefreshVisit">
          <div><span className="kicker">FIND YOUR WAY HERE</span><strong>Village Wellness Spa</strong><p>Maratadiba Road, Plot 492<br />The Village, Gaborone, Botswana</p></div>
          <Link href="/queue">I’m here · Join the queue ↗</Link>
        </section>
      </div>

      <footer className="villageCompactFooter"><span>© 2026 Village Wellness Spa</span><span>Care, considered.</span></footer>
    </main>
  );
}
