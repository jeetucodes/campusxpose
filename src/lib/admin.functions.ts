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


export const getSiteSettings = createServerFn({ method: "GET" })
  .validator((d: unknown) => {
    return (d as { token: string }).token ? { token: (d as { token: string }).token } : { token: "" };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    assertToken(data.token);
    
    const { data: settings } = await supabaseAdmin.from("site_settings" as any).select("*").eq("id", 1).single();
    return settings || { news_enabled: true };
  });

export const toggleNewsEnabled = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    return (d as { token: string; enabled: boolean }).token 
      ? { token: (d as { token: string; enabled: boolean }).token, enabled: (d as { enabled: boolean }).enabled } 
      : { token: "", enabled: true };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    assertToken(data.token);
    
    await supabaseAdmin.from("site_settings" as any).update({ news_enabled: data.enabled }).eq("id", 1);
    return { ok: true };
  });

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

export const adminResearchCollegeAI = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: col, error: colError } = await supabaseAdmin.from("colleges").select("name, city, state").eq("id", data.id).single();
    if (colError || !col) throw new Error("College not found");

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("AI not configured in environment");

    const prompt = `Research the following Indian college:
Name: ${col.name}
Location: ${col.city}, ${col.state}

Return ONLY a JSON object (no markdown, no backticks, no other text) with these exact keys:
"website": The official verified website URL (string). Ensure it is the correct, official website. If absolutely unsure, return null.
"fee_structure": A detailed branch-wise or course-wise fee structure summary with amounts per year (e.g., "B.Tech CSE: 74k/year\nB.Tech AIML: 80k/year"). Use newlines for formatting. If the exact fee is not clear or available, provide an estimated average yearly fee (e.g., "Average Fee: 80k/year"). (string, or null if completely unknown)
"latitude": Geographical latitude (number, or null)
"longitude": Geographical longitude (number, or null)
"established": Year of establishment (number, or null)
"description": A 2-3 sentence engaging description of the college (string, or null)`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://campusxpose.online",
        "X-Title": "CampusXpose",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to contact AI API");
    }

    const j = await res.json();
    let content = j.choices?.[0]?.message?.content ?? "{}";
    
    // Strip markdown formatting if the model accidentally included it
    content = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
      const parsed = JSON.parse(content);
      
      const patch: any = {};
      if (parsed.website) patch.website = String(parsed.website);
      if (parsed.fee_structure) patch.fee_structure = String(parsed.fee_structure);
      if (typeof parsed.latitude === "number") patch.latitude = parsed.latitude;
      if (typeof parsed.longitude === "number") patch.longitude = parsed.longitude;
      if (typeof parsed.established === "number") patch.established = parsed.established;
      if (parsed.description) patch.description = String(parsed.description);

      if (Object.keys(patch).length > 0) {
        await supabaseAdmin.from("colleges").update(patch).eq("id", data.id);
      }
      return { ok: true, data: patch };
    } catch (e) {
      throw new Error("Failed to parse AI response: " + content);
    }
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

/** Admin: delete any comment plus all of its nested replies. */
export const adminDeleteComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), commentId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: all } = await supabaseAdmin.from("post_comments").select("id, parent_id");
    const ids = new Set<string>([data.commentId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of all ?? []) {
        if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
          ids.add(c.id);
          changed = true;
        }
      }
    }
    const { error } = await supabaseAdmin.from("post_comments").delete().in("id", Array.from(ids));
    if (error) throw new Error(error.message);
    return { ok: true as const, ids: Array.from(ids) };
  });

/** Admin: list recent comments with their post context. */
export const adminListComments = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), search: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("post_comments")
      .select("id, post_id, parent_id, username, content, created_at, anonymous_user_hash")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.search && data.search.trim()) {
      const s = data.search.trim();
      q = q.or(`content.ilike.%${s}%,username.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
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
    const [posts, msgs, globals, banned, verified, anon] = await Promise.all([
      supabaseAdmin.from("posts").select("anonymous_user_hash, username, created_at, is_incident"),
      supabaseAdmin.from("community_messages").select("anonymous_user_hash, username, created_at"),
      supabaseAdmin.from("global_messages").select("anonymous_user_hash, username, created_at"),
      supabaseAdmin.from("banned_users").select("user_hash"),
      supabaseAdmin.from("verified_users" as any).select("username, user_hash"),
      supabaseAdmin.from("anon_users" as any).select("user_hash, username, avatar_url, forgotten, created_at"),
    ]);
    // Surface real failures instead of silently returning an empty list
    // (which renders a misleading "No users yet").
    if (posts.error) throw new Error(posts.error.message);
    if (msgs.error) throw new Error(msgs.error.message);
    if (globals.error) throw new Error(globals.error.message);
    const bannedSet = new Set((banned.data ?? []).map((b) => b.user_hash));
    const verifiedSet = new Set(((verified.data as any[]) ?? []).map((v) => v.username));
    const anonRows = (anon.data as any[]) ?? [];
    const forgottenSet = new Set(anonRows.filter((a) => a.forgotten).map((a) => a.user_hash));
    const avatarMap = new Map<string, string>(anonRows.filter((a) => a.avatar_url).map((a) => [a.user_hash, a.avatar_url]));
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
    // Surface every registered identity, including brand-new and "forgotten"
    // ones that have not posted or messaged yet.
    for (const a of anonRows) {
      if (a.user_hash) touch(a.user_hash, a.username ?? "", a.created_at ?? new Date(0).toISOString());
    }
    return Array.from(map.values())
      .map((u) => {
        const active = u.posts + u.messages + u.incidents > 0;
        return {
          ...u,
          banned: bannedSet.has(u.hash),
          verified: verifiedSet.has(u.username),
          forgotten: forgottenSet.has(u.hash),
          avatarUrl: avatarMap.get(u.hash) ?? null,
          active,
          real: active && !forgottenSet.has(u.hash),
        };
      })
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

/** Set (or clear) a custom avatar for a user. Pass url=null to reset to the
 * default generated avatar. The user sees it on their own device via syncIdentity. */
export const adminSetAvatar = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      token: z.string(),
      userHash: z.string().min(1),
      username: z.string().optional(),
      url: z.string().url().nullable(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("anon_users" as any)
      .upsert(
        { user_hash: data.userHash, username: data.username ?? null, avatar_url: data.url },
        { onConflict: "user_hash" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin's own profile avatar. Stored on a fixed "admin" identity row so it
 * shows wherever the admin appears (e.g. DM replies). The admin is always
 * verified. Returns the currently saved avatar URL (or null). */
export const adminGetOwnAvatar = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("anon_users" as any)
      .select("avatar_url")
      .eq("user_hash", "admin")
      .maybeSingle();
    return { url: ((row as any)?.avatar_url as string | null) ?? null };
  });

/** Set the admin's own profile avatar (and ensure the admin stays verified). */
export const adminSetOwnAvatar = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("anon_users" as any)
      .upsert(
        { user_hash: "admin", username: "admin", avatar_url: data.url },
        { onConflict: "user_hash" },
      );
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("verified_users" as any)
      .upsert({ username: "admin", user_hash: "admin" }, { onConflict: "user_hash" });
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

    // Keep verification row in sync with the new username (matched by person, not name).
    await supabaseAdmin
      .from("verified_users" as any)
      .update({ username: next })
      .eq("user_hash", data.userHash);

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
    
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("AI not configured in environment");
    
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": "https://campusxpose.com",
        "X-Title": "CampusXpose"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        max_tokens: 2000,
        temperature: 0.6,
        messages: [
          { role: "system", content: "You are an expert AI Analyst. Generate a concise, highly visual daily moderation report for an anonymous college accountability platform.\nSTRICT RULE 1: YOU MUST RESPOND IN 100% ENGLISH ONLY.\nSTRICT RULE 2: OUTPUT ONLY PURE HTML. DO NOT WRITE ANY CONVERSATIONAL TEXT LIKE 'Here is the report'. START IMMEDIATELY WITH <div> or <table>.\n\nMUST INCLUDE:\n1. HTML Tables to present data.\n2. HTML Bar Graphs inside tables! Use: <div style='background-color:#0f172a; height:16px; border-radius:4px; width:[PERCENTAGE]%;'></div>\n\nSections: Quick Summary, Top Issues, Spike Alerts, Recommended Actions." },
          { role: "user", content: `Today's Date is: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}\nNew posts: ${JSON.stringify(posts.data ?? [])}\nNew incidents: ${JSON.stringify(incidents.data ?? [])}` },
        ],
      }),
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Grok API error ${res.status}: ${errText}`);
    }
    const j = await res.json();
    return { report: j.choices?.[0]?.message?.content ?? "No report generated." };
  });

export const adminGenerateGrokReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 30 * 864e5).toISOString(); // Last 30 days
    
    // Fetch comprehensive data (excluding DMs)
    const [posts, incidents, users, colleges, feedback] = await Promise.all([
      supabaseAdmin.from("posts").select("content, category, is_incident, upvotes").gte("created_at", since).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("incidents").select("title, category, severity, status").gte("first_seen", since).order("first_seen", { ascending: false }).limit(30),
      supabaseAdmin.from("anon_users" as any).select("id", { count: 'exact', head: true }).gte("created_at", since),
      supabaseAdmin.from("colleges").select("name, incident_count").order("incident_count", { ascending: false }).limit(10),
      supabaseAdmin.from("feedback" as any).select("message").gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    ]);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("AI not configured in environment");
    
    const prompt = `You are an expert AI Data Analyst for CampusXpose, an anonymous college accountability platform.
Your task is to generate a concise, highly visual, and easy-to-understand report based on the following data from the last 30 days.

Data:
- New Users (last 30 days): ${users.count}
- Posts/Reports: ${JSON.stringify(posts.data?.map(p => ({ category: p.category, incident: p.is_incident, upvotes: p.upvotes })))}
- Incidents: ${JSON.stringify(incidents.data)}
- Top Problematic Colleges: ${JSON.stringify(colleges.data)}

Please write the report entirely in semantic HTML. 
STRICT RULE 1: YOU MUST RESPOND IN 100% ENGLISH ONLY.
STRICT RULE 2: OUTPUT ONLY PURE HTML. DO NOT WRITE ANY CONVERSATIONAL TEXT LIKE "Here is the report". START IMMEDIATELY WITH HTML TAGS.
Keep it SHORT, punchy, and highly visual.

MUST INCLUDE:
1. HTML Tables to present the data clearly.
2. HTML Bar Graphs inside the tables! To draw a graph, use this format inside a table cell: 
   <div style="background-color:#0f172a; height:16px; border-radius:4px; width:[PERCENTAGE]%;"></div>

Sections to include:
1. Quick Summary (Bullet points)
2. Top Issues (Table with visual bar graphs)
3. College Leaderboard (Table with visual bar graphs)
4. Action Items

DO NOT wrap the response in markdown blocks. Output pure HTML.`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://campusxpose.com",
        "X-Title": "CampusXpose"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        max_tokens: 3000,
        temperature: 0.7,
        messages: [
          { role: "system", content: "You are an expert data analyst. Output only valid HTML." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
    }
    const j = await res.json();
    return { reportHtml: j.choices?.[0]?.message?.content ?? "<p>No report generated.</p>" };
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

    // Auto-enrich the newly published college with AI research
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      try {
        const prompt = `Research the following Indian college:
Name: ${req.name}
Location: ${req.city}, ${req.state}

Return ONLY a JSON object (no markdown, no backticks, no other text) with these exact keys:
"website": The official verified website URL (string). Ensure it is the correct, official website. If absolutely unsure, return null.
"fee_structure": A detailed branch-wise or course-wise fee structure summary with amounts per year (e.g., "B.Tech CSE: 74k/year\nB.Tech AIML: 80k/year"). Use newlines for formatting. If the exact fee is not clear or available, provide an estimated average yearly fee (e.g., "Average Fee: 80k/year"). (string, or null if completely unknown)
"latitude": Geographical latitude (number, or null)
"longitude": Geographical longitude (number, or null)
"established": Year of establishment (number, or null)
"description": A 2-3 sentence engaging description of the college (string, or null)`;

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://campusxpose.online",
            "X-Title": "CampusXpose",
          },
          body: JSON.stringify({
            model: "openrouter/free",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (res.ok) {
          const j = await res.json();
          let content = j.choices?.[0]?.message?.content ?? "{}";
          content = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
          try {
            const parsed = JSON.parse(content);
            const patch: any = {};
            if (parsed.website) patch.website = String(parsed.website);
            if (parsed.fee_structure) patch.fee_structure = String(parsed.fee_structure);
            if (typeof parsed.latitude === "number") patch.latitude = parsed.latitude;
            if (typeof parsed.longitude === "number") patch.longitude = parsed.longitude;
            if (typeof parsed.established === "number") patch.established = parsed.established;
            if (parsed.description) patch.description = String(parsed.description);

            if (Object.keys(patch).length > 0) {
              await supabaseAdmin.from("colleges").update(patch).eq("id", col.id);
            }
          } catch (parseErr) {
            console.error("Failed to parse AI response for college approval:", parseErr);
          }
        }
      } catch (researchErr) {
        console.error("AI Research failed for college approval:", researchErr);
      }
    }

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

export const adminGetFeatures = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: setting } = await supabaseAdmin
      .from("app_settings" as any)
      .select("value")
      .eq("key", "projects_enabled")
      .maybeSingle();
    return { projectsEnabled: (setting as any)?.value === true };
  });

export const adminSetFeature = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), feature: z.string(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings" as any)
      .upsert({ key: `${data.feature}_enabled`, value: data.enabled, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true, enabled: data.enabled };
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

/** Admin: list recent polls (global + college) with vote counts. */
export const adminListPolls = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), search: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("polls" as any)
      .select("id, scope, college_id, username, question, options, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.search && data.search.trim()) {
      const s = data.search.trim();
      q = q.or(`question.ilike.%${s}%,username.ilike.%${s}%`);
    }
    const { data: polls, error } = await q;
    if (error) throw new Error(error.message);
    const list = (polls as any[]) ?? [];
    const ids = list.map((p) => p.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: votes } = await supabaseAdmin
        .from("poll_votes" as any)
        .select("poll_id")
        .in("poll_id", ids);
      for (const v of (votes as any[]) ?? []) {
        counts[v.poll_id] = (counts[v.poll_id] ?? 0) + 1;
      }
    }
    return list.map((p) => ({ ...p, vote_count: counts[p.id] ?? 0 }));
  });

/** Admin: delete a poll and all its votes. */
export const adminDeletePoll = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), pollId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("polls" as any).delete().eq("id", data.pollId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Admin: list feedback submissions, newest first. */
export const adminListFeedback = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("feedback" as any)
      .select("id, name, message, user_username, user_hash, status, admin_reply, replied_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (rows as any[]) ?? [];
  });

/** Admin: reply to a feedback item by sending the user a direct message as "admin". */
export const adminReplyFeedback = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string(), id: z.string().uuid(), reply: z.string().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: fb, error: fErr } = await supabaseAdmin
      .from("feedback" as any)
      .select("user_username, user_hash")
      .eq("id", data.id)
      .single();
    if (fErr) throw new Error(fErr.message);

    const username = (fb as any)?.user_username as string | null;
    const recipientHash = (fb as any)?.user_hash as string | null;
    if (!username) {
      throw new Error("This feedback has no identity attached, so a DM reply can't be sent.");
    }

    const reply = data.reply.replace(/<[^>]*>/g, "").trim();
    const { error: dmErr } = await supabaseAdmin.from("direct_messages").insert({
      sender_hash: "admin",
      sender_username: "admin",
      recipient_username: username,
      recipient_hash: recipientHash,
      content: reply,
    });
    if (dmErr) throw new Error(dmErr.message);

    const { error: uErr } = await supabaseAdmin
      .from("feedback" as any)
      .update({ status: "replied", admin_reply: reply, replied_at: new Date().toISOString() })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true as const };
  });


/** Admin: delete a feedback item. */
export const adminDeleteFeedback = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("feedback" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Admin: delete projects. */
export const adminDeleteProjects = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), ids: z.array(z.string().uuid()).min(1) }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("projects" as any).delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true as const, deleted: data.ids.length };
  });

/** Admin: list projects. */
export const adminListProjects = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("projects" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (rows as any[]) ?? [];
  });

export const adminUpdatePushConfig = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), origin: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const dispatchUrl = `${data.origin}/api/send-push`;
    await supabaseAdmin.from("push_config").update({ dispatch_url: dispatchUrl }).eq("id", 1);
    return { ok: true };
  });

export const adminGetNews = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: news, error } = await supabaseAdmin.from("news" as any).select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return news || [];
  });

export const adminCreateNews = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), text: z.string(), link_url: z.string().optional(), image_url: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("news" as any).insert({
      text: data.text,
      link_url: data.link_url || null,
      image_url: data.image_url || null,
      is_active: true
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const adminToggleNewsStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("news" as any).update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const adminDeleteNews = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("news" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
