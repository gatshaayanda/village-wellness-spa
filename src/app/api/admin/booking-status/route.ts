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
  await db.runTransaction(async tx=>{
   const requestSnap=await tx.get(ref);if(!requestSnap.exists)throw new Error("REQUEST_NOT_FOUND");
   customerUid=String(requestSnap.data()?.customerUid??"");
   const held= status==="DECLINED"||status==="CANCELLED"||status==="RESCHEDULED" ? await tx.get(db.collection("slotReservations").where("bookingRequestId","==",id)) : null;
   tx.update(ref,{status});
   if(held)held.docs.forEach(item=>tx.delete(item.ref));
  });
  if(customerUid){try{
   const [preferences,tokens]=await Promise.all([db.collection("notificationPreferences").doc(customerUid).get(),db.collection("notificationTokens").doc(customerUid).collection("devices").get()]);
   if(preferences.data()?.enabled===true&&preferences.data()?.appointmentUpdates!==false&&tokens.size){
    const copy:Record<string,string>={NEW:"Your appointment request has been received.",REVIEWING:"The Village Wellness Spa team is reviewing your request.",APPROVED:"Your request has been reviewed. Check My Village Wellness Spa for next steps.",PAYMENT_PENDING:"There are next steps for your Village Wellness Spa request. Check My Village Wellness Spa.",CONFIRMED:"Your appointment has been confirmed by Village Wellness Spa.",ARRIVED:"Your visit has been checked in.",COMPLETED:"Your Village Wellness Spa visit has been marked complete.",NEEDS_CONTACT:"The Village Wellness Spa team needs to contact you about your request.",DECLINED:"Your appointment request was declined. Check My Village Wellness Spa for the latest status.",RESCHEDULED:"Your requested appointment time needs to be changed.",CANCELLED:"Your appointment request has been cancelled.",NO_SHOW:"Your appointment was marked as missed. Check My Village Wellness Spa for details.",FOLLOW_UP:"There is a follow-up update from Village Wellness Spa."};
    const link=new URL("/account",process.env.NEXT_PUBLIC_BASE_URL||"https://tripple-s-wellness-spa.vercel.app").toString();
    await Promise.all(tokens.docs.map(async item=>{const token=String(item.data().token??"");if(!token)return;try{await getAdminMessaging().send({token,notification:{title:"Village Wellness Spa appointment update",body:copy[status]||"Your appointment request status changed."},webpush:{fcmOptions:{link}}});}catch(error){console.error("[Village Wellness Spa] status push failed",error instanceof Error?error.message:"unknown");}}));
   }
  }catch(error){console.error("[Village Wellness Spa] status notification setup unavailable",error instanceof Error?error.message:"unknown");}}
  return NextResponse.json({ok:true});
 }catch(error){const message=error instanceof Error?error.message:"";return NextResponse.json({error:message==="REQUEST_NOT_FOUND"?"That booking request no longer exists.":"Request status could not be updated."},{status:message==="REQUEST_NOT_FOUND"?404:500});}
}
