import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/send-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("x-dispatch-secret");
        if (auth !== process.env.PUSH_DISPATCH_TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }
        
        let body;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!body?.payload?.title) return new Response("Missing payload", { status: 400 });

        const supabaseAdmin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        );

        let query = supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
        if (!body.broadcast) {
          const hashes = (body.user_hashes ?? []).filter(Boolean);
          if (hashes.length === 0) return Response.json({ sent: 0, skipped: "no targets" });
          query = query.in("user_hash", hashes);
        }
        const { data: subs, error } = await query;
        if (error) return new Response(error.message, { status: 500 });
        if (!subs || subs.length === 0) return Response.json({ sent: 0 });

        let sent = 0;
        const stale: string[] = [];
        
        const { sendPushMessage } = await import("@/lib/push.server");

        await Promise.all(
          subs.map(async (s) => {
            const success = await sendPushMessage(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              body.payload
            );
            if (success) {
              sent++;
            } else {
              stale.push(s.id);
            }
          })
        );

        if (stale.length > 0) {
          await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
        }

        return Response.json({ sent, removed: stale.length });
      },
    },
  },
});
