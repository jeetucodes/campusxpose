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

        const { sendOneSignalNotification } = await import("@/lib/onesignal.server");

        const payload = {
          title: body.payload.title,
          message: body.payload.body || "",
          url: body.payload.url,
          broadcast: body.broadcast === true,
          userIds: !body.broadcast ? (body.user_hashes ?? []).filter(Boolean) : undefined,
        };

        if (!payload.broadcast && (!payload.userIds || payload.userIds.length === 0)) {
           return Response.json({ sent: 0, skipped: "no targets" });
        }

        const success = await sendOneSignalNotification(payload);

        return Response.json({ sent: success ? 1 : 0 });
      },
    },
  },
});
