import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireCustomer } from "@/lib/firebase/admin";
import { trippleSServiceSeed, type ServiceSeed } from "@/lib/tripple-s/catalog";
import { defaultClinicSettings, parseDurationMinutes, type DayKey } from "@/lib/tripple-s/clinic-settings";
export const dynamic = "force-dynamic";
const days: DayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const mins = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (value: number) => String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0");
const slotId = (date: string, time: string) => date.replace(/-/g, "") + "_" + time.replace(":", "");
const durationOf = (value: string | undefined) => parseDurationMinutes(value, 30);
const priceOf = (value: string | undefined) => { if (!value || /[-–—]/.test(value)) return null; const match = value.match(/P\s*([\d,]+(?:\.\d{1,2})?)/i); return match ? Number(match[1].replace(/,/g, "")) : null; };
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Please check the booking details and try again." }, { status: 400 }); }
  const authorization=request.headers.get("authorization");
  const customer=authorization?await requireCustomer(request):null;
  if(authorization&&!customer)return NextResponse.json({error:"Your customer session expired. Please retry your request."},{status:401});
  const name = String(body.name ?? "").trim().slice(0, 120);
  const phone = String(body.phone ?? "").trim().slice(0, 40);
  const email = String(body.email ?? customer?.email ?? "").trim().slice(0, 200);
  const date = String(body.preferredDate ?? "").trim();
  const time = String(body.time ?? "").trim();
  const clientType = body.clientType === "RETURNING" ? "RETURNING" : "NEW";
  const serviceId = String(body.serviceId ?? "").trim();
  const message = String(body.message ?? "").trim().slice(0, 1500);
  const code = String(body.discountCode ?? "").trim().toUpperCase();
  const parsedDate = new Date(date + "T12:00:00+02:00");
  if (!name || !phone || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NextResponse.json({ error: "Enter your name and mobile number, then choose a valid date and available time." }, { status: 400 });
  try {
    const db = getAdminDb();
    const settingsSnap = await db.collection("settings").doc("clinic").get();
    const saved = settingsSnap.data() ?? {};
    const settings = { openingHours: { ...defaultClinicSettings.openingHours, ...(saved.openingHours ?? {}) }, bookingRules: { ...defaultClinicSettings.bookingRules, ...(saved.bookingRules ?? {}), minimumNoticeHours: 0 } };
    settings.openingHours.sunday = { ...defaultClinicSettings.openingHours.sunday, ...(saved.openingHours?.sunday ?? {}), open: true, byAppointment: true };
    const day = days[new Date(date + "T12:00:00+02:00").getUTCDay()];
    
    const hours = settings.openingHours[day];
    if (!hours?.open) return NextResponse.json({ error: "The clinic is not accepting requests on that day. Choose another date." }, { status: 409 });
    const today = new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10);
    const distance = Math.round((new Date(date + "T00:00:00+02:00").getTime() - new Date(today + "T00:00:00+02:00").getTime()) / 86400000);
    if (distance < 0 || distance > settings.bookingRules.advanceBookingDays) return NextResponse.json({ error: "Choose a date within the booking window." }, { status: 409 });
    if (new Date(date + "T" + time + ":00+02:00").getTime() < Date.now() + Number(settings.bookingRules.minimumNoticeHours || 0) * 3600000) return NextResponse.json({ error: "That time is too soon to book. Choose a later slot." }, { status: 409 });
    const serviceSnap = serviceId ? await db.collection("services").doc(serviceId).get() : null;
    const service: ServiceSeed | null = serviceSnap?.exists ? ({ id: serviceId, ...serviceSnap.data() } as ServiceSeed) : (trippleSServiceSeed.find((item) => item.id === serviceId) ?? null);
    if (serviceId && (!service || service.active === false)) return NextResponse.json({ error: "That treatment is no longer available. Please choose another." }, { status: 409 });
    const duration = durationOf(String(service?.duration ?? "30 min"));
    const basePrice = priceOf(String(service?.price ?? ""));
    const end = mins(time) + duration;
    const interval = Math.max(15, Number(settings.bookingRules.slotIntervalMinutes) || 15);
    if (mins(time) < mins(hours.start) || end + Number(settings.bookingRules.bufferMinutes || 0) > mins(hours.end) || (mins(time) - mins(hours.start)) % interval !== 0) return NextResponse.json({ error: "Choose one of the available times within clinic hours." }, { status: 409 });
    // The transaction below checks every 15-minute lock covering this service and buffer.
    // These locks are written atomically with booking requests and calendar entries, so querying
    // every appointment/request for the date here would duplicate reads without improving safety.
    let discount: Record<string, unknown> | null = null;
    if (code) {
      const programs = await db.collection("loyaltyPrograms").where("active", "==", true).get();
      const candidates: Record<string, unknown>[] = programs.docs.map((item) => ({ id: item.id, ...item.data() } as Record<string, unknown>));
      discount = candidates.find((item) => String(item.code ?? "").toUpperCase() === code && (!item.startDate || String(item.startDate) <= date) && (!item.endDate || String(item.endDate) >= date) && (item.eligibility === "ALL" || (item.eligibility === "RETURNING" && clientType === "RETURNING"))) ?? null;
      if (!discount) return NextResponse.json({ error: "That offer code is invalid, expired or not eligible for this booking." }, { status: 400 });
    }
    const discountType = String(discount?.discountType ?? "");
    const discountValue = Number(discount?.value ?? 0);
    const discountAmount = discount && basePrice !== null ? Math.min(basePrice, discountType==="PERCENT" ? basePrice*discountValue/100 : discountValue) : 0;
    const finalPrice = basePrice === null ? undefined : "P" + (basePrice-discountAmount).toFixed(2).replace(/\.00$/,"");
    const idRef = db.collection("bookingRequests").doc();
    const occupied: string[] = [];
    for (let minute=mins(time); minute<end+Number(settings.bookingRules.bufferMinutes||0); minute+=15) occupied.push(clock(minute));
    const reservationRefs = occupied.map((value) => db.collection("slotReservations").doc(slotId(date,value)));
    await db.runTransaction(async (tx) => {
      const snapshots=await Promise.all(reservationRefs.map((ref)=>tx.get(ref)));
      const ownerRefs=snapshots.flatMap(snapshot=>{const data=snapshot.data();if(data?.bookingRequestId)return [db.collection("bookingRequests").doc(String(data.bookingRequestId))];if(data?.appointmentId)return [db.collection("appointments").doc(String(data.appointmentId))];return [];});
      const uniqueOwnerRefs=Array.from(new Map(ownerRefs.map(ref=>[ref.path,ref])).values());
      const ownerSnapshots=await Promise.all(uniqueOwnerRefs.map(ref=>tx.get(ref)));
      const owners=new Map(ownerSnapshots.map(snapshot=>[snapshot.ref.path,snapshot]));
      const hasLiveConflict=snapshots.some(snapshot=>{if(!snapshot.exists)return false;const data=snapshot.data()??{};if(data.bookingRequestId){const owner=owners.get(db.collection("bookingRequests").doc(String(data.bookingRequestId)).path);return Boolean(owner?.exists&&!["CANCELLED","DECLINED","RESCHEDULED"].includes(String(owner.data()?.status??"")));}if(data.appointmentId){const owner=owners.get(db.collection("appointments").doc(String(data.appointmentId)).path);return Boolean(owner?.exists&&owner.data()?.status!=="CANCELLED");}return false;});
      if(hasLiveConflict)throw new Error("SLOT_TAKEN");
      const payload = { createdAt:new Date().toISOString(), ...(customer?{customerUid:customer.uid}:{}), name, phone, ...(email?{email}:{}), ...(serviceId?{serviceId}:{}), serviceNameSnapshot:String(service?.name??"Consultation / help choosing"), ...(service?{priceSnapshot:String(service.price??""),durationSnapshot:String(service.duration??duration+" min")}:{durationSnapshot:duration+" min"}), preferredDate:date, preferredTime:time, clientType, status:"NEW", paymentStatus:"PAYMENT_PENDING", ...(message?{message}:{}), ...(discount?{discountCodeSnapshot:String(discount.code),discountAmountSnapshot:discountAmount,...(finalPrice?{finalPriceSnapshot:finalPrice}:{})}:{}) };
      tx.create(idRef,payload);
      if (customer) {
        const profileRef = db.collection("customerProfiles").doc(customer.uid);
        tx.set(profileRef, {
          uid: customer.uid,
          name,
          phone,
          ...(email ? { email } : {}),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      for (let i=0;i<reservationRefs.length;i++) tx.set(reservationRefs[i],{date,time:occupied[i],bookingRequestId:idRef.id,kind:"booking-request",createdAt:new Date().toISOString()});
    });
    return NextResponse.json({id:idRef.id,reference:idRef.id.slice(0,8).toUpperCase(),discountAmount,finalPrice},{status:201});
  } catch (error) {
    const message=error instanceof Error?error.message:"";
    if (message==="SLOT_TAKEN") return NextResponse.json({error:"Someone has just taken that slot. Please choose another available time."},{status:409});
    console.error("[Village Wellness Spa] booking save failed",message||"unknown");
    return NextResponse.json({error:"We could not record the request. Please try again shortly."},{status:503});
  }
}
