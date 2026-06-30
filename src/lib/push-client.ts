import { savePushSubscription, deletePushSubscription } from "@/lib/push.functions";

// VAPID public key is publishable by design (used by the browser to subscribe).
export const VAPID_PUBLIC_KEY =
  "BPWZpddG52IpAo7c9Dnhd2qPYp83whDqPWrTWFhIxO_-xNbBtxlyW4mBVPrRsERoAzWRY1biAnYukpcM5TTz4_U";

export const PERMISSION_ASKED_KEY = "cx_push_prompted";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Push only works on real published origins, never inside the Lovable preview iframe. */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return false;
  }
  // Refuse in dev / preview / iframe contexts (same guards as PWA skill).
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  const isPreview =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com") ||
    host.endsWith(".beta.lovable.dev");
  return !inIframe && !isPreview;
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  return existing ?? (await navigator.serviceWorker.register("/sw.js"));
}

/** Ask permission, subscribe, and persist the subscription against the ghost id. */
export async function enablePush(hashedId: string): Promise<"granted" | "denied" | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const json = sub.toJSON();
  await savePushSubscription({
    data: {
      hashedId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  });
  return "granted";
}

/** Unsubscribe locally + remove the stored subscription. */
export async function disablePush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await deletePushSubscription({ data: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}
