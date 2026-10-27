export type ServiceCategory = string;
export type ServiceSeed = { id:string; name:string; category:ServiceCategory; description:string; price:string; duration:string; active:boolean; consultationRequired?:boolean; assessmentNote?:string };
export type ServiceCategoryRecord = { id:string; name:string; active:boolean; order:number };

// Export names are retained for compatibility with the existing data seeding workflow.
export const trippleSCategorySeed: ServiceCategoryRecord[] = [
  { id:"iv-wellness", name:"IV Bar & Wellness", active:true, order:1 },
  { id:"facials-skincare", name:"Facials & Skincare", active:true, order:2 },
  { id:"advanced-aesthetics", name:"Advanced Aesthetic Treatments", active:true, order:3 },
  { id:"massage-body", name:"Massage & Body Treatments", active:true, order:4 },
  { id:"nails-beauty", name:"Nails & Beauty", active:true, order:5 },
  { id:"hair-removal", name:"Waxing & Sugaring", active:true, order:6 },
  { id:"skincare-products", name:"Skincare Products", active:true, order:7 }
];

const pricing = "Request pricing";
const duration = "Confirm with the team";
export const trippleSServiceSeed: ServiceSeed[] = [
  { id:"iv-nutrient-therapy", name:"IV Nutrient Therapy", category:"IV Bar & Wellness", description:"Explore IV wellness options with the spa team. Service details and suitability must be confirmed by a qualified practitioner.", price:pricing, duration, active:true, consultationRequired:true, assessmentNote:"Practitioner assessment and service details must be confirmed before booking." },
  { id:"facial-skincare", name:"Facials & Skincare", category:"Facials & Skincare", description:"Personalised facial and skincare services selected around your goals and discussed with the spa team.", price:pricing, duration, active:true },
  { id:"microneedling", name:"Microneedling", category:"Advanced Aesthetic Treatments", description:"An advanced skin treatment enquiry. A qualified practitioner will confirm suitability, treatment details and next steps.", price:pricing, duration, active:true, consultationRequired:true },
  { id:"laser-treatments", name:"Laser Treatments", category:"Advanced Aesthetic Treatments", description:"Ask the team about available laser services and arrange an assessment where required.", price:pricing, duration, active:true, consultationRequired:true },
  { id:"chemical-peels", name:"Chemical Peels", category:"Advanced Aesthetic Treatments", description:"Discuss peel options with the qualified practitioner, who will confirm suitability and preparation.", price:pricing, duration, active:true, consultationRequired:true },
  { id:"injectables-consultation", name:"Injectables Consultation", category:"Advanced Aesthetic Treatments", description:"Enquire about injectable services offered by certified practitioners. Availability and suitability are confirmed by the practitioner.", price:pricing, duration, active:true, consultationRequired:true },
  { id:"massage", name:"Massage", category:"Massage & Body Treatments", description:"Ask about massage options and find a visit that fits your needs.", price:pricing, duration, active:true },
  { id:"nails", name:"Nails", category:"Nails & Beauty", description:"Enquire about manicure, pedicure and nail-care services currently offered by the spa.", price:pricing, duration, active:true },
  { id:"waxing-sugaring", name:"Waxing & Sugaring", category:"Waxing & Sugaring", description:"Ask the team about available hair-removal services and current pricing.", price:pricing, duration, active:true },
  { id:"body-treatments", name:"Body Treatments", category:"Massage & Body Treatments", description:"Explore available body-care treatments with the spa team.", price:pricing, duration, active:true }
];

// Keep the legacy IDs so the existing seeding/migration flow can identify inherited records.
export const legacyTrippleSServiceSeedIds: string[] = ["hydration-drip","weight-management-drip","clear-complexion-drip","lumiglow-skin-brightening","premium-glow-drip","ultimate-beauty-wellness","anti-sweat-injection","skin-boosters","prp-facial","microneedling","skin-repair-microneedling","pigmentation-peel","hydra-facial","deep-cleansing-led","anti-acne-peel","glow-up-peel","blemish-peel","dermaplaning","skin-tag-removal","lipolytic-10","lipolytic-20","lipolytic-30","sauna-45","sauna-60","skin-consultation"];
export const trippleSProductSeed: {id:string;name:string;description:string;size:string;price:string;active:boolean;purchaseMethod:string}[] = [];
