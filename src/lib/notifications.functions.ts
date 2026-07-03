import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function assertAdmin(token: string) {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  const exp = createHash("sha256").update(pw + todayStr()).digest("hex");
  const a = Buffer.from(token);
  const b = Buffer.from(exp);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Unauthorized");
}

/** List a ghost user's in-app notifications + unread count. */
export const getNotifications = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ hashedId: z.string().min(1), limit: z.number().min(1).max(50).default(5) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // The bell only surfaces comment + broadcast notifications.
    // DMs have their own unread badge and global chat replies live in /global,
    // so 'dm' and 'reply' types are intentionally excluded here.
    const HIDDEN = "(dm,reply)";
    const [list, unread] = await Promise.all([
      supabaseAdmin
        .from("notifications")
        .select("id, type, message, link, read, created_at")
        .eq("user_hash", data.hashedId)
        .not("type", "in", HIDDEN)
        .order("created_at", { ascending: false })
        .limit(data.limit),
      supabaseAdmin
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_hash", data.hashedId)
        .not("type", "in", HIDDEN)
        .eq("read", false),
    ]);

    // Automatically remove older notifications to keep only the latest ones
    if (list.data && list.data.length === data.limit) {
      const oldestKept = list.data[list.data.length - 1];
      Promise.resolve(supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_hash", data.hashedId)
        .not("type", "in", HIDDEN)
        .lt("created_at", oldestKept.created_at))
        .then(() => {})
        .catch(() => {});
    }

    return { items: list.data ?? [], unread: unread.count ?? 0 };
  });

/** Mark all (or one) of a user's notifications as read. */
export const markNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ hashedId: z.string().min(1), id: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("notifications").update({ read: true }).eq("user_hash", data.hashedId);
    if (data.id) q = q.eq("id", data.id);
    await q;
    return { ok: true as const };
  });

/** Admin-only: broadcast one announcement to every ghost user + push to all subscribers. */
export const adminBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(1),
        message: z.string().min(1).max(500),
        link: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // In-app history for every active ghost user.
    const { data: users } = await supabaseAdmin
      .from("anon_users")
      .select("user_hash")
      .eq("forgotten", false);
    const hashes = (users ?? []).map((u) => u.user_hash);
    let inserted = 0;
    for (let i = 0; i < hashes.length; i += 1000) {
      const chunk = hashes.slice(i, i + 1000).map((h) => ({
        user_hash: h,
        type: "broadcast",
        message: data.message,
        link: data.link || "/",
      }));
      if (chunk.length) {
        await supabaseAdmin.from("notifications").insert(chunk);
        inserted += chunk.length;
      }
    }

    // Browser push to all subscribers using the NodeJS backend instead of an edge function
    let pushed = 0;
    const stale: string[] = [];
    
    try {
      const { sendPushMessage } = await import("./push.server");
      const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
      if (subs && subs.length > 0) {
        await Promise.all(
          subs.map(async (s) => {
            const success = await sendPushMessage(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              { title: "CampusXpose", body: data.message, url: data.link || "/" }
            );
            if (success) {
              pushed++;
            } else {
              stale.push(s.id);
            }
          })
        );
        
        if (stale.length > 0) {
          await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
        }
      }
    } catch (e) {
      console.error("Broadcast push error:", e);
    }

    return { ok: true as const, inserted, pushed };
  });
