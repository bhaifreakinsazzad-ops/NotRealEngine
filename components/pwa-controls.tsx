"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, WifiOff, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function subscribeOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

function subscribeDisplayMode(callback: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getStandaloneSnapshot() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getFalseServerSnapshot() {
  return false;
}

function subscribeNoop() {
  return () => {};
}

function getIsIosSnapshot() {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Silent fail in restricted preview/iframe contexts
      });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}

export function OfflineIndicator() {
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );

  if (isOnline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <WifiOff size={15} />
      <span>Offline mode — reconnect to submit briefs, run NRE LAB tools, or open NRE OFFICE.</span>
    </div>
  );
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installedEvent, setInstalledEvent] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  const isStandalone = useSyncExternalStore(
    subscribeDisplayMode,
    getStandaloneSnapshot,
    getFalseServerSnapshot,
  );
  const isIos = useSyncExternalStore(
    subscribeNoop,
    getIsIosSnapshot,
    getFalseServerSnapshot,
  );

  useEffect(() => {
    if (typeof window === "undefined" || isStandalone) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalledEvent(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [isStandalone]);

  const installed = isStandalone || installedEvent;

  if (installed || (!deferredPrompt && !isIos)) {
    return null;
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalledEvent(true);
      }
      setDeferredPrompt(null);
      return;
    }
    if (isIos) {
      setShowIosGuide(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="btn btn-quiet pwa-install-btn"
        title="Install NRE OFFICE App"
      >
        <Download size={14} className="cyan" />
        <span>Install App</span>
      </button>

      {showIosGuide && (
        <div
          className="interactive-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Install NRE OFFICE on iOS"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="interactive-modal-content"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              aria-label="Close install guide"
              onClick={() => setShowIosGuide(false)}
            >
              <X size={18} />
            </button>
            <div className="section-code">INSTALL ON IOS SAFARI</div>
            <h3 style={{ margin: "0 0 .75rem" }}>Add NRE OFFICE to Home Screen</h3>
            <p className="muted" style={{ lineHeight: 1.6, marginBottom: "1rem" }}>
              Install NotRealEngine for fast full-screen access to NRE SELECT, NRE LAB, and NRE OFFICE:
            </p>
            <ol style={{ paddingLeft: "1.2rem", color: "var(--silver)", lineHeight: 1.75, margin: 0 }}>
              <li>
                Tap the <Share size={14} style={{ display: "inline", verticalAlign: "middle" }} /> <strong>Share</strong> button in Safari.
              </li>
              <li>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> in the top-right corner.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
