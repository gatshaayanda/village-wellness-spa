import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
export const dynamic = "force-dynamic";
export async function GET(){
 try{
  const today=new Date(Date.now()+2*3600000).toISOString().slice(0,10);
  const snap=await getAdminDb().collection("loyaltyPrograms").where("active","==",true).get();
  const items=snap.docs.map(doc=>{const d=doc.data();return{id:doc.id,title:String(d.title||""),description:String(d.description||""),discountType:d.discountType==="AMOUNT"?"AMOUNT":"PERCENT",value:Number(d.value||0),code:String(d.code||""),eligibility:d.eligibility==="RETURNING"?"RETURNING":"ALL",active:true,startDate:String(d.startDate||""),endDate:String(d.endDate||"")};}).filter(item=>(!item.startDate||item.startDate<=today)&&(!item.endDate||item.endDate>=today));
  return NextResponse.json({items});
 }catch(error){console.error("[Village Wellness Spa] public offers unavailable",error instanceof Error?error.message:"unknown");return NextResponse.json({items:[]});}
}
