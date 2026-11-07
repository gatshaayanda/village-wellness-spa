export type ServiceCategory = string;
export type ServiceSeed = { id:string; name:string; category:ServiceCategory; description:string; price:string; duration:string; active:boolean; consultationRequired?:boolean; assessmentNote?:string };
export type ServiceCategoryRecord = { id:string; name:string; active:boolean; order:number };

export const trippleSCategorySeed: ServiceCategoryRecord[] = [
  { id:"facials-skincare", name:"Facials & Skincare", active:true, order:1 },
  { id:"advanced-aesthetics", name:"Advanced Aesthetic Treatments", active:true, order:2 },
  { id:"massage-body", name:"Massage & Body Treatments", active:true, order:3 },
  { id:"express-body-care", name:"Express Body Care", active:true, order:4 },
  { id:"nails-grooming", name:"Nails & Grooming", active:true, order:5 }
];

const durationToConfirm = "60 min · confirm with spa";
export const trippleSServiceSeed: ServiceSeed[] = [
  { id:"village-facials-skincare", name:"Facials & Skincare", category:"Facials & Skincare", description:"Express facials, deep cleansing and hydrating treatments.", price:"P350–P750", duration:durationToConfirm, active:true },
  { id:"village-advanced-aesthetics", name:"Advanced Aesthetic Treatments", category:"Advanced Aesthetic Treatments", description:"Chemical peels, exfoliating facials and dermaplaning. Practitioner assessment may be required.", price:"P800–P1,300", duration:durationToConfirm, active:true, consultationRequired:true, assessmentNote:"Confirm treatment suitability with the spa team before scheduling." },
  { id:"village-full-body-massage", name:"Full Body Massage · 60 min", category:"Massage & Body Treatments", description:"Swedish, deep tissue and aromatherapy massage options.", price:"P450–P700", duration:"60 min", active:true },
  { id:"village-express-body-care", name:"Express Body Care", category:"Express Body Care", description:"Back, neck and shoulder massage (30 min) and body scrub options.", price:"P300–P500", duration:"30 min", active:true },
  { id:"village-nails-grooming", name:"Nails & Grooming", category:"Nails & Grooming", description:"Manicures, pedicures, gel overlays and brow shaping.", price:"P60–P450", duration:durationToConfirm, active:true }
];

// IDs from the former Mississauga/Canadian starter catalogue. The one-time Village migration
// deactivates these inherited demo records without deleting customer booking snapshots.
export const legacyTrippleSServiceSeedIds: string[] = [
  "customized-luxury-facial","customized-signature-facial","corrective-facial-peel","jessner-peel","back-facial","ultimate-eye-treatment",
  "hydraglow","oxygeneo-60","oxygeneo-90","microneedling-face-neck","forma-facial-contouring","advanced-infusion-facial","skinceuticals-microdermabrasion",
  "lumecca-ipl","morpheus8-face-neck","tixel-skin-resurfacing","massage-30-rmt","massage-45-rmt","massage-60-rmt","massage-hot-stone-60",
  "massage-90-rmt","lymphatic-drainage-75","acupuncture-60-rmt","osteopath-45","osteopath-60","fascial-stretch-30","fascial-stretch-60",
  "aromatic-body-scrub","laser-underarm","laser-bikini","laser-brazilian","laser-full-legs","laser-chin","laser-upper-lip","injectables-consultation","iv-wellness-enquiry",
  "hydration-drip","weight-management-drip","clear-complexion-drip","lumiglow-skin-brightening","premium-glow-drip","ultimate-beauty-wellness",
  "anti-sweat-injection","skin-boosters","prp-facial","microneedling","skin-repair-microneedling","pigmentation-peel","hydra-facial",
  "deep-cleansing-led","anti-acne-peel","glow-up-peel","blemish-peel","dermaplaning","skin-tag-removal","lipolytic-10","lipolytic-20",
  "lipolytic-30","sauna-45","sauna-60","skin-consultation"
];
export const legacyTrippleSCategorySeedIds = ["laser-hair-removal","injectables","iv-wellness"];

export const trippleSProductSeed: {id:string;name:string;description:string;size:string;price:string;active:boolean;purchaseMethod:string}[] = [];
