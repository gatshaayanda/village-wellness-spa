import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminMessaging, requireAdmin } from "@/lib/firebase/admin";
const allowed = new Set(["NEW","REVIEWING","APPROVED","PAYMENT_PENDING","CONFIRMED","ARRIVED","COMPLETED","NEEDS_CONTACT","DECLINED","RESCHEDULED","CANCELLED","NO_SHOW","FOLLOW_UP"]);
export async function POST(request:NextRequest){
 if(!await requireAdmin(request))return NextResponse.json({error:"Sign in with an authorized staff account."},{status:401});
 let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid request status."},{status:400});}
 const id=String(body.id||""),status=String(body.status||"");
 if(!id||!allowed.has(status))return NextResponse.json({error:"Choose a valid request status."},{status:400});
 try{
  const db=getAdminDb(),ref=db.collection("bookingRequests").doc(id);
  let customerUid="";
  let requestType="APPOINTMENT";
  let didChange=false;
  await db.runTransaction(async tx=>{
   const requestSnap=await tx.get(ref);if(!requestSnap.exists)throw new Error("REQUEST_NOT_FOUND");
   customerUid=String(requestSnap.data()?.customerUid??"");
   requestType=String(requestSnap.data()?.requestType??"APPOINTMENT");
   if(requestType==="WAITLIST"&&["PAYMENT_PENDING","CONFIRMED","ARRIVED","COMPLETED"].includes(status))throw new Error("WAITLIST_CANNOT_CONFIRM");
   if(String(requestSnap.data()?.status??"NEW")===status)return;
   didChange=true;
   const held= status==="DECLINED"||status==="CANCELLED"||status==="RESCHEDULED" ? await tx.get(db.collection("slotReservations").where("bookingRequestId","==",id)) : null;
   tx.update(ref,{status,statusUpdatedAt:new Date().toISOString()});
   if(held)held.docs.forEach(item=>tx.delete(item.ref));
  });
  if(didChange&&customerUid){try{
   const [preferences,tokens]=await Promise.all([db.collection("notificationPreferences").doc(customerUid).get(),db.collection("notificationTokens").doc(customerUid).collection("devices").get()]);
   if(preferences.data()?.enabled===true&&preferences.data()?.appointmentUpdates!==false&&tokens.size){
    const copy:Record<string,string>=requestType==="WAITLIST"?{NEW:"Your appointment waitlist request has been received.",REVIEWING:"The Village Wellness Spa team is reviewing your waitlist request.",APPROVED:"Your waitlist request has been reviewed. The team will contact you if a suitable opening can be offered.",NEEDS_CONTACT:"The Village Wellness Spa team needs to contact you about your waitlist request.",DECLINED:"Your appointment waitlist request was declined. Check My Village Wellness Spa for the latest status.",RESCHEDULED:"The team has updated the timing preference on your waitlist request.",CANCELLED:"Your appointment waitlist request has been cancelled.",FOLLOW_UP:"There is a follow-up update from Village Wellness Spa about your waitlist request."}:{NEW:"Your appointment request has been received.",REVIEWING:"The Village Wellness Spa team is reviewing your request.",APPROVED:"Your request has been reviewed. Check My Village Wellness Spa for next steps.",PAYMENT_PENDING:"There are next steps for your Village Wellness Spa request. Check My Village Wellness Spa.",CONFIRMED:"Your appointment has been confirmed by Village Wellness Spa.",ARRIVED:"Your visit has been checked in.",COMPLETED:"Your Village Wellness Spa visit has been marked complete.",NEEDS_CONTACT:"The Village Wellness Spa team needs to contact you about your request.",DECLINED:"Your appointment request was declined. Check My Village Wellness Spa for the latest status.",RESCHEDULED:"Your requested appointment time needs to be changed.",CANCELLED:"Your appointment request has been cancelled.",NO_SHOW:"Your appointment was marked as missed. Check My Village Wellness Spa for details.",FOLLOW_UP:"There is a follow-up update from Village Wellness Spa."};
    const link=new URL("/account",process.env.NEXT_PUBLIC_BASE_URL||"https://village-wellness-spa.vercel.app").toString();
    await Promise.all(tokens.docs.map(async item=>{const token=String(item.data().token??"");if(!token)return;try{await getAdminMessaging().send({token,notification:{title:requestType==="WAITLIST"?"Village Wellness Spa waitlist update":"Village Wellness Spa appointment update",body:copy[status]||(requestType==="WAITLIST"?"Your waitlist request status changed.":"Your appointment request status changed.")},webpush:{fcmOptions:{link}}});}catch(error){console.error("[Village Wellness Spa] status push failed",error instanceof Error?error.message:"unknown");}}));
   }
  }catch(error){console.error("[Village Wellness Spa] status notification setup unavailable",error instanceof Error?error.message:"unknown");}}
  return NextResponse.json({ok:true,changed:didChange});
 }catch(error){const message=error instanceof Error?error.message:"";return NextResponse.json({error:message==="REQUEST_NOT_FOUND"?"That booking request no longer exists.":message==="WAITLIST_CANNOT_CONFIRM"?"A waitlist request is not a reserved appointment. Contact the client and have them book a verified available slot before confirming a visit.":"Request status could not be updated."},{status:message==="REQUEST_NOT_FOUND"?404:message==="WAITLIST_CANNOT_CONFIRM"?409:500});}
}
