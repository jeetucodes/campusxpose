import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function expectedToken(): string {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  return createHash("sha256").update(pw + todayStr()).digest("hex");
}

function assertToken(token: string) {
  const exp = expectedToken();
  const a = Buffer.from(token);
  const b = Buffer.from(exp);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Unauthorized");
  }
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const pw = process.env.ADMIN_PASSWORD ?? "";
    const inp = createHash("sha256").update(data.password).digest();
    const real = createHash("sha256").update(pw).digest();
    if (inp.length !== real.length || !timingSafeEqual(inp, real)) {
      return { ok: false as const };
    }
    return { ok: true as const, token: expectedToken() };
  });

export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 864e5).toISOString();
    const count = async (t: string, todayCol?: string) => {
      const total = await supabaseAdmin.from(t as any).select("*", { count: "exact", head: true });
      let today = 0;
      if (todayCol) {
        const r = await supabaseAdmin
          .from(t as any)
          .select("*", { count: "exact", head: true })
          .gte(todayCol, since);
        today = r.count ?? 0;
      }
      return { total: total.count ?? 0, today };
    };
    const [colleges, incidents, posts, evidence, messages, banned] = await Promise.all([
      count("colleges"),
      count("incidents", "first_seen"),
      count("posts", "created_at"),
      count("evidence", "created_at"),
      count("community_messages", "created_at"),
      count("banned_users"),
    ]);

    const { data: cat } = await supabaseAdmin.from("incidents").select("category, severity, status, college_id, total_amount, first_seen");
    return { colleges, incidents, posts, evidence, messages, banned, incidentRows: cat ?? [] };
  });

export const adminRecentActivity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [posts, incidents, evidence] = await Promise.all([
      supabaseAdmin.from("posts").select("id, username, content, college_id, created_at, ai_analyzed").order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("incidents").select("id, title, category, severity, college_id, first_seen").order("first_seen", { ascending: false }).limit(5),
      supabaseAdmin.from("evidence").select("id, file_url, type, created_at").order("created_at", { ascending: false }).limit(5),
    ]);
    return { posts: posts.data ?? [], incidents: incidents.data ?? [], evidence: evidence.data ?? [] };
  });

export const adminAddCollege = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      token: z.string(),
      name: z.string().min(2),
      city: z.string().min(2),
      state: z.string().min(2),
      type: z.string(),
      types: z.array(z.string()).min(1).optional(),
      established: z.number().nullable().optional(),
      description: z.string().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { token, ...fields } = data;
    const types = Array.from(new Set(fields.types && fields.types.length ? fields.types : [fields.type]));
    const { data: col, error } = await supabaseAdmin
      .from("colleges")
      .insert({ ...fields, type: types[0], types } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return col;
  });

export const adminUpdateCollege = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string(), id: z.string().uuid(), patch: z.record(z.string(), z.any()) }).parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, any> = { ...data.patch };
    // Keep the primary `type` in sync with the multi-select `types`.
    if (Array.isArray(patch.types)) {
      const types = Array.from(new Set(patch.types));
      if (types.length) { patch.types = types; patch.type = types[0]; }
    }
    const { error } = await supabaseAdmin.from("colleges").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteColleges = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string(), ids: z.array(z.string().uuid()).min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // ON DELETE CASCADE handles incidents, posts, messages, evidence, ratings.
    const { error } = await supabaseAdmin.from("colleges").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, deleted: data.ids.length };
  });

export const adminDeleteIncidents = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), ids: z.array(z.string().uuid()).min(1) }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("incidents").delete().in("id", data.ids);
    return { ok: true };
  });

export const adminUpdateIncident = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid(), patch: z.record(z.string(), z.any()) }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("incidents").update(data.patch as any).eq("id", data.id);
    return { ok: true };
  });

export const adminDeletePosts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), ids: z.array(z.string().uuid()).min(1) }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("posts").delete().in("id", data.ids);
    return { ok: true };
  });

export const adminMarkPostIncident = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid(), incidentId: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("posts").update({ is_incident: true, incident_id: data.incidentId }).eq("id", data.id);
    return { ok: true };
  });

export const adminClearChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), collegeId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const before = await supabaseAdmin.from("community_messages").select("*", { count: "exact", head: true }).eq("college_id", data.collegeId);
    await supabaseAdmin.from("community_messages").delete().eq("college_id", data.collegeId);
    return { ok: true, deleted: before.count ?? 0 };
  });

export const adminDeleteMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("community_messages").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminDeleteUserMessages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), userHash: z.string(), collegeId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("community_messages").delete().eq("anonymous_user_hash", data.userHash);
    if (data.collegeId) q = q.eq("college_id", data.collegeId);
    await q;
    return { ok: true };
  });

export const adminBanUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), userHash: z.string(), username: z.string().optional(), reason: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("banned_users").upsert({ user_hash: data.userHash, username: data.username, reason: data.reason }, { onConflict: "user_hash" });
    return { ok: true };
  });

export const adminUnbanUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), userHash: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("banned_users").delete().eq("user_hash", data.userHash);
    return { ok: true };
  });

export const adminDeleteUserActivity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), userHash: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("posts").delete().eq("anonymous_user_hash", data.userHash);
    await supabaseAdmin.from("community_messages").delete().eq("anonymous_user_hash", data.userHash);
    await supabaseAdmin.from("ratings").delete().eq("anonymous_user_hash", data.userHash);
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [posts, msgs, globals, banned, verified] = await Promise.all([
      supabaseAdmin.from("posts").select("anonymous_user_hash, username, created_at, is_incident"),
      supabaseAdmin.from("community_messages").select("anonymous_user_hash, username, created_at"),
      supabaseAdmin.from("global_messages").select("anonymous_user_hash, username, created_at"),
      supabaseAdmin.from("banned_users").select("user_hash"),
      supabaseAdmin.from("verified_users" as any).select("username, user_hash"),
    ]);
    // Surface real failures instead of silently returning an empty list
    // (which renders a misleading "No users yet").
    if (posts.error) throw new Error(posts.error.message);
    if (msgs.error) throw new Error(msgs.error.message);
    if (globals.error) throw new Error(globals.error.message);
    const bannedSet = new Set((banned.data ?? []).map((b) => b.user_hash));
    const verifiedSet = new Set(((verified.data as any[]) ?? []).map((v) => v.username));
    const map = new Map<string, { hash: string; username: string; posts: number; messages: number; incidents: number; lastActive: string }>();
    const touch = (hash: string, username: string, createdAt: string) => {
      const e = map.get(hash) ?? { hash, username, posts: 0, messages: 0, incidents: 0, lastActive: createdAt };
      if (createdAt > e.lastActive) e.lastActive = createdAt;
      if (!e.username && username) e.username = username;
      map.set(hash, e);
      return e;
    };
    for (const p of posts.data ?? []) {
      const e = touch(p.anonymous_user_hash, p.username, p.created_at);
      e.posts++; if (p.is_incident) e.incidents++;
    }
    for (const m of msgs.data ?? []) {
      touch(m.anonymous_user_hash, m.username, m.created_at).messages++;
    }
    for (const g of globals.data ?? []) {
      touch(g.anonymous_user_hash, g.username, g.created_at).messages++;
    }
    // Surface users that were allotted a username / verified by admin even if
    // they have no other activity yet.
    for (const v of (verified.data as any[]) ?? []) {
      if (v.user_hash) touch(v.user_hash, v.username, new Date(0).toISOString());
    }
    return Array.from(map.values())
      .map((u) => ({ ...u, banned: bannedSet.has(u.hash), verified: verifiedSet.has(u.username) }))
      .sort((a, b) => (a.lastActive < b.lastActive ? 1 : -1));
  });

const RENAME_RE = /^[a-zA-Z0-9_]+$/;

/** Grant or revoke a verified tick for a user (keyed by their current username). */
export const adminSetVerified = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), userHash: z.string().min(1), username: z.string().min(1), verified: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.verified) {
      const { error } = await supabaseAdmin
        .from("verified_users" as any)
        .upsert({ username: data.username, user_hash: data.userHash }, { onConflict: "user_hash" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("verified_users" as any).delete().eq("user_hash", data.userHash);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Assign a brand-new unique username to a user across all their content. */
export const adminRenameUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string(), userHash: z.string().min(1), oldUsername: z.string().min(1), newUsername: z.string().min(3).max(40).regex(RENAME_RE) }).parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const next = data.newUsername;

    // Ensure the new username is not already taken by anyone else.
    const [p, g, c, ds, dr] = await Promise.all([
      supabaseAdmin.from("posts").select("anonymous_user_hash").eq("username", next).limit(1),
      supabaseAdmin.from("global_messages").select("anonymous_user_hash").eq("username", next).limit(1),
      supabaseAdmin.from("community_messages").select("anonymous_user_hash").eq("username", next).limit(1),
      supabaseAdmin.from("direct_messages").select("sender_hash").eq("sender_username", next).limit(1),
      supabaseAdmin.from("direct_messages").select("recipient_hash").eq("recipient_username", next).limit(1),
    ]);
    const clash =
      (p.data ?? []).some((r) => r.anonymous_user_hash !== data.userHash) ||
      (g.data ?? []).some((r) => r.anonymous_user_hash !== data.userHash) ||
      (c.data ?? []).some((r) => r.anonymous_user_hash !== data.userHash) ||
      (ds.data ?? []).some((r) => r.sender_hash !== data.userHash) ||
      (dr.data ?? []).length > 0;
    if (clash) return { ok: false as const, reason: "taken" as const };

    // Rewrite the username everywhere this user appears.
    await Promise.all([
      supabaseAdmin.from("posts").update({ username: next }).eq("anonymous_user_hash", data.userHash),
      supabaseAdmin.from("post_comments").update({ username: next }).eq("anonymous_user_hash", data.userHash),
      supabaseAdmin.from("community_messages").update({ username: next }).eq("anonymous_user_hash", data.userHash),
      supabaseAdmin.from("global_messages").update({ username: next }).eq("anonymous_user_hash", data.userHash),
      supabaseAdmin.from("direct_messages").update({ sender_username: next }).eq("sender_hash", data.userHash),
      supabaseAdmin.from("direct_messages").update({ recipient_username: next }).eq("recipient_hash", data.userHash),
    ]);

    // Keep verification row in sync with the new username if one exists.
    await supabaseAdmin
      .from("verified_users" as any)
      .update({ username: next })
      .eq("username", data.oldUsername);

    return { ok: true as const };
  });


export const adminListEvidence = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("evidence").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminVerifyEvidence = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid(), verified: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("evidence").update({ is_verified: data.verified }).eq("id", data.id);
    return { ok: true };
  });

export const adminDeleteEvidence = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("evidence").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminAnalyzeBatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { analyzePost } = await import("@/lib/ai.functions");
    // Keep the batch small and run without artificial delays so the whole
    // request finishes well within the edge runtime time limit. The admin can
    // press the button again to process the next batch.
    const { data: pending, error } = await supabaseAdmin
      .from("posts")
      .select("id")
      .eq("ai_analyzed", false)
      .limit(5);
    if (error) throw new Error(error.message);
    const ids = (pending ?? []).map((p) => p.id);
    const results = await Promise.allSettled(
      ids.map((id) => analyzePost({ data: { postId: id } })),
    );
    const processed = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - processed;
    const remaining = Math.max((ids.length === 5 ? 1 : 0), 0); // hint there may be more
    return { processed, failed, remaining };
  });


export const adminGenerateReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 864e5).toISOString();
    const [posts, incidents] = await Promise.all([
      supabaseAdmin.from("posts").select("content, category").gte("created_at", since),
      supabaseAdmin.from("incidents").select("title, category, severity").gte("first_seen", since),
    ]);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Generate a concise markdown daily moderation report for an anonymous college accountability platform. Include sections: Total new incidents, Top issues, Spike alerts, Recommended actions." },
          { role: "user", content: `New posts: ${JSON.stringify(posts.data ?? [])}\nNew incidents: ${JSON.stringify(incidents.data ?? [])}` },
        ],
      }),
    });
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const j = await res.json();
    return { report: j.choices?.[0]?.message?.content ?? "No report generated." };
  });

export const adminListCollegeRequests = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("college_requests")
      .select("*")
      .order("created_at", { ascending: false });
    return { requests: rows ?? [] };
  });

export const adminApproveCollegeRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req, error: reqErr } = await supabaseAdmin
      .from("college_requests")
      .select("*")
      .eq("id", data.id)
      .single();
    if (reqErr || !req) throw new Error("Request not found");
    if (req.status === "approved") return { ok: true, alreadyDone: true };

    const reqTypes = ((req as any).types && (req as any).types.length ? (req as any).types : [req.type]) as string[];
    const { data: col, error } = await supabaseAdmin
      .from("colleges")
      .insert({
        name: req.name,
        city: req.city,
        state: req.state,
        type: reqTypes[0],
        types: reqTypes,
        established: req.established,
        description: req.description,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("college_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true, collegeId: col.id as string };
  });

export const adminRejectCollegeRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("college_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true };
  });

// ----------------------- Ads system -----------------------

const adInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  kind: z.enum(["banner", "video"]).default("banner"),
  body: z.string().optional().nullable(),
  link_url: z.string().optional().nullable(),
  media_url: z.string().optional().nullable(),
  embed_url: z.string().optional().nullable(),
  cta_label: z.string().optional().nullable(),
  show_home: z.boolean().default(false),
  show_global: z.boolean().default(false),
  show_college: z.boolean().default(false),
  active: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export const adminListAds = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ads, error } = await supabaseAdmin
      .from("ads" as any)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: setting } = await supabaseAdmin
      .from("app_settings" as any)
      .select("value")
      .eq("key", "ads_enabled")
      .maybeSingle();
    const enabled = (setting as any)?.value === true;
    return { ads: ads ?? [], enabled };
  });

export const adminSaveAd = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).and(adInput).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { token, id, ...fields } = data as any;
    if (id) {
      const { error } = await supabaseAdmin
        .from("ads" as any)
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("ads" as any)
      .insert(fields)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as any).id };
  });

export const adminDeleteAd = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ads" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetAdsEnabled = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings" as any)
      .upsert({ key: "ads_enabled", value: data.enabled, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true, enabled: data.enabled };
  });
