import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { legacyTrippleSCategorySeedIds, legacyTrippleSServiceSeedIds, trippleSCategorySeed, trippleSProductSeed, trippleSServiceSeed, type ServiceCategoryRecord } from "@/lib/tripple-s/catalog";
import { defaultClinicSettings, type ClinicSettings } from "@/lib/tripple-s/clinic-settings";
import { deleteLocalDemoBucketRecord, getLocalDemoBucket, getLocalDemoRecords, isLocalDemoMode, saveLocalDemoBucketRecord, updateLocalDemoRecord } from "@/lib/tripple-s/local-demo";

export type ServiceRecord = {
  id: string; name: string; category: string; description: string; price: string; duration: string; active: boolean;
  consultationRequired?: boolean; assessmentNote?: string; prep?: string; aftercare?: string; imageUrl?: string;
};

export type ProductRecord = {
  id: string; name: string; description: string; size?: string; price: string; active: boolean; purchaseMethod?: string; imageUrl?: string;
};

export type BookingStatus = "NEW" | "REVIEWING" | "APPROVED" | "PAYMENT_PENDING" | "CONFIRMED" | "ARRIVED" | "COMPLETED" | "NEEDS_CONTACT" | "DECLINED" | "RESCHEDULED" | "CANCELLED" | "NO_SHOW" | "FOLLOW_UP";
export type PaymentStatus = "PAYMENT_PENDING" | "PAYMENT_INSTRUCTIONS" | "PAYMENT_PROOF_SUBMITTED" | "PAYMENT_VERIFIED" | "PAID" | "REFUNDED";

export type BookingRequestRecord = {
  id: string; createdAt: string; name: string; phone: string; email?: string; customerUid?: string; profileConnected?: boolean; serviceId?: string; serviceNameSnapshot: string; requestType?: "APPOINTMENT" | "WAITLIST" | "PRODUCT_ENQUIRY" | "TREATMENT_ENQUIRY" | "GENERAL_ENQUIRY"; productId?: string; productNameSnapshot?: string;
  priceSnapshot?: string; durationSnapshot?: string; preferredDate?: string; preferredTime?: string; message?: string; discountCodeSnapshot?: string; discountAmountSnapshot?: number; finalPriceSnapshot?: string;
  clientType: "NEW" | "RETURNING"; referralSource?: string; status: BookingStatus; paymentStatus?: PaymentStatus;
};

const servicesCollection = collection(db, "services");
const productsCollection = collection(db, "products");
const bookingCollection = collection(db, "bookingRequests");

export async function getServices(): Promise<ServiceRecord[]> {
  if (isLocalDemoMode()) { let saved = getLocalDemoBucket<{ id: string; record: ServiceRecord }>("services"); const settings = getLocalDemoBucket<{ id: string; value?: unknown }>("settings"); if (!settings.some(item => item.id === "servicesInitialized")) { for (const item of trippleSServiceSeed) saveLocalDemoBucketRecord("services", { id: item.id, record: item }); saveLocalDemoBucketRecord("settings", { id: "servicesInitialized", value: true }); saved = getLocalDemoBucket<{ id: string; record: ServiceRecord }>("services"); } return saved.map(item => item.record); }
  const snapshot = await getDocs(servicesCollection);
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ServiceRecord, "id">) }));
}

export async function getPublicServices(): Promise<ServiceRecord[]> {
  if (isLocalDemoMode()) return getServices();
  try {
    const [snapshot, catalogueState] = await Promise.all([getDocs(query(servicesCollection, where("active", "==", true))), getDoc(doc(db, "settings", "catalogueState"))]);
    const state = catalogueState.data() ?? {};
    if (Number(state.serviceCatalogVersion ?? 0) < 2) {
      // Preserve the legacy seed fallback for records not yet present in Firestore,
      // but prefer the saved active Firestore record when it shares a seed ID.
      // Without this overlay, admin price edits appear saved but public pages keep
      // displaying the hard-coded seed price until the catalogue migration finishes.
      const seedIds = new Set(trippleSServiceSeed.map(item => item.id));
      const savedRecords = snapshot.docs.map(item => ({
        id: item.id,
        ...(item.data() as Omit<ServiceRecord, "id">),
      }));
      const savedById = new Map(savedRecords.map(item => [item.id, item]));
      const seeded = trippleSServiceSeed
        .map(seed => {
          const saved = savedById.get(seed.id);
          return saved ? { ...seed, ...saved } : seed;
        })
        .filter(item => item.active);
      const custom = savedRecords
        .filter(item => !legacyTrippleSServiceSeedIds.includes(item.id) && !seedIds.has(item.id))
        .filter(item => item.active);
      return [...seeded, ...custom];
    }
    if (snapshot.empty) return state.servicesManaged === true ? [] : trippleSServiceSeed;
    return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ServiceRecord, "id">) })).filter((item) => item.active);
  } catch (error) {
    console.warn("[Tripple S] public services unavailable; using the seed catalogue", error);
    return trippleSServiceSeed;
  }
}
export async function saveServiceRecord(item: ServiceRecord) { if (isLocalDemoMode()) { saveLocalDemoBucketRecord("services", { id: item.id, record: item }); return; } await setDoc(doc(db, "services", item.id), item); await setDoc(doc(db, "settings", "catalogueState"), { servicesManaged: true }, { merge: true }); }
export async function deleteServiceRecord(id: string) { if (isLocalDemoMode()) { deleteLocalDemoBucketRecord("services", id); return; } await deleteDoc(doc(db, "services", id)); await setDoc(doc(db, "settings", "catalogueState"), { servicesManaged: true }, { merge: true }); }

export async function getPublicProducts(): Promise<ProductRecord[]> {
  if (isLocalDemoMode()) return getProducts();
  try {
    const [snapshot, catalogueState] = await Promise.all([
      getDocs(query(productsCollection, where("active", "==", true))),
      getDoc(doc(db, "settings", "catalogueState")),
    ]);
    const records = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ProductRecord, "id">) }));
    // Once an owner has managed the catalogue, an empty active query means all products are intentionally hidden.
    return catalogueState.data()?.productsManaged === true ? records : (records.length ? records : trippleSProductSeed);
  } catch (error) {
    console.warn("[Tripple S] public products unavailable; using the seed catalogue", error);
    return trippleSProductSeed;
  }
}

export async function getProducts(): Promise<ProductRecord[]> {
  if (isLocalDemoMode()) { let saved = getLocalDemoBucket<{ id: string; record: ProductRecord }>("products"); const settings = getLocalDemoBucket<{ id: string; value?: unknown }>("settings"); if (!settings.some(item => item.id === "productsInitialized")) { for (const item of trippleSProductSeed) saveLocalDemoBucketRecord("products", { id: item.id, record: item }); saveLocalDemoBucketRecord("settings", { id: "productsInitialized", value: true }); saved = getLocalDemoBucket<{ id: string; record: ProductRecord }>("products"); } return saved.map(item => item.record); }
  const snapshot = await getDocs(productsCollection);
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ProductRecord, "id">) }));
}
export async function saveProductRecord(item: ProductRecord) { if (isLocalDemoMode()) { saveLocalDemoBucketRecord("products", { id: item.id, record: item }); return; } await setDoc(doc(db, "products", item.id), item); await setDoc(doc(db, "settings", "catalogueState"), { productsManaged: true }, { merge: true }); }
export async function deleteProductRecord(id: string) { if (isLocalDemoMode()) { deleteLocalDemoBucketRecord("products", id); return; } await deleteDoc(doc(db, "products", id)); await setDoc(doc(db, "settings", "catalogueState"), { productsManaged: true }, { merge: true }); }


const serviceCategoriesCollection = collection(db, "serviceCategories");

export async function getServiceCategories(): Promise<ServiceCategoryRecord[]> {
  const snapshot = await getDocs(serviceCategoriesCollection);
  const records = snapshot.docs.map(item => ({ id: item.id, ...(item.data() as Omit<ServiceCategoryRecord, "id">) }));
  if (records.length) return records.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const state = await getDoc(doc(db, "settings", "catalogueState"));
  return state.data()?.categoriesManaged === true ? [] : trippleSCategorySeed;
}

export async function getPublicServiceCategories(): Promise<ServiceCategoryRecord[]> {
  try {
    // Firestore rules are not filters: public reads must query only active categories.
    const [snapshot, catalogueState] = await Promise.all([
      getDocs(query(serviceCategoriesCollection, where("active", "==", true))),
      getDoc(doc(db, "settings", "catalogueState")),
    ]);
    const records = snapshot.docs
      .map(item => ({ id: item.id, ...(item.data() as Omit<ServiceCategoryRecord, "id">) }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

    // Once categories are managed, an empty active result means the owner intentionally hid all categories.
    return catalogueState.data()?.categoriesManaged === true
      ? records
      : (records.length ? records : trippleSCategorySeed.filter(item => item.active));
  } catch (error) {
    console.warn("[Tripple S] public categories unavailable; using seed categories", error);
    return trippleSCategorySeed.filter(item => item.active);
  }
}

export async function saveServiceCategory(item: ServiceCategoryRecord, previousName?: string) {
  const name = item.name.trim().slice(0, 100);
  if (!name) throw new Error("Enter a category name.");
  const existing = await getDocs(serviceCategoriesCollection);
  if (existing.docs.some(row => row.id !== item.id && String(row.data().name ?? "").trim().toLowerCase() === name.toLowerCase())) throw new Error("A category with that name already exists.");
  if (previousName && previousName !== name) {
    const services = await getDocs(servicesCollection);
    for (const service of services.docs) if (String(service.data().category ?? "") === previousName) await updateDoc(service.ref, { category: name });
  }
  await setDoc(doc(db, "serviceCategories", item.id), { ...item, name });
  await setDoc(doc(db, "settings", "catalogueState"), { categoriesManaged: true }, { merge: true });
}

export async function deleteServiceCategory(id: string, name: string) {
  const services = await getDocs(servicesCollection);
  if (services.docs.some(item => String(item.data().category ?? "") === name)) throw new Error("Move or delete the services in this category before removing it.");
  await deleteDoc(doc(db, "serviceCategories", id));
  await setDoc(doc(db, "settings", "catalogueState"), { categoriesManaged: true }, { merge: true });
}

// Safe, additive Village catalogue migration. It preserves admin-created records and booking snapshots.
export async function reconcileVillageServiceSeeds() {
  if (isLocalDemoMode()) return { added: 0, categoriesAdded: 0, skipped: true };
  const stateRef = doc(db, "settings", "catalogueState");
  const stateSnapshot = await getDoc(stateRef);
  const state = stateSnapshot.data() ?? {};
  if (Number(state.villageServiceSeedVersion ?? 0) >= 3) return { added: 0, categoriesAdded: 0, updated: 0, skipped: true };

  const [serviceSnapshot, categorySnapshot] = await Promise.all([getDocs(servicesCollection), getDocs(serviceCategoriesCollection)]);
  const serviceIds = new Set(serviceSnapshot.docs.map(item => item.id));
  const categoryIds = new Set(categorySnapshot.docs.map(item => item.id));
  let added = 0, categoriesAdded = 0, updated = 0;

  for (const id of legacyTrippleSCategorySeedIds) {
    const old = categorySnapshot.docs.find(item => item.id === id);
    if (old) await updateDoc(old.ref, { active: false });
  }
  for (const id of legacyTrippleSServiceSeedIds) {
    const old = serviceSnapshot.docs.find(item => item.id === id);
    if (old) await updateDoc(old.ref, { active: false });
  }
  for (const category of trippleSCategorySeed) {
    if (categoryIds.has(category.id)) continue;
    await setDoc(doc(db, "serviceCategories", category.id), category);
    categoriesAdded++;
  }
  const previousPriceById: Record<string, string> = {
    "village-facials-skincare": "Estimated P350–P750",
    "village-advanced-aesthetics": "Estimated P800–P1,300",
    "village-full-body-massage": "Estimated P450–P700",
    "village-express-body-care": "Estimated P300–P500",
    "village-nails-grooming": "Estimated P60–P450",
  };
  const oldDescriptionNote = "Indicative Gaborone market estimate supplied for initial catalogue setup. The spa must confirm the exact treatment, current price and duration before the appointment is accepted.";
  for (const service of trippleSServiceSeed) {
    const existing = serviceSnapshot.docs.find(item => item.id === service.id);
    if (!existing) {
      await setDoc(doc(db, "services", service.id), service);
      added++;
      continue;
    }
    const current = existing.data();
    const changes: Record<string, unknown> = {};
    if (current.price === previousPriceById[service.id]) changes.price = service.price;
    if (typeof current.description === "string" && current.description.endsWith(oldDescriptionNote)) {
      changes.description = current.description.slice(0, -oldDescriptionNote.length).trimEnd();
    }
    if (service.id === "village-advanced-aesthetics" && current.category === "Advanced Aesthetics") changes.category = service.category;
    if (service.id === "village-full-body-massage" && current.category === "Massage & Body Wellness") changes.category = service.category;
    if (Object.keys(changes).length) {
      await updateDoc(existing.ref, changes);
      updated++;
    }
  }
  await setDoc(stateRef, {
    villageServiceSeedVersion: 3,
    servicesManaged: true,
    categoriesManaged: true,
    serviceCatalogVersion: 3,
  }, { merge: true });
  return { added, categoriesAdded, updated, skipped: false };
}

export async function reconcileTrippleSCatalogue() {
  const stateRef = doc(db, "settings", "catalogueState");
  const stateSnapshot = await getDoc(stateRef);
  const state = stateSnapshot.data() ?? {};
  const firstMigration = Number(state.serviceCatalogVersion ?? 0) < 2;
  const currentServices = await getDocs(servicesCollection);
  const existingIds = new Set(currentServices.docs.map(item => item.id));
  const seedIds = new Set(trippleSServiceSeed.map(item => item.id));
  let added = 0, updated = 0, removed = 0;
  for (const item of trippleSServiceSeed) {
    const exists = existingIds.has(item.id);
    if (!exists || firstMigration) { await setDoc(doc(db, "services", item.id), item); if (exists) updated++; else added++; }
  }
  if (firstMigration) for (const id of legacyTrippleSServiceSeedIds) if (!seedIds.has(id) && existingIds.has(id)) { await deleteDoc(doc(db, "services", id)); removed++; }
  const currentCategories = await getDocs(serviceCategoriesCollection);
  const categoryIds = new Set(currentCategories.docs.map(item => item.id));
  let categoriesAdded = 0;
  for (const item of trippleSCategorySeed) if (!categoryIds.has(item.id)) { await setDoc(doc(db, "serviceCategories", item.id), item); categoriesAdded++; }
  const serviceRows = await getDocs(servicesCollection);
  const knownNames = new Set([...trippleSCategorySeed.map(item => item.name), ...currentCategories.docs.map(item => String(item.data().name ?? ""))]);
  for (const row of serviceRows.docs) {
    const name = String(row.data().category ?? "").trim();
    if (!name || knownNames.has(name)) continue;
    const id = "custom-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (id && !categoryIds.has(id)) { await setDoc(doc(db, "serviceCategories", id), { id, name, active: true, order: 100 + categoriesAdded }); categoryIds.add(id); knownNames.add(name); categoriesAdded++; }
  }
  const currentProducts = await getDocs(productsCollection);
  const productIds = new Set(currentProducts.docs.map(item => item.id));
  let productsAdded = 0;
  for (const item of trippleSProductSeed) if (!productIds.has(item.id)) { await setDoc(doc(db, "products", item.id), item); productsAdded++; }
  await setDoc(stateRef, { servicesManaged: true, categoriesManaged: true, productsManaged: true, serviceCatalogVersion: 2 }, { merge: true });
  return { added, updated, removed, categoriesAdded, productsAdded, firstMigration };
}

export async function createBookingRequest(data: Omit<BookingRequestRecord, "id">) {
  const result = await addDoc(bookingCollection, data);
  return result.id;
}
export async function getBookingRequests(): Promise<BookingRequestRecord[]> {
  if (isLocalDemoMode()) return getLocalDemoRecords<BookingRequestRecord>().filter(item => !!item.requestType);
  // Keep the operational queue bounded; a full historical collection scan grows with every request.
  const snapshot = await getDocs(query(bookingCollection, orderBy("createdAt", "desc"), limit(100)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<BookingRequestRecord, "id">) }));
}
export async function updateBookingStatus(id: string, status: BookingStatus) {
  if (isLocalDemoMode()) { updateLocalDemoRecord<BookingRequestRecord>(id, { status }); return; }
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again before changing a request.");
  const response = await fetch("/api/admin/booking-status", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ id, status }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request status could not be updated.");
}
export async function updatePaymentStatus(id: string, paymentStatus: PaymentStatus) { if (isLocalDemoMode()) { updateLocalDemoRecord<BookingRequestRecord>(id, { paymentStatus }); return; } await updateDoc(doc(db, "bookingRequests", id), { paymentStatus }); }


const clinicSettingsRef = doc(db, "settings", "clinic");

export async function getClinicSettings(): Promise<ClinicSettings> {
  if (isLocalDemoMode()) return getLocalDemoBucket<{ id: string; value: ClinicSettings }>("settings").find(item => item.id === "clinic")?.value ?? defaultClinicSettings;
  try {
    const snapshot = await getDoc(clinicSettingsRef);
    if (!snapshot.exists()) return defaultClinicSettings;
    const saved = snapshot.data() as Partial<ClinicSettings>;
    return {
      openingHours: { ...defaultClinicSettings.openingHours, ...(saved.openingHours ?? {}), sunday: { ...defaultClinicSettings.openingHours.sunday, ...(saved.openingHours?.sunday ?? {}), open: true, byAppointment: true } },
      bookingRules: { ...defaultClinicSettings.bookingRules, ...(saved.bookingRules ?? {}), minimumNoticeHours: 0 },
      announcement: { ...defaultClinicSettings.announcement, ...(saved.announcement ?? {}) },
    };
  } catch (error) {
    console.warn("[Tripple S] clinic settings unavailable; using default hours", error);
    return defaultClinicSettings;
  }
}

export async function saveClinicSettings(settings: ClinicSettings) {
  if (isLocalDemoMode()) { saveLocalDemoBucketRecord("settings", { id: "clinic", value: settings }); return; }
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again before changing clinic settings.");
  const response = await fetch("/api/admin/clinic-settings", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(settings) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Clinic settings could not be saved.");
}


export type AppointmentRecord = { id:string; date:string; startTime:string; endTime:string; title:string; kind:"APPOINTMENT"|"WALK_IN"|"BLOCK"; notes?:string };
export type LoyaltyProgramRecord = { id:string; title:string; description:string; discountType:"PERCENT"|"AMOUNT"; value:number; code:string; eligibility:"ALL"|"RETURNING"; active:boolean; startDate?:string; endDate?:string };

export type ClientRecord = { id:string; name:string; phone:string; email?:string; notes?:string; updatedAt:string };
export type FollowupRecord = { id:string; clientName:string; phone:string; reason:string; dueDate:string; status:"OPEN"|"DONE"; createdAt:string; updatedAt:string };
export type ReviewRecord = { id:string; clientName:string; rating:number; message:string; published:boolean; createdAt:string; updatedAt:string };

export async function getClients():Promise<ClientRecord[]> {
  if (isLocalDemoMode()) return getLocalDemoBucket<ClientRecord>("clients").sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,100);
  const snap=await getDocs(query(collection(db,"clients"),orderBy("updatedAt","desc"),limit(100)));
  return snap.docs.map(item=>({id:item.id,...(item.data() as Omit<ClientRecord,"id">)}));
}
export async function saveClient(item:ClientRecord) {
  const clean={...item,name:item.name.trim().slice(0,120),phone:item.phone.trim().slice(0,40),email:item.email?.trim().slice(0,200)??"",notes:item.notes?.trim().slice(0,1000)??"",updatedAt:new Date().toISOString()};
  if(isLocalDemoMode()){saveLocalDemoBucketRecord("clients",clean);return;}
  await setDoc(doc(db,"clients",item.id),clean,{merge:true});
}
export async function deleteClient(id:string) {
  if(isLocalDemoMode()){deleteLocalDemoBucketRecord("clients",id);return;}
  await deleteDoc(doc(db,"clients",id));
}
export async function getFollowups():Promise<FollowupRecord[]> {
  if(isLocalDemoMode()) return getLocalDemoBucket<FollowupRecord>("followups").sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,100);
  const snap=await getDocs(query(collection(db,"followups"),orderBy("dueDate","asc"),limit(100)));
  return snap.docs.map(item=>({id:item.id,...(item.data() as Omit<FollowupRecord,"id">)}));
}
export async function saveFollowup(item:FollowupRecord) {
  const clean={...item,clientName:item.clientName.trim().slice(0,120),phone:item.phone.trim().slice(0,40),reason:item.reason.trim().slice(0,1000),updatedAt:new Date().toISOString()};
  if(isLocalDemoMode()){saveLocalDemoBucketRecord("followups",clean);return;}
  await setDoc(doc(db,"followups",item.id),clean,{merge:true});
}
export async function deleteFollowup(id:string) {
  if(isLocalDemoMode()){deleteLocalDemoBucketRecord("followups",id);return;}
  await deleteDoc(doc(db,"followups",id));
}
export async function getReviews():Promise<ReviewRecord[]> {
  if(isLocalDemoMode()) return getLocalDemoBucket<ReviewRecord>("reviews").sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100);
  const snap=await getDocs(query(collection(db,"reviews"),orderBy("createdAt","desc"),limit(100)));
  return snap.docs.map(item=>({id:item.id,...(item.data() as Omit<ReviewRecord,"id">)}));
}
export async function saveReview(item:ReviewRecord) {
  const clean={...item,clientName:item.clientName.trim().slice(0,120),message:item.message.trim().slice(0,1200),rating:Math.max(1,Math.min(5,Math.round(item.rating))),updatedAt:new Date().toISOString()};
  if(isLocalDemoMode()){saveLocalDemoBucketRecord("reviews",clean);return;}
  await setDoc(doc(db,"reviews",item.id),clean,{merge:true});
}
export async function deleteReview(id:string) {
  if(isLocalDemoMode()){deleteLocalDemoBucketRecord("reviews",id);return;}
  await deleteDoc(doc(db,"reviews",id));
}

const appointmentsCollection=collection(db,"appointments");

export async function getAppointments():Promise<AppointmentRecord[]>{if(isLocalDemoMode())return getLocalDemoBucket<AppointmentRecord>("calendar");const snap=await getDocs(appointmentsCollection);return snap.docs.map(x=>({id:x.id,...(x.data() as Omit<AppointmentRecord,"id">)}));}
export async function saveAppointmentRecord(item:AppointmentRecord){if(item.kind==="WALK_IN"&&new Date(item.date+"T12:00:00+02:00").getUTCDay()===0)throw new Error("Sunday is appointment-only. Record a Sunday visit as an appointment, not a walk-in.");if(isLocalDemoMode()){saveLocalDemoBucketRecord("calendar",item);return;}const token=await auth.currentUser?.getIdToken();if(!token)throw new Error("Please sign in again before changing the calendar.");const response=await fetch("/api/admin/calendar",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(item)});const result=await response.json();if(!response.ok)throw new Error(result.error||"Calendar entry could not be saved.");}
export async function deleteAppointmentRecord(item:AppointmentRecord){if(isLocalDemoMode()){deleteLocalDemoBucketRecord("calendar",item.id);return;}const token=await auth.currentUser?.getIdToken();if(!token)throw new Error("Please sign in again before changing the calendar.");const response=await fetch("/api/admin/calendar",{method:"DELETE",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({id:item.id})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Calendar entry could not be removed.");}
export async function getLoyaltyPrograms():Promise<LoyaltyProgramRecord[]>{if(isLocalDemoMode())return getLocalDemoBucket<LoyaltyProgramRecord>("offers");const token=await auth.currentUser?.getIdToken();if(!token)throw new Error("Please sign in again.");const response=await fetch("/api/admin/loyalty",{headers:{Authorization:"Bearer "+token}});const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not load loyalty programmes.");return result.items as LoyaltyProgramRecord[];}
export async function getPublicLoyaltyPrograms():Promise<LoyaltyProgramRecord[]>{if(isLocalDemoMode()){const today=new Date(Date.now()+2*3600000).toISOString().slice(0,10);return getLocalDemoBucket<LoyaltyProgramRecord>("offers").filter(item=>item.active&&(!item.startDate||item.startDate<=today)&&(!item.endDate||item.endDate>=today));}try{const response=await fetch("/api/offers",{cache:"no-store"});if(!response.ok)return [];const result=await response.json();return result.items as LoyaltyProgramRecord[];}catch{return [];}}
export async function saveLoyaltyProgram(item:LoyaltyProgramRecord){if(isLocalDemoMode()){saveLocalDemoBucketRecord("offers",item);return;}const token=await auth.currentUser?.getIdToken();if(!token)throw new Error("Please sign in again.");const response=await fetch("/api/admin/loyalty",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(item)});const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not save offer.");}
export async function deleteLoyaltyProgram(id:string){if(isLocalDemoMode()){deleteLocalDemoBucketRecord("offers",id);return;}const token=await auth.currentUser?.getIdToken();if(!token)throw new Error("Please sign in again.");const response=await fetch("/api/admin/loyalty",{method:"DELETE",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({id})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not delete offer.");}
