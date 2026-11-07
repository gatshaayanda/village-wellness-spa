import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, requireCustomer } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const customer = await requireCustomer(request);
  if (!customer) return NextResponse.json({ error: "Sign in to add this visit to your account." }, { status: 401 });
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: "This visit link is invalid or has expired." }, { status: 400 });
  const hash = createHash("sha256").update(token).digest("hex");
  const db = getAdminDb();
  try {
    const matches = await db.collection("bookingRequests").where("customerClaimTokenHash", "==", hash).limit(2).get();
    if (matches.size !== 1) return NextResponse.json({ error: "This visit link is invalid or has expired." }, { status: 404 });
    const ref = matches.docs[0].ref;
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const data = snap.data();
      if (!data || data.requestType !== "QUEUE" || String(data.customerClaimExpiresAt ?? "") < new Date().toISOString()) throw new Error("EXPIRED");
      if (data.customerUid && data.customerUid !== customer.uid) throw new Error("ALREADY_CLAIMED");
      tx.update(ref, {
        customerUid: customer.uid,
        customerClaimTokenHash: FieldValue.delete(),
        customerClaimExpiresAt: FieldValue.delete(),
        customerClaimedAt: new Date().toISOString(),
      });
      tx.set(db.collection("customerProfiles").doc(customer.uid), {
        uid: customer.uid,
        name: String(data.name ?? ""),
        phone: String(data.phone ?? ""),
        phoneNormalized: String(data.phoneNormalized ?? data.phone ?? "").replace(/\D/g, "").replace(/^0/, "267"),
        ...(customer.email ? { email: customer.email } : {}),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });
    return NextResponse.json({ linked: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    return NextResponse.json({
      error: reason === "ALREADY_CLAIMED" ? "This visit is already linked to your existing customer profile. Sign in to that account to view it." : "This visit link is invalid or has expired.",
    }, { status: reason === "ALREADY_CLAIMED" ? 409 : 404 });
  }
}
