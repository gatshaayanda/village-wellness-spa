"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getClinicSettings, getPublicServices, type ServiceRecord } from "@/lib/firebase/data";
import { defaultClinicSettings, isAnnouncementVisible, type ClinicSettings } from "@/lib/tripple-s/clinic-settings";
import SpaWeatherReport from "@/components/SpaWeatherReport";

export default function Home() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(defaultClinicSettings);

  useEffect(() => {
    let active = true;
    void Promise.all([getPublicServices(), getClinicSettings()])
      .then(([serviceItems, settings]) => {
        if (!active) return;
        setServices(serviceItems.filter((item) => item.active));
        setClinicSettings(settings);
      })
      .catch(() => {
        if (active) setServices([]);
      });
    return () => { active = false; };
  }, []);

  const heroImage = services.find((service) => service.imageUrl)?.imageUrl;
  const showAnnouncement = isAnnouncementVisible(clinicSettings);

  return (
    <main className="site villageHome">
      {showAnnouncement && (
        <div className="publicAnnouncement" role="status">
          <strong>{clinicSettings.announcement.title || "Clinic notice"}</strong>
          <span>{clinicSettings.announcement.message}</span>
        </div>
      )}

      <header className="villageAppHeader">
        <Link href="/" className="brand" aria-label="Village Wellness Spa home">
          <span className="brandMark"><img src="/icon.svg" alt="" /></span>
          <span>Village<span>WELLNESS SPA</span></span>
        </Link>
        <nav className="villageHeaderActions" aria-label="Quick access">
          <Link href="/account" className="villageAccountShortcut" aria-label="My account">
            <span aria-hidden="true">◎</span><span>My account</span>
          </Link>
          <Link href="/admin" className="villageAdminShortcut">Admin</Link>
        </nav>
      </header>

      <div className="villageHomeContent">
        <section className="villageHero" aria-labelledby="village-home-title">
          {heroImage ? (
            <div className="villageHeroPhoto" style={{ backgroundImage: `linear-gradient(90deg,rgba(48,20,35,.76),rgba(48,20,35,.12)),url("${heroImage}")` }} />
          ) : (
            <div className="villageHeroPhoto villageHeroFallback" aria-hidden="true">
              <span className="villageHeroMonogram">V</span>
              <span className="villageHeroGlow" />
            </div>
          )}
          <div className="villageHeroContent">
            <span className="villageHeroEyebrow">MEDICAL AESTHETICS · SKIN HEALTH · WELLNESS</span>
            <h1 id="village-home-title">Feel good in your skin.<br /><em>Feel cared for.</em></h1>
            <p>Thoughtful care, guided by your goals.</p>
            <div className="villageHeroActions"><Link href="/book" className="villageBookCta">Book a visit <span aria-hidden="true">↗</span></Link></div>
          </div>
          <span className="villageHeroLocation">GABORONE, BOTSWANA</span>
        </section>

        <section className="villageStaffEntry" aria-label="Spa reception">
          <div>
            <span className="kicker">RECEPTION</span>
            <strong>Walk-ins &amp; today’s visits</strong>
            <p>Register customers when they arrive. Complete the visit when treatment and payment are finished.</p>
          </div>
          <Link href="/admin/queue" className="villageStaffEntryLink">Open reception <span aria-hidden="true">↗</span></Link>
        </section>

        <SpaWeatherReport />

        <div className="villageTrustStrip">
          <span>✦ Personalised care</span><i>·</i><span>Clinical guidance</span><i>·</i><span>A welcoming space</span>
        </div>

        <section className="villageVisitCompact" id="visit">
          <div>
            <span className="kicker">FIND YOUR WAY HERE</span>
            <strong>Village Wellness Spa</strong>
            <p>Maratadiba Road, Plot 492<br />The Village, Gaborone, Botswana</p>
          </div>
        </section>
      </div>


      <footer className="villageCompactFooter">
        <span>© 2026 Village Wellness Spa</span>
      </footer>

    </main>
  );
}
