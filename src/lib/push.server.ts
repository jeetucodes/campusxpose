import webpush from "web-push";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "BPWZpddG52IpAo7c9Dnhd2qPYp83whDqPWrTWFhIxO_-xNbBtxlyW4mBVPrRsERoAzWRY1biAnYukpcM5TTz4_U";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = "mailto:campusxpose@gmail.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function sendPushMessage(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; url?: string }
) {
  if (!VAPID_PRIVATE) {
    console.warn("VAPID_PRIVATE_KEY is missing. Push notifications will not be sent.");
    return false;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (error: any) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      return false; // Indicates stale subscription
    }
    console.error("Error sending push notification:", error);
    return true; // Return true so we don't aggressively delete valid subscriptions on random errors
  }
}
