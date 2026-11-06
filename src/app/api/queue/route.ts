import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireCustomer } from "@/lib/firebase/admin";
export const dynamic = "force-dynamic";
function todayGaborone(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Gaborone",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export async function POST(request:NextRequest){
 let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Check your details and try again."},{status:400});}
 const authorization=request.headers.get("authorization"),customer=authorization?await requireCustomer(request):null;
 if(authorization&&!customer)return NextResponse.json({error:"Your customer session expired. Please retry."},{status:401});
 const name=String(body.name??"").trim().slice(0,120),phone=String(body.phone??"").trim().slice(0,40),email=String(body.email??customer?.email??"").trim().slice(0,200);
 const serviceId=String(body.serviceId??"").trim(),mode=body.mode==="ONSITE"?"ONSITE":"REMOTE";
 if(!name||!phone)return NextResponse.json({error:"Enter your name and mobile number so reception can recognise you."},{status:400});
 try{
  const db=getAdminDb();let serviceName="Consultation / help choosing",durationSnapshot="";
  if(serviceId){const snap=await db.collection("services").doc(serviceId).get();if(!snap.exists||snap.data()?.active===false)return NextResponse.json({error:"That treatment is no longer available. Choose another."},{status:409});serviceName=String(snap.data()?.name??serviceName);durationSnapshot=String(snap.data()?.duration??"");}
  const ref=db.collection("bookingRequests").doc(),now=new Date().toISOString(),date=todayGaborone();
  const status=mode==="ONSITE"?"ARRIVED":"ON_THE_WAY";
  await ref.set({createdAt:now,visitDate:date,preferredDate:date,preferredTime:new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Gaborone",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date()),...(customer?{customerUid:customer.uid}:{}),name,phone,...(email?{email}:{}),...(serviceId?{serviceId}:{}),serviceNameSnapshot:serviceName,...(durationSnapshot?{durationSnapshot}:{}),requestType:"QUEUE",queueMode:mode,status,statusUpdatedAt:now,paymentStatus:"NOT_RECORDED"});
  if(customer)await db.collection("customerProfiles").doc(customer.uid).set({uid:customer.uid,name,phone,...(email?{email}:{}),updatedAt:now},{merge:true});
  return NextResponse.json({id:ref.id,reference:ref.id.slice(0,8).toUpperCase(),status},{status:201});
 }catch(error){console.error("[Village Wellness Spa] queue check-in failed",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"We could not record your check-in. Please try again or speak to reception."},{status:503});}
}
