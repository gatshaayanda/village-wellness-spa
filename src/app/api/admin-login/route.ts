import { createHash, timingSafeEqual } from "node:crypto";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function matchesAccessWord(input: string, expected: string) {
  const actualDigest = createHash("sha256").update(input).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return input.length > 0 && timingSafeEqual(actualDigest, expectedDigest);
}

export async function POST(request: Request) {
  try {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      return NextResponse.json(
        { error: "Admin access is not configured yet. Set ADMIN_PASSWORD in the server environment." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = await request.json().catch(() => null) as { word?: unknown } | null;
    const word = typeof body?.word === "string" ? body.word : "";
    if (!matchesAccessWord(word, expected)) {
      return NextResponse.json(
        { error: "Access denied. Check the access word and try again." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const uid = "tripple-s-one-word-admin";
    const db = getAdminDb();
    const adminRef = db.collection("admins").doc(uid);
    const existing = await adminRef.get();
    if (!existing.exists) {
      await adminRef.set({ role: "owner", temporaryAccess: true, accessMethod: "one-word-admin" });
    } else if (!["owner", "staff"].includes(String(existing.data()?.role ?? ""))) {
      return NextResponse.json(
        { error: "This access account is not authorized for Village Wellness Spa Admin." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const token = await getAdminAuth().createCustomToken(uid);
    return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Village Wellness Spa] Admin sign-in failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Admin sign-in is temporarily unavailable. Check the server configuration." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
