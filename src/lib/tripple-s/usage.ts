export type UsageEvent =
  | "page_view"
  | "booking_start"
  | "availability_result"
  | "booking_submit_success"
  | "booking_conflict"
  | "enquiry_submit_success"
  | "walkin_registered"
  | "visit_completed"
  | "walkin_queue_start"
  | "walkin_queue_join_success"
  | "treatment_selected";

type UsagePayload = {
  event: UsageEvent;
  category?: "home" | "treatments" | "treatment_detail" | "products" | "booking" | "queue" | "account" | "other";
  outcome?: "available" | "empty" | "error";
  firstSession?: boolean;
  source?: "direct" | "search" | "social" | "referral";
  device?: "mobile" | "tablet" | "desktop";
};

export type LocalUsageEvent = {
  event: UsageEvent;
  category?: UsagePayload["category"];
  outcome?: UsagePayload["outcome"];
  createdAt: string;
  payloadBytes: number;
};

const LOCAL_EVENTS_KEY = "village-wellness-spa-local-usage-events-v1";

function sourceBucket(): NonNullable<UsagePayload["source"]> {
  const referrer = document.referrer;
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (/google\.|bing\.|yahoo\.|duckduckgo\./.test(host)) return "search";
    if (/instagram\.|facebook\.|tiktok\.|youtube\.|whatsapp\.|linkedin\./.test(host)) return "social";
    return "referral";
  } catch {
    return "direct";
  }
}

function deviceBucket(): NonNullable<UsagePayload["device"]> {
  if (window.innerWidth < 640) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function isFirstSession(): boolean {
  const key = "tripple-s-usage-session-counted";
  try {
    if (sessionStorage.getItem(key) === "1") return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

/** Local event copies are privacy-limited and never contain customer-entered data. */
export function getLocalUsageEvents(days = 30): LocalUsageEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOCAL_EVENTS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - days * 86400000;
    return (parsed as LocalUsageEvent[]).filter(item =>
      item && typeof item.createdAt === "string" &&
      Number.isFinite(new Date(item.createdAt).getTime()) &&
      new Date(item.createdAt).getTime() >= cutoff
    );
  } catch {
    return [];
  }
}

/** Coarse aggregate events only: never sends names, contact details, query strings, or clinical information. */
export function trackUsage(event: UsageEvent, extra: Pick<UsagePayload, "category" | "outcome"> = {}) {
  if (typeof window === "undefined") return;
  const payload: UsagePayload = { event, ...extra };
  if (event === "page_view") {
    payload.firstSession = isFirstSession();
    payload.source = sourceBucket();
    payload.device = deviceBucket();
  }

  const localRecord = {
    event,
    ...(payload.category ? { category: payload.category } : {}),
    ...(payload.outcome ? { outcome: payload.outcome } : {}),
    createdAt: new Date().toISOString(),
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(localRecord)).length;
  try {
    const existing = getLocalUsageEvents(30);
    existing.push({ ...localRecord, payloadBytes });
    window.localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(existing.slice(-500)));
  } catch {
    // Local analytics must never interrupt browsing or booking.
  }

  void fetch("/api/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    cache: "no-store",
  }).catch(() => {
    // Firebase analytics must never interrupt the customer journey.
  });
}
