import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { trippleSServiceSeed } from "@/lib/tripple-s/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gaboroneToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Gaborone",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeBotswanaPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("267")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 8 ? "267" + digits : "";
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== request.nextUrl.host) {
      return NextResponse.json({ error: "This request could not be verified. Refresh the page and try again." }, { status: 403 });
    }
    const body = await request.json() as Record<string, unknown>;
    const name = String(body.name ?? "").trim().slice(0, 120);
    const phoneInput = String(body.phone ?? "").trim().slice(0, 40);
    const phoneNormalized = normalizeBotswanaPhone(phoneInput);
    const serviceId = String(body.serviceId ?? "").trim().slice(0, 120);
    if (!name) return NextResponse.json({ error: "Enter your name to join the queue." }, { status: 400 });
    if (!phoneNormalized) return NextResponse.json({ error: "Enter a valid Botswana WhatsApp number with all eight digits." }, { status: 400 });

    const db = getAdminDb();
    let serviceName = "Consultation / help choosing";
    if (serviceId) {
      const [savedService, catalogueState] = await Promise.all([
        db.collection("services").doc(serviceId).get(),
        db.collection("settings").doc("catalogueState").get(),
      ]);
      if (savedService.exists) {
        const data = savedService.data() ?? {};
        if (data.active === false) return NextResponse.json({ error: "That treatment is no longer available. Choose another." }, { status: 409 });
        serviceName = String(data.name ?? "").trim().slice(0, 160);
      } else {
        const version = Number(catalogueState.data()?.serviceCatalogVersion ?? 0);
        const seed = version < 2 ? trippleSServiceSeed.find(item => item.id === serviceId && item.active) : undefined;
        if (!seed) return NextResponse.json({ error: "That treatment is no longer available. Refresh the list and choose another." }, { status: 409 });
        serviceName = seed.name;
      }
      if (!serviceName) return NextResponse.json({ error: "Choose a valid treatment." }, { status: 400 });
    }

    const now = new Date();
    const createdAt = now.toISOString();
    const claimToken = randomBytes(32).toString("hex");
    const claimTokenHash = createHash("sha256").update(claimToken).digest("hex");
    const ref = db.collection("bookingRequests").doc();
    await ref.set({
      createdAt,
      statusUpdatedAt: createdAt,
      visitDate: gaboroneToday(),
      preferredDate: gaboroneToday(),
      name,
      phone: "+" + phoneNormalized,
      phoneNormalized,
      serviceId: serviceId || "consultation",
      serviceNameSnapshot: serviceName,
      requestType: "QUEUE",
      queueMode: "CUSTOMER",
      status: "WAITING",
      paymentStatus: "NOT_RECORDED",
      clientType: "NEW",
      createdBy: "CUSTOMER",
      customerClaimTokenHash: claimTokenHash,
      customerClaimExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({
      reference: ref.id.slice(0, 8).toUpperCase(),
      claimToken,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Village Wellness Spa] customer queue entry failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "The queue could not be reached. Your details have not been submitted. Please try again or ask reception for help." }, { status: 503 });
  }
}
