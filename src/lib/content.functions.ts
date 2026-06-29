import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function clean(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

async function isBanned(hash: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("banned_users")
    .select("id")
    .eq("user_hash", hash)
    .maybeSingle();
  return !!data;
}

export const submitPost = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        collegeId: z.string().uuid(),
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40),
        content: z.string().min(10).max(5000),
        category: z.string().max(40).default("general"),
        evidenceUrls: z.array(z.string().url()).max(5).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Shadow ban: report success but do not store.
    if (await isBanned(data.hashedId)) {
      return { ok: true, postId: null as string | null, shadow: true };
    }
    const { data: post, error } = await supabaseAdmin
      .from("posts")
      .insert({
        college_id: data.collegeId,
        anonymous_user_hash: data.hashedId,
        username: data.username,
        content: clean(data.content),
        category: data.category,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.evidenceUrls?.length) {
      await supabaseAdmin.from("evidence").insert(
        data.evidenceUrls.map((url) => ({
          post_id: post.id,
          type: url.toLowerCase().endsWith(".pdf") ? "document" : "image",
          file_url: url,
        })),
      );
    }
    return { ok: true, postId: post.id as string, shadow: false };
  });

export const submitMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        collegeId: z.string().uuid(),
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40),
        content: z.string().min(1).max(1000),
        isIncidentSignal: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isBanned(data.hashedId)) return { ok: true, shadow: true };
    const { error } = await supabaseAdmin.from("community_messages").insert({
      college_id: data.collegeId,
      anonymous_user_hash: data.hashedId,
      username: data.username,
      content: clean(data.content),
      is_incident_signal: data.isIncidentSignal,
    });
    if (error) throw new Error(error.message);
    return { ok: true, shadow: false };
  });

export const submitRating = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        collegeId: z.string().uuid(),
        hashedId: z.string().min(8),
        faculty: z.number().min(1).max(5),
        placement: z.number().min(1).max(5),
        infrastructure: z.number().min(1).max(5),
        campusLife: z.number().min(1).max(5),
        value: z.number().min(1).max(5),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isBanned(data.hashedId)) return { ok: true, shadow: true };

    // One rating per user per college.
    const { data: existing } = await supabaseAdmin
      .from("ratings")
      .select("id")
      .eq("college_id", data.collegeId)
      .eq("anonymous_user_hash", data.hashedId)
      .maybeSingle();
    if (existing) {
      return { ok: false, alreadyRated: true };
    }

    const overall =
      (data.faculty + data.placement + data.infrastructure + data.campusLife + data.value) / 5;
    const { error } = await supabaseAdmin.from("ratings").insert({
      college_id: data.collegeId,
      anonymous_user_hash: data.hashedId,
      faculty_rating: data.faculty,
      placement_rating: data.placement,
      infrastructure_rating: data.infrastructure,
      campus_life_rating: data.campusLife,
      value_rating: data.value,
      overall,
    });
    if (error) {
      // Unique-constraint violation -> already rated (race condition safe).
      if ((error as { code?: string }).code === "23505") {
        return { ok: false, alreadyRated: true };
      }
      throw new Error(error.message);
    }

    // Recompute college aggregate
    const { data: col } = await supabaseAdmin
      .from("colleges")
      .select("total_rating, total_reviews")
      .eq("id", data.collegeId)
      .single();
    if (col) {
      const reviews = (col.total_reviews ?? 0) + 1;
      const newAvg =
        ((col.total_rating ?? 0) * (col.total_reviews ?? 0) + overall) / reviews;
      await supabaseAdmin
        .from("colleges")
        .update({ total_rating: Math.round(newAvg * 10) / 10, total_reviews: reviews })
        .eq("id", data.collegeId);
    }
    return { ok: true, shadow: false };
  });


export const votePost = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ postId: z.string().uuid(), dir: z.enum(["up", "down"]), hashedId: z.string().min(8) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("post_votes")
      .select("id, dir")
      .eq("post_id", data.postId)
      .eq("anonymous_user_hash", data.hashedId)
      .maybeSingle();

    let userVote: "up" | "down" | null = null;

    if (existing) {
      if (existing.dir === data.dir) {
        await supabaseAdmin.from("post_votes").delete().eq("id", existing.id);
        userVote = null;
      } else {
        await supabaseAdmin.from("post_votes").update({ dir: data.dir }).eq("id", existing.id);
        userVote = data.dir;
      }
    } else {
      await supabaseAdmin.from("post_votes").insert({
        post_id: data.postId,
        anonymous_user_hash: data.hashedId,
        dir: data.dir,
      });
      userVote = data.dir;
    }

    const { data: votes } = await supabaseAdmin
      .from("post_votes")
      .select("dir")
      .eq("post_id", data.postId);

    const upvotes = (votes ?? []).filter((v) => v.dir === "up").length;
    const downvotes = (votes ?? []).filter((v) => v.dir === "down").length;

    await supabaseAdmin.from("posts").update({ upvotes, downvotes }).eq("id", data.postId);

    return { ok: true, userVote };
  });

export const submitGlobalMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40),
        content: z.string().min(1).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isBanned(data.hashedId)) return { ok: true, shadow: true };
    const { error } = await supabaseAdmin.from("global_messages").insert({
      anonymous_user_hash: data.hashedId,
      username: data.username,
      content: clean(data.content),
    });
    if (error) throw new Error(error.message);
    return { ok: true, shadow: false };
  });

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;
const HASH_RE = /^[a-f0-9]{8,128}$/;

async function lookupHashForUsername(username: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Resolve a username to its secret identity hash using existing,
  // identity-bearing records. Never trust a client-supplied recipient hash.
  const post = await supabaseAdmin.from("posts").select("anonymous_user_hash").eq("username", username).order("created_at", { ascending: false }).limit(1);
  if (post.data?.[0]?.anonymous_user_hash) return post.data[0].anonymous_user_hash;
  const gm = await supabaseAdmin.from("global_messages").select("anonymous_user_hash").eq("username", username).order("created_at", { ascending: false }).limit(1);
  if (gm.data?.[0]?.anonymous_user_hash) return gm.data[0].anonymous_user_hash;
  const cm = await supabaseAdmin.from("community_messages").select("anonymous_user_hash").eq("username", username).order("created_at", { ascending: false }).limit(1);
  if (cm.data?.[0]?.anonymous_user_hash) return cm.data[0].anonymous_user_hash;
  const dm = await supabaseAdmin.from("direct_messages").select("sender_hash").eq("sender_username", username).order("created_at", { ascending: false }).limit(1);
  if (dm.data?.[0]?.sender_hash) return dm.data[0].sender_hash;
  return null;
}


export const submitDirectMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40).regex(USERNAME_RE),
        recipientUsername: z.string().min(3).max(40).regex(USERNAME_RE),
        content: z.string().min(1).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isBanned(data.hashedId)) return { ok: true, shadow: true };
    if (data.recipientUsername === data.username) {
      throw new Error("You cannot message yourself");
    }
    const recipientHash = await lookupHashForUsername(data.recipientUsername);
    const { error } = await supabaseAdmin.from("direct_messages").insert({
      sender_hash: data.hashedId,
      sender_username: data.username,
      recipient_username: data.recipientUsername,
      recipient_hash: recipientHash,
      content: clean(data.content),
    });
    if (error) throw new Error(error.message);
    return { ok: true, shadow: false };
  });

export const fetchDirectMessages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Authorize strictly by the caller's secret identity hash. Never filter by
    // the client-supplied username (it is public and spoofable). Run two
    // parameterised .eq() queries instead of interpolating into a raw .or()
    // filter string, which would allow PostgREST filter injection.
    if (!HASH_RE.test(data.hashedId)) {
      throw new Error("Invalid identity");
    }
    const [sent, received] = await Promise.all([
      supabaseAdmin.from("direct_messages").select("*").eq("sender_hash", data.hashedId),
      supabaseAdmin.from("direct_messages").select("*").eq("recipient_hash", data.hashedId),
    ]);
    if (sent.error) throw new Error(sent.error.message);
    if (received.error) throw new Error(received.error.message);
    const byId = new Map<string, (typeof sent.data)[number]>();
    for (const row of [...(sent.data ?? []), ...(received.data ?? [])]) {
      byId.set(row.id, row);
    }
    const rows = Array.from(byId.values()).sort((a, b) =>
      a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
    );
    return { messages: rows };
  });


const COLLEGE_TYPES = ["Engineering", "Medical", "Arts", "Commerce", "University", "Research"] as const;

export const submitCollegeRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        hashedId: z.string().min(8),
        name: z.string().min(2).max(120),
        city: z.string().min(2).max(80),
        state: z.string().min(2).max(80),
        type: z.enum(COLLEGE_TYPES),
        established: z.number().int().min(1800).max(2100).nullable().optional(),
        description: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isBanned(data.hashedId)) return { ok: true, shadow: true };

    // Prevent duplicate college names (already exists)
    const { data: existing } = await supabaseAdmin
      .from("colleges")
      .select("id")
      .ilike("name", clean(data.name))
      .maybeSingle();
    if (existing) return { ok: false as const, reason: "exists" };

    const { error } = await supabaseAdmin.from("college_requests").insert({
      requester_hash: data.hashedId,
      name: clean(data.name),
      city: clean(data.city),
      state: clean(data.state),
      type: data.type,
      established: data.established ?? null,
      description: data.description ? clean(data.description) : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, shadow: false };
  });
