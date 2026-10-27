"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackUsage } from "@/lib/tripple-s/usage";

function categoryFor(pathname: string): "home" | "treatments" | "treatment_detail" | "products" | "booking" | "account" | "other" {
  if (pathname === "/") return "home";
  if (pathname === "/treatments") return "treatments";
  if (pathname.startsWith("/treatments/")) return "treatment_detail";
  if (pathname === "/products" || pathname.startsWith("/products/")) return "products";
  if (pathname === "/book") return "booking";
  if (pathname.startsWith("/account")) return "account";
  return "other";
}

export default function UsageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    trackUsage("page_view", { category: categoryFor(pathname) });
    if (pathname === "/book") {
      try {
        if (sessionStorage.getItem("village-spa-booking-started") !== "1") {
          sessionStorage.setItem("village-spa-booking-started", "1");
          trackUsage("booking_start");
        }
      } catch {
        trackUsage("booking_start");
      }
    }
  }, [pathname]);
  return null;
}
