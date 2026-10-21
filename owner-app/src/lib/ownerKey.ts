// Web version (iPhone Home Screen app). The private key is deliberately NOT
// built into the code — anyone who finds the app's address could download
// that. Instead Abi opens a private setup link once:
//
//     https://<owner app address>/#key=XXXXXXXX
//
// The key is kept on her phone and in the address (after "#", which is never
// sent over the internet), so "Add to Home Screen" saves it with the icon.

const STORE = "bwa-owner-key";
const KEY_RE = /[A-Za-z0-9_-]{16,}/;
const listeners = new Set<() => void>();
const hasWindow = typeof window !== "undefined";

function fromAddress(): string {
  if (!hasWindow) return "";
  const m = /[#&]key=([A-Za-z0-9_-]{16,})/.exec(window.location.hash);
  return m ? m[1] : "";
}

function stored(): string {
  try {
    return localStorage.getItem(STORE) ?? "";
  } catch {
    return "";
  }
}

let key = fromAddress() || stored();
if (key) save(key);

// The setup link opened while the app is already showing (same page, new "#key=…").
if (hasWindow) {
  window.addEventListener("hashchange", () => {
    const k = fromAddress();
    if (k && k !== key) setOwnerKey(k);
  });
}

function save(k: string) {
  try {
    localStorage.setItem(STORE, k);
  } catch {}
}

export const ownerKey = () => key;

export function onKeyChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setOwnerKey(k: string) {
  key = k;
  save(k);
  keepKeyInAddress();
  listeners.forEach((f) => f());
}

/** Called when the website says the key is wrong (e.g. it was changed). */
export function forgetOwnerKey() {
  key = "";
  try {
    localStorage.removeItem(STORE);
  } catch {}
  if (hasWindow && window.location.hash) {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }
  listeners.forEach((f) => f());
}

/** Accepts the whole setup link, or just the key. */
export function parseSetupLink(text: string): string | null {
  const t = text.trim();
  const m = /key=([A-Za-z0-9_-]{16,})/.exec(t);
  if (m) return m[1];
  return KEY_RE.test(t) && /^[A-Za-z0-9_-]+$/.test(t) ? t : null;
}

/** Keeps #key=… in the address so "Add to Home Screen" saves it with the icon. */
export function keepKeyInAddress() {
  if (!hasWindow || !key || window.location.hash.includes("key=")) return;
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#key=${key}`);
}

export const canPair = true;
