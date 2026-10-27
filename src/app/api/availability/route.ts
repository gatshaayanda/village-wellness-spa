import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { defaultClinicSettings, type DayKey } from "@/lib/tripple-s/clinic-settings";
export const dynamic = "force-dynamic";
const days: DayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (value: number) => String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0");
function localDay(date: string) { return days[new Date(date + "T12:00:00+02:00").getUTCDay()]; }
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  const duration = Math.max(15, Math.min(240, Number(request.nextUrl.searchParams.get("duration") ?? 30) || 30));
  const parsedDate = new Date(date + "T12:00:00+02:00");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return NextResponse.json({ error: "Choose a valid appointment date." }, { status: 400 });
  try {
    const db = getAdminDb();
    const settingsSnap = await db.collection("settings").doc("clinic").get();
    const saved = settingsSnap.data() ?? {};
    const settings = { openingHours: { ...defaultClinicSettings.openingHours, ...(saved.openingHours ?? {}) }, bookingRules: { ...defaultClinicSettings.bookingRules, ...(saved.bookingRules ?? {}), minimumNoticeHours: 0 } };
    settings.openingHours.sunday = { ...defaultClinicSettings.openingHours.sunday, ...(saved.openingHours?.sunday ?? {}), open: true, byAppointment: true };
    const dayKey = localDay(date);
    const day = settings.openingHours[dayKey];
    if (!day?.open) return NextResponse.json({ slots: [], note: "The clinic is not accepting requests on this day." });
    const today = new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10);
    const distance = Math.round((new Date(date + "T00:00:00+02:00").getTime() - new Date(today + "T00:00:00+02:00").getTime()) / 86400000);
    if (distance < 0 || distance > settings.bookingRules.advanceBookingDays) return NextResponse.json({ slots: [], note: "Choose a date within the booking window." });
    // Reservation documents are the canonical occupancy index. Booking and calendar writes
    // create these locks transactionally; cancellation/decline removes them. Reading whole
    // booking-request and appointment collections for every date picker interaction is wasteful.
    const reservations = await db.collection("slotReservations").where("date", "==", date).get();
    // A reservation lock counts only while its owning request/calendar entry exists and is active.
    // This prevents orphaned legacy locks from hiding otherwise-free appointment starts.
    const reservationRows = reservations.docs.map((item) => {
      const data = item.data();
      const ownerRef = data.bookingRequestId
        ? db.collection("bookingRequests").doc(String(data.bookingRequestId))
        : data.appointmentId
          ? db.collection("appointments").doc(String(data.appointmentId))
          : null;
      return { data, ownerRef };
    });
    const ownerRefMap = new Map<string, (typeof reservationRows)[number]["ownerRef"]>();
    for (const row of reservationRows) if (row.ownerRef) ownerRefMap.set(row.ownerRef.path, row.ownerRef);
    const ownerRefs = Array.from(ownerRefMap.values()).filter((ref): ref is NonNullable<typeof ref> => ref !== null);
    const ownerSnapshots = await Promise.all(ownerRefs.map((ref) => ref.get()));
    const owners = new Map(ownerSnapshots.map((snapshot) => [snapshot.ref.path, snapshot]));
    const occupied = new Set(reservationRows.filter(({ ownerRef }) => {
      if (!ownerRef) return false;
      const owner = owners.get(ownerRef.path);
      if (!owner?.exists) return false;
      const status = String(owner.data()?.status ?? "");
      return ownerRef.parent.id === "bookingRequests"
        ? !["CANCELLED", "DECLINED", "RESCHEDULED"].includes(status)
        : status !== "CANCELLED";
    }).map(({ data }) => String(data.time)));
    const interval = Math.max(15, Math.min(60, Number(settings.bookingRules.slotIntervalMinutes) || 15));
    const minimum = Date.now();
    const buffer = Math.max(0, Number(settings.bookingRules.bufferMinutes) || 0);
    const endLimit = minutes(day.end);
    const slots: string[] = [];
    for (let start = minutes(day.start); start + duration <= endLimit; start += interval) {
      const time = clock(start);
      if (new Date(date + "T" + time + ":00+02:00").getTime() < minimum) continue;
      const busyEnd = start + duration + buffer;
      let blocked = false;
      for (let minute = start; minute < busyEnd; minute += 15) if (occupied.has(clock(minute))) blocked = true;

      if (!blocked) slots.push(time);
    }
    return NextResponse.json({ slots, note: day.byAppointment ? "Appointment-only hours; the clinic will confirm your request." : "" });
  } catch (error) {
    console.error("[Village Wellness Spa] availability lookup failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Live availability is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
