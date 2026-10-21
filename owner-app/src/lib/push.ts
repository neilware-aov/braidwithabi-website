// Web build (iPhone home-screen app / desktop browser): Web Push.
// The native build uses push.native.ts instead — same exports.
import { router } from "expo-router";
import { emitChange, savePushSubscription } from "./api";

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState = "enabled" | "available" | "blocked" | "needs-install" | "unsupported";

const hasWindow = typeof window !== "undefined" && typeof navigator !== "undefined";

export function isIos(): boolean {
  if (!hasWindow) return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (!hasWindow) return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches === true || (navigator as any).standalone === true;
}

function supported() {
  return hasWindow && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushState(): Promise<PushState> {
  // On iPhone, web notifications only exist once the app is on the Home Screen.
  if (isIos() && !isStandalone()) return "needs-install";
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "available";
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ? "enabled" : "available";
}

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (isIos() && !isStandalone()) {
      return { ok: false, error: "On iPhone, first add this app to your Home Screen (Share → Add to Home Screen), then open it from there." };
    }
    if (!supported()) return { ok: false, error: "This browser doesn't support notifications." };
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "Notifications were not allowed." };
    if (!VAPID_PUBLIC_KEY) return { ok: false, error: "Missing EXPO_PUBLIC_VAPID_PUBLIC_KEY." };
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      }));
    const json = sub.toJSON();
    if (!json.keys?.p256dh || !json.keys?.auth) return { ok: false, error: "Could not read the subscription keys." };
    await savePushSubscription({ kind: "web", token: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function refreshPushRegistration() {
  try {
    if (supported() && Notification.permission === "granted") await enablePush();
  } catch {}
}

/**
 * The service worker posts a message when an alert arrives (→ reload the
 * lists) or is tapped (→ open that appointment).
 */
export function listenForNotifications(): () => void {
  if (!hasWindow || !("serviceWorker" in navigator)) return () => {};
  const onMsg = (e: MessageEvent) => {
    if (e.data?.type === "refresh") emitChange();
    if (e.data?.type === "open" && typeof e.data.url === "string") router.push(e.data.url);
  };
  navigator.serviceWorker.addEventListener("message", onMsg);
  return () => navigator.serviceWorker.removeEventListener("message", onMsg);
}

export function registerServiceWorker() {
  if (!hasWindow || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

// ── Android Chrome "Install app" prompt ────────────────────────
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;
const installListeners = new Set<() => void>();
if (hasWindow) {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    installListeners.forEach((f) => f());
  });
}
export const canPromptInstall = () => deferred !== null;
export function onInstallableChange(fn: () => void) {
  installListeners.add(fn);
  return () => {
    installListeners.delete(fn);
  };
}
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const e = deferred;
  deferred = null;
  await e.prompt();
  return (await e.userChoice).outcome === "accepted" ? "accepted" : "dismissed";
}
