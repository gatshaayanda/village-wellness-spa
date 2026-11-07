"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ServiceGuide from "@/components/ServiceGuide";
import { getPublicServices, type ServiceRecord } from "@/lib/firebase/data";

export default function VillageWellnessGuide() {
  const pathname = usePathname();
  const router = useRouter();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  useEffect(() => {
    let active = true;
    void getPublicServices().then(items => { if (active) setServices(items.filter(item => item.active)); }).catch(() => { if (active) setServices([]); });
    return () => { active = false; };
  }, []);
  const visible = !pathname.startsWith("/admin") && !pathname.startsWith("/api") && !pathname.startsWith("/auth");
  const guideServices = useMemo(() => services.map(item => ({ id:item.id, name:item.name, price:item.price, description:item.description, media:item.imageUrl || "", mediaType:"image" as const, active:item.active })), [services]);
  if (!visible) return null;
  return <ServiceGuide
    view="shop"
    services={guideServices}
    requestCount={0}
    onChooseService={service => router.push("/book?service=" + encodeURIComponent(service.id))}
    onOpenAccount={() => router.push("/account")}
    onOpenAdmin={() => router.push("/admin")}
    onOpenStorefront={() => router.push("/")}
    onOpenBook={() => router.push("/book")}
    onOpenGarden={() => router.push("/garden")}
  />;
}
