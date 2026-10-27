"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicServiceCategories, getPublicServices, type ServiceRecord } from "@/lib/firebase/data";

export default function TreatmentsPage() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    void Promise.all([getPublicServices(), getPublicServiceCategories()])
      .then(([items, headings]) => { const activeHeadings = headings.filter(item => item.active).map(item => item.name); setCategories(activeHeadings); setServices(items.filter(item => item.active && activeHeadings.includes(item.category))); const requestedCategory = new URLSearchParams(window.location.search).get("category"); if (requestedCategory && activeHeadings.includes(requestedCategory)) setCategory(requestedCategory); })
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = services.filter((item) => category === "All" || item.category === category);

  const grouped = filtered.reduce<Record<string, ServiceRecord[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <main className="site">
      <nav className="nav">
        <div className="container navInner">
          <Link href="/" className="brand"><span className="brandMark"><img src="/villagespa.jpg" alt="" /></span><span>VILLAGE WELLNESS SPA<span>WELLNESS SPA</span></span></Link>
          <div className="navLinks"><Link href="/account" className="textLink">My Village Wellness Spa</Link><Link href="/book" className="button buttonPrimary">Book an appointment</Link></div><Link href="/account" className="button buttonLight mobileAccountLink">My account</Link><Link href="/book" className="button buttonPrimary mobileBookLink">Book</Link>
        </div>
      </nav>

      <section className="section">
        <div className="container">
          <div className="sectionHead">
            <span className="kicker">Treatments & pricing</span>
            <h1>Find the care that fits your goal.</h1>
            <p>Browse the published Village Wellness Spa catalogue, or start with a consultation if you are not sure what is right for you. Pricing is shown as published; contact the spa to confirm current prices. Suitability is determined by the Village Wellness Spa clinical team.</p>
          </div>

          {!loading && services.length > 0 && (
            <div className="catalogTools" aria-label="Treatment filters">
              <div className="filterChips" role="group" aria-label="Treatment categories">
                <button type="button" className={category === "All" ? "filterChip active" : "filterChip"} onClick={() => setCategory("All")}>All treatments</button>
                {categories.map((item) => (
                  <button key={item} type="button" className={category === item ? "filterChip active" : "filterChip"} onClick={() => setCategory(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="loadingCard">Opening the treatment catalogue…</div>
          ) : services.length === 0 ? (
            <div className="emptyPublic">
              <h3>The treatment catalogue is not published yet.</h3>
              <p>Start with a consultation and the team can guide you.</p>
              <Link href="/book?service=skin-consultation" className="button buttonPrimary">Book a consultation</Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="emptyPublic">
              <h3>No treatments in this category yet.</h3>
              <p>Choose another category or browse the full menu.</p>
              <button type="button" className="button buttonLight" onClick={() => setCategory("All")}>Browse all treatments</button>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <section key={group} style={{ marginBottom: 55 }}>
                <div className="sectionHead"><span className="kicker">{group}</span></div>
                <div className="serviceGrid">
                  {items.map((item) => (
                    <article className="serviceCard" key={item.id}>
                      {item.imageUrl && <img className="serviceImage" src={item.imageUrl} alt={`${item.name} treatment`} loading="lazy" />}
                      <span>{item.duration}</span>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      {item.assessmentNote && <p><strong>{item.assessmentNote}</strong></p>}
                      <div className="serviceMeta"><strong>{item.price}</strong><small>{item.consultationRequired ? "Assessment may be required" : "Appointment request"}</small></div>
                      <div className="actions serviceCardActions">
                        <Link href={`/treatments/${encodeURIComponent(item.id)}`} className="button buttonLight">View details</Link>
                        <Link href={`/book?service=${encodeURIComponent(item.id)}`} className="button buttonDark">Request appointment</Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </section>

      <section className="confidence">
        <div className="container confidenceGrid">
          <div><span className="kicker">Not sure?</span><h2>Tell us what you want to improve.</h2><p>You do not need to diagnose yourself or choose the perfect treatment before speaking with the team.</p></div>
          <Link href="/book?service=skin-consultation" className="button buttonDark">Book a consultation</Link>
        </div>
      </section>
    </main>
  );
}
