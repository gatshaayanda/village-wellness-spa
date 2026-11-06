import { NextRequest,NextResponse } from "next/server";
import { getAdminDb,requireAdmin } from "@/lib/firebase/admin";
export const dynamic="force-dynamic";
const allowed=new Set(["ARRIVED","WAITING","IN_TREATMENT","COMPLETED","CANCELLED","NO_SHOW"]);
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Gaborone",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export async function GET(request:NextRequest){
 if(!await requireAdmin(request))return NextResponse.json({error:"Sign in with an authorized staff account."},{status:401});
 try{const snap=await getAdminDb().collection("bookingRequests").where("requestType","==","QUEUE").get();const items=snap.docs.map(d=>({id:d.id,...d.data()})).filter((x:any)=>String(x.visitDate??x.preferredDate??"")===today()).sort((a:any,b:any)=>String(a.createdAt??"").localeCompare(String(b.createdAt??"")));return NextResponse.json({items});}
 catch(error){console.error("[Village Wellness Spa] queue load failed",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Today's queue could not be loaded."},{status:503});}
}
export async function POST(request:NextRequest){
 if(!await requireAdmin(request))return NextResponse.json({error:"Sign in with an authorized staff account."},{status:401});
 let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid queue update."},{status:400});}
 const db=getAdminDb(),action=String(body.action??"update");
 try{
  if(action==="create"){
   const name=String(body.name??"").trim().slice(0,120),phone=String(body.phone??"").trim().slice(0,40),serviceName=String(body.serviceName??"Consultation / help choosing").trim().slice(0,160);
   if(!name||!phone)return NextResponse.json({error:"Enter the customer's name and mobile number."},{status:400});
   const now=new Date().toISOString(),ref=db.collection("bookingRequests").doc();
   const matches=await db.collection("customerProfiles").where("phone","==",phone).get();
   const exact=matches.docs.filter(d=>String(d.data().name??"").trim().toLocaleLowerCase()===name.toLocaleLowerCase());
   const customerUid=exact.length===1?exact[0].id:"";
   await ref.set({createdAt:now,visitDate:today(),name,phone,...(customerUid?{customerUid}:{}),serviceNameSnapshot:serviceName,requestType:"QUEUE",queueMode:"STAFF",status:"ARRIVED",statusUpdatedAt:now,paymentStatus:"NOT_RECORDED",createdBy:"STAFF"});
   return NextResponse.json({id:ref.id,reference:ref.id.slice(0,8).toUpperCase()},{status:201});
  }
  const id=String(body.id??""),status=String(body.status??"");
  if(!id||!allowed.has(status))return NextResponse.json({error:"Choose a valid queue status."},{status:400});
  const ref=db.collection("bookingRequests").doc(id);let found=false;
  await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists||snap.data()?.requestType!=="QUEUE")throw new Error("NOT_FOUND");found=true;const now=new Date().toISOString(),patch:Record<string,unknown>={status,statusUpdatedAt:now,lastQueueUpdateAt:now};if(status==="COMPLETED"){patch.completedAt=now;const date=String(body.recommendedReturnDate??"").trim(),note=String(body.returnNote??"").trim().slice(0,500);if(date){const parsed=new Date(date+"T12:00:00+02:00");if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw new Error("INVALID_RETURN_DATE");patch.recommendedReturnDate=date;}if(note)patch.returnNote=note;}tx.update(ref,patch);});
  return NextResponse.json({ok:true,found});
 }catch(error){const m=error instanceof Error?error.message:"";return NextResponse.json({error:m==="NOT_FOUND"?"That queue visit could not be found.":m==="INVALID_RETURN_DATE"?"Choose a valid recommended return date.":"The queue update could not be saved."},{status:m==="NOT_FOUND"?404:400});}
}
