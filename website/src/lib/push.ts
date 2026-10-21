// Push notifications to the owner app:
//  • Android app  → Expo push service (ExponentPushToken)
//  • iPhone (home-screen web app) → Web Push with VAPID keys
import "server-only";
import webpush from "web-push";
import { deletePushSubscription, getPushSubscriptions } from "./db";

let vapidReady = false;
function setupVapid() {
  if (vapidReady) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@braidwithabi.ca", pub, priv);
  vapidReady = true;
  return true;
}

export async function notifyOwner(title: string, body: string, data: Record<string, unknown> = {}) {
  try {
    const subs = await getPushSubscriptions();
    if (!subs.length) return;

    const expo = subs.filter((s) => s.kind === "expo");
    const web = subs.filter((s) => s.kind === "web");

    const jobs: Promise<unknown>[] = [];

    if (expo.length) {
      jobs.push(
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(
            expo.map((s) => ({ to: s.token, title, body, data, sound: "default", priority: "high", ttl: 86400 }))
          ),
        })
          .then((r) => r.json())
          .then(async (json: any) => {
            const results: any[] = json?.data ?? [];
            await Promise.all(
              results.map((r, i) =>
                r?.details?.error === "DeviceNotRegistered" ? deletePushSubscription(expo[i].id) : null
              )
            );
          })
      );
    }

    if (web.length && setupVapid()) {
      const payload = JSON.stringify({ title, body, data });
      for (const s of web) {
        jobs.push(
          webpush
            .sendNotification({ endpoint: s.token, keys: { p256dh: s.p256dh!, auth: s.auth! } }, payload, {
              TTL: 86400,
              urgency: "high",
            })
            .catch(async (e: any) => {
              if ([403, 404, 410].includes(e?.statusCode)) await deletePushSubscription(s.id);
              else console.error("[push:web]", e?.statusCode, e?.body);
            })
        );
      }
    }

    await Promise.allSettled(jobs);
  } catch (e) {
    console.error("[push] failed:", e);
  }
}
