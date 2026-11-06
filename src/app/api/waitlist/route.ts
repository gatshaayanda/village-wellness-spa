import { NextResponse } from "next/server";

// Customer waitlist requests are retired. Customers book through /book;
// reception registers only physically present walk-ins in Admin → Walk-ins & visits.
export async function POST() {
  return NextResponse.json(
    { error: "The appointment waitlist is no longer available. Please request an appointment or contact the spa." },
    { status: 410 },
  );
}
