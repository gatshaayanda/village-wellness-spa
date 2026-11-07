export type ServiceCategory = string;
export type ServiceSeed = { id:string; name:string; category:ServiceCategory; description:string; price:string; duration:string; active:boolean; consultationRequired?:boolean; assessmentNote?:string };
export type ServiceCategoryRecord = { id:string; name:string; active:boolean; order:number };

export const trippleSCategorySeed: ServiceCategoryRecord[] = [
  {
    "id": "iv-wellness-drips",
    "name": "IV Wellness Drips",
    "active": true,
    "order": 1
  },
  {
    "id": "medical-aesthetics",
    "name": "Medical Aesthetics",
    "active": true,
    "order": 2
  },
  {
    "id": "skin-treatments",
    "name": "Skin Treatments",
    "active": true,
    "order": 3
  },
  {
    "id": "body-contouring",
    "name": "Body Contouring",
    "active": true,
    "order": 4
  },
  {
    "id": "wellness",
    "name": "Wellness",
    "active": true,
    "order": 5
  },
  {
    "id": "consultations",
    "name": "Consultations",
    "active": true,
    "order": 6
  }
];

const assessmentNote = "Final suitability and any treatment-specific details are confirmed by the spa's clinical team. Published prices may vary after clinical assessment.";
export const trippleSServiceSeed: ServiceSeed[] = [
  { id:"village-hydration-drip", name:"Hydration Drip", category:"IV Wellness Drips", description:"Hydration Drip. Treatment details and suitability can be discussed with the spa team.", price:"P600", duration:"60 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-weight-management-drip", name:"Weight Management Drip", category:"IV Wellness Drips", description:"Weight Management Drip. Treatment details and suitability can be discussed with the spa team.", price:"P850", duration:"60 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-clear-complexion-drip", name:"Clear Complexion Drip", category:"IV Wellness Drips", description:"Clear Complexion Drip. Treatment details and suitability can be discussed with the spa team.", price:"P1,200", duration:"60 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-lumiglow-skin-brightening", name:"LumiGlow Skin Brightening", category:"IV Wellness Drips", description:"LumiGlow Skin Brightening. Treatment details and suitability can be discussed with the spa team.", price:"P1,500", duration:"60 min", active:true },
  { id:"village-premium-glow-drip", name:"Premium Glow Drip", category:"IV Wellness Drips", description:"Premium Glow Drip. Treatment details and suitability can be discussed with the spa team.", price:"P1,500", duration:"60 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-ultimate-beauty-wellness", name:"Ultimate Beauty & Wellness", category:"IV Wellness Drips", description:"Ultimate Beauty & Wellness. Treatment details and suitability can be discussed with the spa team.", price:"P1,800", duration:"60 min", active:true },
  { id:"village-anti-sweat-injection", name:"Anti-Sweat Injection", category:"Medical Aesthetics", description:"Anti-Sweat Injection. Treatment details and suitability can be discussed with the spa team.", price:"P5,000", duration:"45 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-skin-boosters", name:"Skin Boosters", category:"Medical Aesthetics", description:"Skin Boosters. Treatment details and suitability can be discussed with the spa team.", price:"P2,900", duration:"45 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-prp-facial", name:"PRP Facial", category:"Medical Aesthetics", description:"PRP Facial. Treatment details and suitability can be discussed with the spa team.", price:"P3,800", duration:"60 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-microneedling", name:"Microneedling", category:"Skin Treatments", description:"Microneedling. Treatment details and suitability can be discussed with the spa team.", price:"P1,400", duration:"45 min", active:true },
  { id:"village-skin-repair-microneedling", name:"Skin Repair Microneedling", category:"Skin Treatments", description:"Skin Repair Microneedling. Treatment details and suitability can be discussed with the spa team.", price:"P1,200", duration:"45 min", active:true },
  { id:"village-pigmentation-peel", name:"Pigmentation Peel", category:"Skin Treatments", description:"Pigmentation Peel. Treatment details and suitability can be discussed with the spa team.", price:"P850", duration:"30 min", active:true },
  { id:"village-hydra-facial", name:"Hydra Facial", category:"Skin Treatments", description:"Hydra Facial. Treatment details and suitability can be discussed with the spa team.", price:"P500", duration:"45 min", active:true },
  { id:"village-deep-cleansing-led", name:"Deep Cleansing with LED", category:"Skin Treatments", description:"Deep Cleansing with LED. Treatment details and suitability can be discussed with the spa team.", price:"P350", duration:"45 min", active:true },
  { id:"village-anti-acne-peel", name:"Anti-Acne Peel", category:"Skin Treatments", description:"Anti-Acne Peel. Treatment details and suitability can be discussed with the spa team.", price:"P600", duration:"30 min", active:true },
  { id:"village-glow-up-peel", name:"Glow Up Peel", category:"Skin Treatments", description:"Glow Up Peel. Treatment details and suitability can be discussed with the spa team.", price:"P500", duration:"30 min", active:true },
  { id:"village-blemish-peel", name:"Blemish Peel", category:"Skin Treatments", description:"Blemish Peel. Treatment details and suitability can be discussed with the spa team.", price:"P750", duration:"30 min", active:true },
  { id:"village-dermaplaning", name:"Dermaplaning", category:"Skin Treatments", description:"Dermaplaning. Treatment details and suitability can be discussed with the spa team.", price:"P500", duration:"30 min", active:true },
  { id:"village-skin-tag-removal", name:"Skin Tag Removal", category:"Skin Treatments", description:"Skin Tag Removal. Treatment details and suitability can be discussed with the spa team.", price:"P500–P1,800", duration:"30 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-lipolytic-10", name:"Lipolytic Injections — 10 Injections", category:"Body Contouring", description:"Lipolytic Injections — 10 Injections. Treatment details and suitability can be discussed with the spa team.", price:"P1,500", duration:"45 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-lipolytic-20", name:"Lipolytic Injections — 20 Injections", category:"Body Contouring", description:"Lipolytic Injections — 20 Injections. Treatment details and suitability can be discussed with the spa team.", price:"P2,000", duration:"45 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-lipolytic-30", name:"Lipolytic Injections — 30 Injections", category:"Body Contouring", description:"Lipolytic Injections — 30 Injections. Treatment details and suitability can be discussed with the spa team.", price:"P3,000", duration:"45 min", active:true, consultationRequired:true, assessmentNoteassessmentNote },
  { id:"village-sauna-45", name:"Sauna Blanket — 45 minutes", category:"Wellness", description:"Sauna Blanket — 45 minutes. Treatment details and suitability can be discussed with the spa team.", price:"P300", duration:"45 min", active:true },
  { id:"village-sauna-60", name:"Sauna Blanket — 1 hour", category:"Wellness", description:"Sauna Blanket — 1 hour. Treatment details and suitability can be discussed with the spa team.", price:"P650", duration:"60 min", active:true },
  { id:"village-skin-consultation", name:"Skin Consultation", category:"Consultations", description:"Skin Consultation. Treatment details and suitability can be discussed with the spa team.", price:"P400", duration:"30 min", active:true }
];

// Legacy aggregate catalogue entries are retained for historical booking snapshots.
export const legacyTrippleSServiceSeedIds: string[] = [
  "customized-luxury-facial","customized-signature-facial","corrective-facial-peel","jessner-peel","back-facial","ultimate-eye-treatment",
  "hydraglow","oxygeneo-60","oxygeneo-90","microneedling-face-neck","forma-facial-contouring","advanced-infusion-facial","skinceuticals-microdermabrasion",
  "lumecca-ipl","morpheus8-face-neck","tixel-skin-resurfacing","massage-30-rmt","massage-45-rmt","massage-60-rmt","massage-hot-stone-60",
  "massage-90-rmt","lymphatic-drainage-75","acupuncture-60-rmt","osteopath-45","osteopath-60","fascial-stretch-30","fascial-stretch-60",
  "aromatic-body-scrub","laser-underarm","laser-bikini","laser-brazilian","laser-full-legs","laser-chin","laser-upper-lip","injectables-consultation","iv-wellness-enquiry",
  "hydration-drip","weight-management-drip","clear-complexion-drip","lumiglow-skin-brightening","premium-glow-drip","ultimate-beauty-wellness",
  "anti-sweat-injection","skin-boosters","prp-facial","microneedling","skin-repair-microneedling","pigmentation-peel","hydra-facial",
  "deep-cleansing-led","glow-up-peel","blemish-peel","dermaplaning","skin-tag-removal","lipolytic-10","lipolytic-20","lipolytic-30",
  "sauna-45","sauna-60","skin-consultation"
];
export const legacyTrippleSCategorySeedIds = ["laser-hair-removal","injectables","iv-wellness"];
export const trippleSProductSeed: {id:string;name:string;description:string;size:string;price:string;active:boolean;purchaseMethod:string}[] = [];
