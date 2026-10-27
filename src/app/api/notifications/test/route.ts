import { createHash } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { getAdminDb,getAdminMessaging,requireCustomer } from "@/lib/firebase/admin";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest) {
 const customer=await requireCustomer(request);
 if(!customer)return NextResponse.json({error:"Your session expired. Refresh My Village Wellness Spa and try again."},{status:401});
 let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Enable notifications on this device first."},{status:400});}
 const token=typeof body.deviceToken==="string"?body.deviceToken:"";
 if(token.length<20||token.length>4096)return NextResponse.json({error:"This device is not registered for Village Wellness Spa notifications yet."},{status:400});
 try {
  const db=getAdminDb(),preferences=await db.collection("notificationPreferences").doc(customer.uid).get();
  if(preferences.data()?.enabled!==true)return NextResponse.json({error:"Enable notifications on this device first."},{status:409});
  const id=createHash("sha256").update(token).digest("hex");
  const saved=await db.collection("notificationTokens").doc(customer.uid).collection("devices").doc(id).get();
  if(!saved.exists||saved.data()?.token!==token)return NextResponse.json({error:"This device is not registered yet. Enable notifications on this device and try again."},{status:404});
  const link=new URL("/account",process.env.NEXT_PUBLIC_BASE_URL||"https://tripple-s-wellness-spa.vercel.app").toString();
  const messageId=await getAdminMessaging().send({token,notification:{title:"Village Wellness Spa · Test update",body:"Your notification connection accepted a test."},webpush:{fcmOptions:{link}}});
  return NextResponse.json({sent:true,messageId});
 }catch(error){console.error("[Village Wellness Spa] customer notification test failed",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"The notification service could not send this test. Your account and booking history remain available."},{status:502});}
}
