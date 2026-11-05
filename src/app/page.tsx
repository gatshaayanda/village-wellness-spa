"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EnquiryModal from "@/components/enquiry-modal";
import { getClinicSettings, getPublicServices, type ServiceRecord } from "@/lib/firebase/data";
import { defaultClinicSettings, isAnnouncementVisible, type ClinicSettings } from "@/lib/tripple-s/clinic-settings";

export default function Home() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(defaultClinicSettings);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

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
        <Link href="/account" className="villageAccountShortcut" aria-label="My account">
          <span aria-hidden="true">◎</span><span>My account</span>
        </Link>
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
            <Link href="/book" className="villageBookCta">Book an appointment <span aria-hidden="true">↗</span></Link>
          </div>
          <span className="villageHeroLocation">MISSISSAUGA, ONTARIO</span>
        </section>

        <section className="villageQuickLinks" aria-label="Explore Village Wellness Spa">
          <Link href="/treatments" className="villageQuickCard">
            <span className="villageQuickIcon" aria-hidden="true">✧</span>
            <span><strong>Treatments</strong><small>Explore services & pricing</small></span>
            <b aria-hidden="true">↗</b>
          </Link>
          <Link href="/account" className="villageQuickCard">
            <span className="villageQuickIcon" aria-hidden="true">♡</span>
            <span><strong>My appointments</strong><small>Requests, visits & account</small></span>
            <b aria-hidden="true">↗</b>
          </Link>
          <Link href="/treatments?category=Wellness" className="villageQuickCard">
            <span className="villageQuickIcon" aria-hidden="true">◌</span>
            <span><strong>Wellness & IV</strong><small>Explore wellness options</small></span>
            <b aria-hidden="true">↗</b>
          </Link>
          <a href="#visit" className="villageQuickCard">
            <span className="villageQuickIcon" aria-hidden="true">⌖</span>
            <span><strong>Visit the spa</strong><small>Location & opening details</small></span>
            <b aria-hidden="true">↗</b>
          </a>
        </section>

        <div className="villageTrustStrip">
          <span>✦ Personalised care</span><i>·</i><span>Clinical guidance</span><i>·</i><span>A welcoming space</span>
        </div>

        <section className="villageVisitCompact" id="visit">
          <div>
            <span className="kicker">FIND YOUR WAY HERE</span>
            <strong>Village Wellness Spa</strong>
            <p>1900 Dundas Street West, Suite 27<br />Mississauga, ON L5K 1P9, Canada</p>
          </div>
          <button type="button" className="villageEnquiryLink" onClick={() => setEnquiryOpen(true)}>Questions? Enquire <span aria-hidden="true">↗</span></button>
        </section>
      </div>

      <nav className="villageBottomNav" aria-label="Main navigation">
        <Link href="/" aria-current="page"><span aria-hidden="true">⌂</span><small>Home</small></Link>
        <Link href="/treatments"><span aria-hidden="true">✧</span><small>Treatments</small></Link>
        <Link href="/book" className="villageBottomBook"><span aria-hidden="true">＋</span><small>Book</small></Link>
        <Link href="/account"><span aria-hidden="true">♡</span><small>Account</small></Link>
      </nav>

      <footer className="villageCompactFooter">
        <span>© 2026 Village Wellness Spa</span>
        <Link href="/admin">Admin</Link>
      </footer>

      <EnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} kind="GENERAL" />
    </main>
  );
}
