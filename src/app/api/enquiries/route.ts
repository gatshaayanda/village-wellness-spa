import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { trippleSProductSeed, trippleSServiceSeed } from "@/lib/tripple-s/catalog";

export const dynamic = "force-dynamic";
type EnquiryKind = "PRODUCT" | "TREATMENT" | "GENERAL";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Check the enquiry details and try again." }, { status: 400 }); }
  if (String(body.website ?? "").trim()) return NextResponse.json({ error: "The enquiry could not be accepted." }, { status: 400 });

  const kind = String(body.kind ?? "") as EnquiryKind;
  const name = String(body.name ?? "").trim().slice(0, 120);
  const phone = String(body.phone ?? "").trim().slice(0, 40);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const message = String(body.message ?? "").trim().slice(0, 1000);
  const itemId = String(body.itemId ?? "").trim().slice(0, 160);
  if (!["PRODUCT", "TREATMENT", "GENERAL"].includes(kind) || !name || !phone || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: "Enter your name and mobile number, and check your email address." }, { status: 400 });
  }
  if (kind !== "GENERAL" && !itemId) return NextResponse.json({ error: "Choose the item you want to enquire about." }, { status: 400 });

  try {
    const db = getAdminDb();
    let itemName = "";
    let itemPrice = "";
    if (kind === "PRODUCT") {
      const snapshot = await db.collection("products").doc(itemId).get();
      const record = snapshot.exists ? { id: snapshot.id, ...snapshot.data() } as { id: string; name?: string; price?: string; active?: boolean } : trippleSProductSeed.find(item => item.id === itemId);
      if (!record || record.active === false || !record.name) return NextResponse.json({ error: "That product is no longer available to enquire about." }, { status: 409 });
      itemName = record.name; itemPrice = String(record.price ?? "");
    } else if (kind === "TREATMENT") {
      const snapshot = await db.collection("services").doc(itemId).get();
      const record = snapshot.exists ? { id: snapshot.id, ...snapshot.data() } as { id: string; name?: string; price?: string; active?: boolean } : trippleSServiceSeed.find(item => item.id === itemId);
      if (!record || record.active === false || !record.name) return NextResponse.json({ error: "That treatment is no longer published." }, { status: 409 });
      itemName = record.name; itemPrice = String(record.price ?? "");
    }

    const requestType = kind === "PRODUCT" ? "PRODUCT_ENQUIRY" : kind === "TREATMENT" ? "TREATMENT_ENQUIRY" : "GENERAL_ENQUIRY";
    const ref = db.collection("bookingRequests").doc();
    const label = itemName ? (kind === "PRODUCT" ? "Product enquiry: " : "Treatment enquiry: ") + itemName : "General enquiry";
    const details = [
      kind === "PRODUCT" ? "Enquiry about current product availability." : kind === "TREATMENT" ? "Treatment information enquiry." : "General client enquiry.",
      itemPrice ? "Published price at enquiry time: " + itemPrice + "." : "",
      message ? "Customer question: " + message : "",
    ].filter(Boolean).join("\n");
    await ref.create({
      requestType, createdAt: new Date().toISOString(), name, phone, ...(email ? { email } : {}),
      serviceNameSnapshot: label,
      ...(kind === "PRODUCT" ? { productId: itemId, productNameSnapshot: itemName } : {}),
      ...(kind === "TREATMENT" ? { serviceId: itemId } : {}),
      clientType: "NEW", status: "NEW", paymentStatus: "PAYMENT_PENDING", message: details,
    });
    return NextResponse.json({ id: ref.id, reference: ref.id.slice(0, 8).toUpperCase() }, { status: 201 });
  } catch (error) {
    console.error("[Village Wellness Spa] client enquiry save failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "We could not record your enquiry. Please try again shortly." }, { status: 503 });
  }
}
