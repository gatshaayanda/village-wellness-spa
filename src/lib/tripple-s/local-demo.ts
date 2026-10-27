"use client";

const RECORDS_KEY = "village-wellness-spa-local-demo-records-v1";
const MODE_KEY = "village-wellness-spa-local-demo-mode-v1";

export type LocalDemoRecord = {
  id: string;
  createdAt: string;
  requestType?: "APPOINTMENT" | "PRODUCT_ENQUIRY" | "TREATMENT_ENQUIRY" | "GENERAL_ENQUIRY";
  name: string;
  phone: string;
  email?: string;
  serviceId?: string;
  serviceNameSnapshot: string;
  productId?: string;
  productNameSnapshot?: string;
  priceSnapshot?: string;
  durationSnapshot?: string;
  preferredDate?: string;
  preferredTime?: string;
  message?: string;
  clientType: "NEW" | "RETURNING";
  status: string;
  paymentStatus: string;
  [key: string]: unknown;
};

export function isLocalDemoMode(): boolean {
  return false;
}

export function setLocalDemoMode(enabled: boolean): void {
  void enabled;
  if (typeof window !== "undefined") window.localStorage.removeItem(MODE_KEY);
}

export function getLocalDemoRecords<T extends { id: string } = LocalDemoRecord>(): T[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(RECORDS_KEY) || "[]");
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

export function saveLocalDemoRecord<T extends { id: string }>(record: T): void {
  if (typeof window === "undefined") throw new Error("Local demo storage is only available in this browser.");
  const records = getLocalDemoRecords<T>();
  const next = records.filter(item => item.id !== record.id);
  next.unshift(record);
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(next.slice(0, 500)));
}

export function updateLocalDemoRecord<T extends { id: string }>(id: string, update: Partial<T>): void {
  const records = getLocalDemoRecords<T>();
  const current = records.find(item => item.id === id);
  if (current) saveLocalDemoRecord({ ...current, ...update });
}

export function deleteLocalDemoRecord(id: string): void {
  if (typeof window === "undefined") return;
  const records = getLocalDemoRecords();
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records.filter(item => item.id !== id)));
}

export function makeLocalDemoId(): string {
  return "demo-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function getLocalDemoBucket<T extends { id: string }>(bucket: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem("village-wellness-spa-local-demo-bucket-" + bucket) || "[]");
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

export function saveLocalDemoBucketRecord<T extends { id: string }>(bucket: string, record: T): void {
  if (typeof window === "undefined") throw new Error("Local demo storage is only available in this browser.");
  const records = getLocalDemoBucket<T>(bucket).filter(item => item.id !== record.id);
  records.unshift(record);
  window.localStorage.setItem("village-wellness-spa-local-demo-bucket-" + bucket, JSON.stringify(records.slice(0, 500)));
}

export function deleteLocalDemoBucketRecord(bucket: string, id: string): void {
  if (typeof window === "undefined") return;
  const records = getLocalDemoBucket(bucket).filter(item => item.id !== id);
  window.localStorage.setItem("village-wellness-spa-local-demo-bucket-" + bucket, JSON.stringify(records));
}

export function seedLocalDemoData(): void {
  if (typeof window === "undefined" || window.localStorage.getItem("village-wellness-spa-local-demo-seeded-v1") === "true") return;
  const date = new Date(Date.now() + 2 * 3600000 + 86400000).toISOString().slice(0, 10);
  saveLocalDemoRecord({
    id: "demo-appointment-request",
    createdAt: new Date().toISOString(),
    requestType: "APPOINTMENT",
    name: "Demo client — appointment",
    phone: "DEMO ONLY",
    serviceId: "skin-consultation",
    serviceNameSnapshot: "Skin Consultation",
    priceSnapshot: "Request pricing",
    durationSnapshot: "30 min",
    preferredDate: date,
    preferredTime: "09:00",
    clientType: "NEW",
    status: "NEW",
    paymentStatus: "PAYMENT_PENDING",
    message: "Sample request for testing the admin workflow.",
    localOnly: true,
  });
  saveLocalDemoRecord({
    id: "demo-product-enquiry",
    createdAt: new Date().toISOString(),
    requestType: "PRODUCT_ENQUIRY",
    name: "Demo client — product enquiry",
    phone: "DEMO ONLY",
    productId: "vitamin-c-serum",
    productNameSnapshot: "Vitamin C Serum",
    serviceNameSnapshot: "Product enquiry: Vitamin C Serum",
    clientType: "NEW",
    status: "NEW",
    paymentStatus: "PAYMENT_PENDING",
    message: "Sample enquiry for testing the admin workflow.",
    localOnly: true,
  });
  for (const item of [
    { id: "demo-appointment", date, startTime: "10:00", endTime: "11:00", title: "Demo appointment", kind: "APPOINTMENT", notes: "Sample calendar entry" },
    { id: "demo-break", date, startTime: "12:00", endTime: "12:30", title: "Demo break", kind: "BLOCK", notes: "Sample blocked time" },
    { id: "demo-walk-in", date, startTime: "13:00", endTime: "13:30", title: "Demo walk-in", kind: "WALK_IN", notes: "Sample walk-in occupancy" },
  ]) saveLocalDemoBucketRecord("calendar", item);
  window.localStorage.setItem("village-wellness-spa-local-demo-seeded-v1", "true");
}
