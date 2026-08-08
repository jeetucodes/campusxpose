import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const subSchema = z.object({
  hashedId: z.string().min(1),
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

/** Store (or refresh) a ghost user's browser push subscription. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => subSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_hash: data.hashedId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);

    // Send a welcome notification
    await supabaseAdmin.rpc("enqueue_notifications", {
      _hashes: [data.hashedId],
      _type: "system",
      _title: "Notifications enabled",
      _message: "You will now receive alerts for replies and messages.",
      _link: "/",
    });

    return { ok: true as const };
  });

/** Remove a subscription (user disabled notifications / unsubscribed). */
export const deletePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ endpoint: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true as const };
  });

/** Notify a user of an incoming call via push notification. */
export const notifyIncomingCall = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ targetUsername: z.string(), callerUsername: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendOneSignalNotification } = await import("./onesignal.server");

    const { data: targetUser } = await supabaseAdmin
      .from("anon_users")
      .select("user_hash")
      .eq("username", data.targetUsername)
      .maybeSingle();

    if (!targetUser?.user_hash) return { ok: false };

    const success = await sendOneSignalNotification({
      userIds: [targetUser.user_hash],
      title: "Incoming Call! 📞",
      message: `${data.callerUsername} is calling you on CampusXpose.`,
      url: `/messages?to=${data.callerUsername}`,
    });

    return { ok: true, pushed: success ? 1 : 0 };
  });
