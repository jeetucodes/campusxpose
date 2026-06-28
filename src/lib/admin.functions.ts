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
    const { data: col, error } = await supabaseAdmin.from("colleges").insert(fields as any).select().single();
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
    const { error } = await supabaseAdmin.from("colleges").update(data.patch as any).eq("id", data.id);
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
    const [posts, msgs, banned] = await Promise.all([
      supabaseAdmin.from("posts").select("anonymous_user_hash, username, created_at, is_incident"),
      supabaseAdmin.from("community_messages").select("anonymous_user_hash, username, created_at"),
      supabaseAdmin.from("banned_users").select("user_hash"),
    ]);
    const bannedSet = new Set((banned.data ?? []).map((b) => b.user_hash));
    const map = new Map<string, { hash: string; username: string; posts: number; messages: number; incidents: number; lastActive: string }>();
    for (const p of posts.data ?? []) {
      const e = map.get(p.anonymous_user_hash) ?? { hash: p.anonymous_user_hash, username: p.username, posts: 0, messages: 0, incidents: 0, lastActive: p.created_at };
      e.posts++; if (p.is_incident) e.incidents++;
      if (p.created_at > e.lastActive) e.lastActive = p.created_at;
      map.set(p.anonymous_user_hash, e);
    }
    for (const m of msgs.data ?? []) {
      const e = map.get(m.anonymous_user_hash) ?? { hash: m.anonymous_user_hash, username: m.username, posts: 0, messages: 0, incidents: 0, lastActive: m.created_at };
      e.messages++;
      if (m.created_at > e.lastActive) e.lastActive = m.created_at;
      map.set(m.anonymous_user_hash, e);
    }
    return Array.from(map.values()).map((u) => ({ ...u, banned: bannedSet.has(u.hash) }));
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
    const { data: pending } = await supabaseAdmin.from("posts").select("id").eq("ai_analyzed", false).limit(20);
    let processed = 0, failed = 0;
    for (const p of pending ?? []) {
      try {
        await analyzePost({ data: { postId: p.id } });
        processed++;
      } catch {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { processed, failed };
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

    const { data: col, error } = await supabaseAdmin
      .from("colleges")
      .insert({
        name: req.name,
        city: req.city,
        state: req.state,
        type: req.type,
        established: req.established,
        description: req.description,
      })
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
