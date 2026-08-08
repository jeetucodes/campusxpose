export const ONESIGNAL_APP_ID = "99906f9e-9dd2-4000-b559-0185efddc600";

interface OneSignalPayload {
  title: string;
  message: string;
  url?: string;
  userIds?: string[];
  broadcast?: boolean;
}

export async function sendOneSignalNotification({
  title,
  message,
  url,
  userIds,
  broadcast = false,
}: OneSignalPayload) {
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  console.log("OneSignal Backend Triggered. API Key exists?", !!restApiKey);
  if (!restApiKey) {
    console.warn("ONESIGNAL_REST_API_KEY is missing in environment. Cannot send notification.");
    return false;
  }

  const body: any = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: "push",
    headings: { en: title },
    contents: { en: message },
  };

  if (url) {
    // Both url and app_url to ensure it opens the right path on web and mobile
    body.url = url;
    body.app_url = url;
  }

  if (broadcast) {
    body.included_segments = ["Total Subscriptions"];
  } else if (userIds && userIds.length > 0) {
    body.include_aliases = { external_id: userIds };
  } else {
    // If neither broadcast nor userIds are provided, do nothing
    return false;
  }

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OneSignal API Error:", data);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to send OneSignal notification:", error);
    return false;
  }
}
