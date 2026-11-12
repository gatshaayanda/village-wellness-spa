"use client";

import { useEffect, useState } from "react";

export default function PwaRegister() {
  const [offline, setOffline] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installCardDismissed, setInstallCardDismissed] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    let registration: ServiceWorkerRegistration | undefined;
    const online = () => {
      setOffline(false);
      if (registration) void registration.update().catch((error) => {
        console.warn("[Village Wellness Spa] service worker update check failed", error);
      });
    };
    const offlineNow = () => setOffline(true);
    const installPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallCardDismissed(false);
      setInstallable(true);
    };
    const installed = () => {
      setDeferredPrompt(null);
      setInstallable(false);
      setInstallCardDismissed(false);
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offlineNow);
    window.addEventListener("beforeinstallprompt", installPrompt);
    window.addEventListener("appinstalled", installed);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((result) => { registration = result; })
        .catch((error) => {
          console.warn("[Village Wellness Spa] service worker registration failed", error);
        });
    }

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineNow);
      window.removeEventListener("beforeinstallprompt", installPrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstallable(false);
  }

  return (
    <>
      {offline && <div className="offlineBanner" role="status">Offline mode · previously loaded public pages may remain available. New bookings and walk-in queue joins need an internet connection; reconnect before submitting a request.</div>}
      {installable && !installCardDismissed && (
        <aside className="village-install-card" aria-label="Install Village Wellness Spa">
          <div className="village-install-brand">
            <img className="village-install-mark" src="/icon.svg" alt="" />
            <span><strong>VILLAGE WELLNESS SPA</strong><small>SKIN HEALTH · BEAUTY · WELLNESS</small></span>
          </div>
          <button className="village-install-close" type="button" aria-label="Dismiss install prompt" onClick={() => setInstallCardDismissed(true)}>×</button>
          <button className="village-install-action" type="button" onClick={() => void install()}>Install Village Spa <span aria-hidden="true">↗</span></button>
        </aside>
      )}
    </>
  );
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}
