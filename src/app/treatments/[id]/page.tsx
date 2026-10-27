"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import EnquiryModal from "@/components/enquiry-modal";
import { getPublicServices, type ServiceRecord } from "@/lib/firebase/data";

export default function TreatmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id ?? "");
  const [service, setService] = useState<ServiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  useEffect(() => {
    void getPublicServices()
      .then((items) => setService(items.find((item) => item.active && item.id === id) ?? null))
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <main className="bookPage"><div className="formWrap"><div className="formCard"><p>Opening treatment details…</p></div></div></main>;
  }

  if (!service) {
    return (
      <main className="bookPage">
        <nav className="nav"><div className="container navInner"><Link href="/" className="brand"><span className="brandMark"><img src="/villagespa.jpg" alt="" /></span><span>Village<span>WELLNESS SPA</span></span></Link><Link href="/treatments" className="button buttonLight">All treatments</Link></div></nav>
        <div className="formWrap"><div className="formCard emptyPublic"><h1>Treatment not found</h1><p>This treatment may no longer be published. You can browse the current catalogue or contact Village Wellness Spa directly.</p><div className="actions"><Link href="/treatments" className="button buttonPrimary">View treatments</Link></div></div></div>
      </main>
    );
  }

  return (
    <main className="site">
      <nav className="nav">
        <div className="container navInner">
          <Link href="/" className="brand"><span className="brandMark">S</span><span>Village<span>WELLNESS SPA</span></span></Link>
          <Link href="/book" className="button buttonPrimary">Book an appointment</Link>
        </div>
      </nav>

      <section className="section">
        <div className="container treatmentDetail">
          <Link href="/treatments" className="textLink">← All treatments</Link>
          <div className="treatmentHero">
            {service.imageUrl && <img className="treatmentDetailImage" src={service.imageUrl} alt={`${service.name} treatment`} />}
            <div>
              <span className="kicker">{service.category}</span>
              <h1>{service.name}</h1>
              <p className="treatmentLead">{service.description}</p>
              <div className="serviceMeta treatmentMeta"><strong>{service.price}</strong><small>{service.duration}</small></div>
              {service.consultationRequired && <div className="assessmentNotice"><strong>Clinical assessment may be required.</strong><span>Suitability is determined by the Village Wellness Spa clinical team.</span></div>}
              {service.assessmentNote && <p className="assessmentCopy">{service.assessmentNote}</p>}
              <div className="actions">
                <Link href={`/book?service=${encodeURIComponent(service.id)}`} className="button buttonPrimary">Request this appointment</Link>
                <button type="button" className="button buttonLight" onClick={() => setEnquiryOpen(true)}>Ask about this treatment</button>
              </div>
            </div>
            <aside className="detailAside">
              <strong>What happens next</strong>
              <ol>
                <li>Send your appointment request.</li>
                <li>The Village Wellness Spa team reviews your request.</li>
                <li>The team contacts you to confirm suitability, timing and appointment details.</li>
              </ol>
              <p>Submitting a request does not automatically confirm an appointment.</p>
            </aside>
          </div>

          <div className="detailSections">
            <section><span className="kicker">Preparation</span><h2>Before your visit</h2><p>{service.prep || "Treatment-specific preparation will be provided by Village Wellness Spa when applicable. Please wait for the clinical team’s guidance rather than relying on generic instructions."}</p></section>
            <section><span className="kicker">Aftercare</span><h2>After your visit</h2><p>{service.aftercare || "If aftercare is needed, the Village Wellness Spa clinical team will provide the relevant instructions for your treatment."}</p></section>
          </div>
        </div>
      </section>

      <section className="confidence"><div className="container confidenceGrid"><div><span className="kicker">Need help choosing?</span><h2>Start with a consultation.</h2><p>Tell the team what you would like to improve. You do not need to diagnose yourself.</p></div><Link href="/book?service=skin-consultation" className="button buttonLight">Book a consultation</Link></div></section>
      <EnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} kind="TREATMENT" itemId={service.id} itemName={service.name} itemPrice={service.price} />
    </main>
  );
}
