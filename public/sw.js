const CACHE_NAME="village-wellness-spa-shell-v1";
const APP_SHELL=["/","/treatments","/book","/admin","/offline","/icon.svg","/icon.svg","/manifest.webmanifest"];
try {
 importScripts("https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js","https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js");
 firebase.initializeApp({apiKey:"AIzaSyDOgUYyu2ZEMbZjb3mVtnjYD_lzEl79wzg",authDomain:"tripple-s-wellness-spa.firebaseapp.com",projectId:"tripple-s-wellness-spa",storageBucket:"tripple-s-wellness-spa.firebasestorage.app",messagingSenderId:"742237320978",appId:"1:742237320978:web:0d8d422c03de028f6965cb",measurementId:"G-L5VDQ5Q4YJ"});
 const messaging=firebase.messaging();
 messaging.onBackgroundMessage(payload=>{const title=payload.notification?.title||"Village Wellness Spa update";const body=payload.notification?.body||"Open My Village Wellness Spa to review your appointment.";const link=payload.fcmOptions?.link||payload.data?.link||"/account";self.registration.showNotification(title,{body,icon:"/icon.svg",badge:"/icon.svg",data:{link}});});
} catch(error) { console.warn("[Village Wellness Spa] background push unavailable",error); }
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("notificationclick",event=>{event.notification.close();const link=event.notification.data?.link||"/account";event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(windows=>{const target=new URL(link,self.location.origin).href;for(const client of windows){if(client.url===target&&"focus" in client)return client.focus()}return self.clients.openWindow(target)}))});
self.addEventListener("fetch",event=>{const request=event.request;if(request.method!=="GET"||!request.url.startsWith(self.location.origin))return;const url=new URL(request.url);
 if(url.pathname==="/account"||url.pathname.startsWith("/api/")){event.respondWith(fetch(request));return;}
 if(request.mode==="navigate"&&(url.pathname==="/admin"||url.pathname.startsWith("/admin/"))){event.respondWith(fetch(request).catch(()=>caches.match("/admin").then(cached=>cached||caches.match("/offline"))));return}
 if(url.pathname.startsWith("/_next/")){event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();void caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response})) );return}
 if(request.mode==="navigate"){event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();void caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match(request).then(cached=>cached||caches.match(url.pathname)||caches.match("/offline"))));return}
 const isPublicAsset=["/images/","/fonts/"].some(prefix=>url.pathname.startsWith(prefix))||/\.(?:css|woff2?|ttf|otf|png|jpe?g|webp|svg|ico|avif)$/i.test(url.pathname);
 if(isPublicAsset){event.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(response=>{if(response.ok){const copy=response.clone();void caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response});return cached||network}));return}
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});