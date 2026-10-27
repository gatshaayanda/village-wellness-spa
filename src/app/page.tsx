"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EnquiryModal from "@/components/enquiry-modal";
import { getClinicSettings, getPublicLoyaltyPrograms, getPublicProducts, getPublicServices, getPublicServiceCategories, type LoyaltyProgramRecord, type ProductRecord, type ServiceRecord } from "@/lib/firebase/data";
import { defaultClinicSettings, isAnnouncementVisible, type ClinicSettings, type DayKey } from "@/lib/tripple-s/clinic-settings";

function ImagePlaceholder({ imageUrl, label, className = "" }: { imageUrl?: string; label: string; className?: string }) {
  return <div className={`imagePlaceholder ${className}`} role="img" aria-label={label} style={imageUrl ? { backgroundImage: `linear-gradient(180deg, transparent 35%, rgba(23,22,20,.34)), url("${imageUrl}")` } : undefined}>
    {!imageUrl && <><span className="placeholderMonogram">V</span><span className="placeholderLabel">VILLAGE WELLNESS SPA · IMAGE TO ADD</span></>}
  </div>;
}

export default function Home() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(defaultClinicSettings);
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgramRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [enquiry, setEnquiry] = useState<{ kind: "PRODUCT" | "GENERAL"; id?: string; name?: string; price?: string } | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([getPublicServices(), getPublicProducts(), getClinicSettings(), getPublicLoyaltyPrograms(), getPublicServiceCategories()])
      .then(([serviceItems, productItems, settings, programs, categoryItems]) => {
        if (!active) return;
        setServices(serviceItems.filter((item) => item.active));
        setProducts(productItems.filter((item) => item.active));
        setClinicSettings(settings);
        setLoyaltyPrograms(programs);
        setCategories(categoryItems.filter((item) => item.active).map((item) => item.name));
      })
      .catch(() => { if (active) { setServices([]); setProducts([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const showAnnouncement = isAnnouncementVisible(clinicSettings);
  const serviceCategories = categories.filter((category) => services.some((service) => service.category === category));
  const matchingServices = services.filter((service) => !searchQuery.trim() || (service.name + " " + service.category + " " + service.description).toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 5);
  const compactHoursSummary = (() => {
    const order: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const groups: { signature: string; days: DayKey[]; text: string }[] = [];
    for (const day of order) {
      const hours = clinicSettings.openingHours[day];
      const signature = !hours.open ? "closed" : [hours.byAppointment ? "appointment" : "open", hours.start, hours.end].join("|");
      const text = !hours.open ? "Closed" : (hours.byAppointment ? "by appointment" : "open") + " · " + hours.start + "–" + hours.end;
      const existing = groups.find((group) => group.signature === signature);
      if (existing) existing.days.push(day);
      else groups.push({ signature, days: [day], text });
    }
    const short: Record<DayKey, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
    return groups.map((group) => {
      const indexes = group.days.map((day) => order.indexOf(day));
      const consecutive = indexes.every((value, index) => index === 0 || value === indexes[index - 1] + 1);
      const dayText = group.days.length > 1 && consecutive
        ? short[group.days[0]] + "–" + short[group.days[group.days.length - 1]]
        : group.days.map((day) => short[day]).join(", ");
      return dayText + " · " + group.text;
    }).join("  |  ");
  })();

  return <main className="site">
    {showAnnouncement && <div className="publicAnnouncement" role="status"><strong>{clinicSettings.announcement.title || "Clinic notice"}</strong><span>{clinicSettings.announcement.message}</span></div>}
    <div className="topbar"><div className="container topbarInner"><span>1900 Dundas Street West, Suite 27 · Mississauga</span><strong>Medical Aesthetics · Skin Health · Wellness</strong><a href="#visit">Visit the spa</a></div></div>
    <nav className="nav"><div className="container navInner"><Link href="/" className="brand" aria-label="Village Wellness Spa home"><span className="brandMark"><img src="/icon.svg" alt="" /></span><span>Village<span>WELLNESS SPA</span></span></Link><div className="navLinks"><a href="#treatments">Treatments & prices</a><a href="#our-care">Our approach</a><a href="#visit">Visit</a><Link href="/account">My Village Wellness Spa</Link></div><Link href="/account" className="button buttonLight mobileAccountLink">My account</Link><Link href="/book" className="button buttonPrimary">Book a visit <span aria-hidden="true">↗</span></Link></div></nav>

    <section className="hero heroEditorial">
      <div className="container heroGrid">
        <div className="heroCopy">
          <span className="eyebrow">A considered kind of care · Mississauga</span>
          <h1>Feel good in your skin. <em>Feel cared for.</em></h1>
          <p>IV wellness, facials, skin treatments, massage, nails and body care in a welcoming, boutique setting. Tell us what you are looking for and our team can help you explore the next step.</p>
          <form className="heroSearch" role="search" onSubmit={event=>{event.preventDefault();if(matchingServices.length){document.getElementById("treatments")?.scrollIntoView({behavior:"smooth"});}else{window.location.href="/book?service=skin-consultation";}}}><label htmlFor="treatment-search">What would you like help with?</label><div className="heroSearchInput"><input id="treatment-search" type="search" value={searchQuery} onChange={event=>setSearchQuery(event.target.value)} placeholder="Search treatments, skin concerns, wellness…" autoComplete="off"/><button type="submit">Search</button></div>{searchQuery.trim()&&<div className="heroSearchResults" role="listbox" aria-label="Matching treatments">{matchingServices.length?matchingServices.map(service=><Link key={service.id} href={"/treatments/"+encodeURIComponent(service.id)} className="heroSearchResult"><span><strong>{service.name}</strong><small>{service.category} · {service.duration}</small></span><b>{service.price}</b></Link>):<div className="heroSearchEmpty">No exact match. <Link href="/book?service=skin-consultation">Ask the clinical team</Link></div>}</div>}</form><div className="heroSecondaryActions"><Link href="/book?service=skin-consultation" className="textLink">Not sure? Ask the clinical team →</Link><Link href="/treatments" className="textLink">Full treatment menu</Link></div>
          {serviceCategories.length > 0 && <nav className="filterChips homeCategoryLinks" aria-label="Explore treatment categories">{serviceCategories.slice(0, 6).map(category => <Link key={category} href={"/treatments?category="+encodeURIComponent(category)} className="filterChip">{category}</Link>)}</nav>}
          <div className="trustLine"><span>✦</span> Personalised care <span>·</span> Discreet setting <span>·</span> Clinical guidance</div>
        </div>
        <div className="heroArtwork">
          <ImagePlaceholder imageUrl={services.find(service=>service.imageUrl)?.imageUrl} label="Village Wellness Spa treatment photography" className="heroImage" />
          <div className="heroCaption"><span>VILLAGE WELLNESS SPA</span><strong>Personal care. A little more room to feel like you.</strong><small>{services.find(service=>service.imageUrl)?.imageUrl ? "Approved treatment photography" : "Add approved clinic photography in Admin"}</small></div>
          <div className="heroStamp"><span>CARE</span><span>WITH</span><span>CLARITY</span></div>
        </div>
      </div>
    </section>



    <section id="our-care" className="careNote"><div className="container careNoteInner"><span className="kicker">Clinical guidance</span><p>Your goals matter. The clinical team helps you understand suitable options—you do not need to diagnose yourself or know the treatment name.</p></div></section>

    <section id="treatments" className="section"><div className="container"><div className="sectionHead sectionHeadRow"><div><span className="kicker">Treatments & pricing</span><h2>{searchQuery.trim() ? "Matching treatments" : "Popular starting points"}</h2><p>Explore services and request current pricing. Any treatment requiring assessment is reviewed by a qualified practitioner.</p></div><Link href="/treatments" className="textLink">Full menu →</Link></div>
      {loading ? <div className="loadingCard">Opening the Village Wellness Spa menu…</div> : services.length === 0 ? <div className="emptyPublic"><h3>The menu is temporarily unavailable.</h3><p>You can still request a consultation and the team can guide you.</p><Link href="/book?service=skin-consultation" className="button buttonPrimary">Start with a consultation</Link></div> : <div className="serviceGrid homeServiceGrid">{(searchQuery.trim() ? matchingServices : services.slice(0, 6)).map((service) => <article className="serviceCard homeServiceCard" key={service.id}><ImagePlaceholder imageUrl={service.imageUrl} label={`${service.name} photography`} className="serviceImage" /><span>{service.category}</span><h3>{service.name}</h3><p>{service.description}</p><div className="serviceMeta"><strong>{service.price}</strong><small>{service.duration}</small></div><Link href={`/book?service=${encodeURIComponent(service.id)}`} className="button buttonDark">Request this service</Link></article>)}</div>}
      
    </div></section>

{loyaltyPrograms.length>0&&<section className="section offersSection"><div className="container"><div className="sectionHead"><span className="kicker">Current offers</span><h2>Offers & updates</h2></div><div className="offerGrid">{loyaltyPrograms.map(program=><article className="offerCard" key={program.id}><span className="kicker">Village Wellness Spa offer</span><h3>{program.title}</h3><p>{program.description}</p><strong>{program.discountType==="PERCENT"?program.value+"% off":"$"+program.value+" off"}</strong><small>{program.eligibility==="RETURNING"?"For returning clients":"Use code: "+program.code}</small></article>)}</div></div></section>}

    {products.length > 0 && <section className="section productSection"><div className="container"><div className="sectionHead sectionHeadRow"><div><span className="kicker">At-home skincare</span><h2>Continue your routine with care.</h2><p>Explore products listed by Village Wellness Spa. Contact the team to enquire about current availability.</p></div></div><div className="productGrid">{products.slice(0, 5).map((product) => <article className="productCard" key={product.id}><ImagePlaceholder imageUrl={product.imageUrl} label={`${product.name} product image`} className="productImage" /><span className="kicker">{product.size || "Professional skincare"}</span><h3>{product.name}</h3><p>{product.description}</p><div className="serviceMeta"><strong>{product.price}</strong><button type="button" className="textLink productEnquireButton" onClick={() => setEnquiry({ kind: "PRODUCT", id: product.id, name: product.name, price: product.price })}>Enquire in app →</button></div></article>)}</div></div></section>}

    <section id="visit" className="visit"><div className="container visitGrid"><div><span className="kicker">Visit Village Wellness Spa</span><h2>Your appointment starts with clarity.</h2><p>1900 Dundas Street West, Suite 27, Mississauga, ON L5K 1P9, Canada.</p><p className="visitHoursSummary">{compactHoursSummary}</p><small>Temporary changes are posted here by the clinic.</small></div><div className="visitCard"><strong>Choose a time that works.</strong><p>Pick an available slot online. The Village Wellness Spa team will confirm your appointment with you.</p><Link href="/book" className="button buttonPrimary">Book a visit</Link></div></div></section>

    <footer className="footer"><div className="container footerGrid"><div><div className="brand brandFooter"><span className="brandMark"><img src="/icon.svg" alt="" /></span><span>Village<span>WELLNESS SPA</span></span></div><p>Medical aesthetics · Skin health · Wellness</p><button type="button" className="footerEnquiryLink" onClick={() => setEnquiry({ kind: "GENERAL" })}>Questions? Send an enquiry</button></div><div><strong>Explore</strong><Link href="/treatments">Treatments & prices</Link><Link href="/book">Book a visit</Link><a href="#our-care">Our approach</a></div><div><strong>Find us</strong><span>1900 Dundas Street West, Suite 27</span><span>Mississauga, ON L5K 1P9, Canada</span><span>Appointments by request</span></div></div><div className="container footerBottom"><span>© 2026 Village Wellness Spa</span><Link href="/admin" className="adminFooterLink" aria-label="Admin sign in">Admin</Link></div></footer>
    <EnquiryModal open={!!enquiry} onClose={() => setEnquiry(null)} kind={enquiry?.kind ?? "GENERAL"} itemId={enquiry?.id} itemName={enquiry?.name} itemPrice={enquiry?.price} />
  </main>;
}
