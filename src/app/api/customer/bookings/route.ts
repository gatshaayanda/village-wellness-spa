import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireCustomer } from "@/lib/firebase/admin";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
 const customer = await requireCustomer(request);
 if (!customer) return NextResponse.json({ error: "Sign in to view your private appointment history." }, { status: 401 });
 try {
  const snapshot = await getAdminDb().collection("bookingRequests").where("customerUid", "==", customer.uid).get();
  const items = snapshot.docs.map((document) => { const data=document.data(); return {
   id:document.id,reference:document.id.slice(0,8).toUpperCase(),createdAt:String(data.createdAt??""),
   serviceName:String(data.serviceNameSnapshot??"Consultation / help choosing"),preferredDate:String(data.preferredDate??""),
   preferredTime:String(data.preferredTime??""),status:String(data.status??"NEW"),paymentStatus:String(data.paymentStatus??"PAYMENT_PENDING"),
   ...(data.finalPriceSnapshot?{finalPrice:String(data.finalPriceSnapshot)}:{}),...(data.discountCodeSnapshot?{offerCode:String(data.discountCodeSnapshot)}:{})
  }; }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({items});
 } catch(error) { console.error("[Village Wellness Spa] customer booking history unavailable",error instanceof Error?error.message:"unknown"); return NextResponse.json({error:"Your appointment history is temporarily unavailable. Please try again."},{status:503}); }
}
