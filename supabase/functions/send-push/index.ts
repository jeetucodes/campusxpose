// Sends Web Push notifications to ghost users' subscribed browsers.
// Invoked by database triggers (via pg_net) and by the admin broadcast server function.
// Authenticated with a shared dispatch token — never with user identity.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const DISPATCH_TOKEN = Deno.env.get("PUSH_DISPATCH_TOKEN")!;

webpush.setVapidDetails("mailto:support@campusxpose.online", VAPID_PUBLIC, VAPID_PRIVATE);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface PushBody {
  user_hashes?: string[];
  broadcast?: boolean;
  payload: { title: string; body: string; url?: string };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Auth: shared dispatch token only.
  if (req.headers.get("x-dispatch-secret") !== DISPATCH_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: PushBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!body?.payload?.title) return new Response("Missing payload", { status: 400 });

  // Resolve target subscriptions.
  let query = admin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (!body.broadcast) {
    const hashes = (body.user_hashes ?? []).filter(Boolean);
    if (hashes.length === 0) return Response.json({ sent: 0, skipped: "no targets" });
    query = query.in("user_hash", hashes);
  }
  const { data: subs, error } = await query;
  if (error) return new Response(error.message, { status: 500 });
  if (!subs || subs.length === 0) return Response.json({ sent: 0 });

  const message = JSON.stringify(body.payload);
  const stale: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
        );
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) stale.push(s.id);
      }
    }),
  );

  // Clean up expired subscriptions so future sends don't error.
  if (stale.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", stale);
  }

  return Response.json({ sent, removed: stale.length });
});
