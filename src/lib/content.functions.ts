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
        replyToId: z.string().uuid().optional(),
        replyToUsername: z.string().max(40).optional(),
        replyToContent: z.string().max(280).optional(),
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
      reply_to_id: data.replyToId ?? null,
      reply_to_username: data.replyToUsername ?? null,
      reply_to_content: data.replyToContent ? clean(data.replyToContent).slice(0, 280) : null,
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

export const submitComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        postId: z.string().uuid(),
        parentId: z.string().uuid().optional(),
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40),
        content: z.string().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isBanned(data.hashedId)) return { ok: true, shadow: true };
    const { data: comment, error } = await supabaseAdmin
      .from("post_comments")
      .insert({
        post_id: data.postId,
        parent_id: data.parentId ?? null,
        anonymous_user_hash: data.hashedId,
        username: data.username,
        content: clean(data.content),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, shadow: false, comment };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ commentId: z.string().uuid(), hashedId: z.string().min(8) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Delete the comment and all of its nested replies, but only if it belongs
    // to the requesting user.
    const { data: row, error: getErr } = await supabaseAdmin
      .from("post_comments")
      .select("id, anonymous_user_hash")
      .eq("id", data.commentId)
      .single();
    if (getErr || !row) return { ok: false as const };
    if (row.anonymous_user_hash !== data.hashedId) return { ok: false as const };

    // Collect descendant ids (replies) recursively.
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

export const submitGlobalMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40),
        content: z.string().min(1).max(1000),
        replyToId: z.string().uuid().optional(),
        replyToUsername: z.string().max(40).optional(),
        replyToContent: z.string().max(280).optional(),
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
      reply_to_id: data.replyToId ?? null,
      reply_to_username: data.replyToUsername ?? null,
      reply_to_content: data.replyToContent ? clean(data.replyToContent).slice(0, 280) : null,
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
        replyToId: z.string().uuid().optional(),
        replyToUsername: z.string().max(40).optional(),
        replyToContent: z.string().max(280).optional(),
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
      reply_to_id: data.replyToId ?? null,
      reply_to_username: data.replyToUsername ?? null,
      reply_to_content: data.replyToContent ? clean(data.replyToContent).slice(0, 280) : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, shadow: false };
  });

const PIN_TABLE = {
  global: "global_messages",
  community: "community_messages",
  direct: "direct_messages",
} as const;

/** Pin or unpin a chat message. Works for global, community and direct chats. */
export const togglePinMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        messageId: z.string().uuid(),
        messageType: z.enum(["global", "community", "direct"]),
        hashedId: z.string().min(8),
        pinned: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isBanned(data.hashedId)) return { ok: true, shadow: true };
    const table = PIN_TABLE[data.messageType];
    const { error } = await supabaseAdmin
      .from(table)
      .update({ pinned: data.pinned })
      .eq("id", data.messageId);
    if (error) throw new Error(error.message);
    return { ok: true, pinned: data.pinned };
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

export const deleteDirectConversation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        hashedId: z.string().min(8),
        otherUsername: z.string().min(3).max(40).regex(USERNAME_RE),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Authorize strictly by the caller's secret identity hash. Only delete
    // messages in the conversation between the caller and the other party.
    if (!HASH_RE.test(data.hashedId)) {
      throw new Error("Invalid identity");
    }
    const [sent, received] = await Promise.all([
      supabaseAdmin
        .from("direct_messages")
        .delete()
        .eq("sender_hash", data.hashedId)
        .eq("recipient_username", data.otherUsername),
      supabaseAdmin
        .from("direct_messages")
        .delete()
        .eq("recipient_hash", data.hashedId)
        .eq("sender_username", data.otherUsername),
    ]);
    if (sent.error) throw new Error(sent.error.message);
    if (received.error) throw new Error(received.error.message);
    return { ok: true };
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
        types: z.array(z.enum(COLLEGE_TYPES)).min(1).max(COLLEGE_TYPES.length),
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

    const types = Array.from(new Set(data.types));
    const { error } = await supabaseAdmin.from("college_requests").insert({
      requester_hash: data.hashedId,
      name: clean(data.name),
      city: clean(data.city),
      state: clean(data.state),
      type: types[0],
      types,
      established: data.established ?? null,
      description: data.description ? clean(data.description) : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, shadow: false };
  });

const REACTION_EMOJIS = ["👍", "👎", "❤️", "😂", "😮"] as const;

export const toggleReaction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        hashedId: z.string().min(8),
        messageId: z.string().uuid(),
        messageType: z.enum(["global", "community", "direct"]),
        emoji: z.enum(REACTION_EMOJIS),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isBanned(data.hashedId)) return { ok: true, shadow: true };

    // A user can hold only ONE reaction per message.
    const { data: existing } = await supabaseAdmin
      .from("message_reactions")
      .select("id,emoji")
      .eq("message_id", data.messageId)
      .eq("anonymous_user_hash", data.hashedId);

    const mine = existing ?? [];
    const sameEmoji = mine.find((r) => r.emoji === data.emoji);

    // Clicking the same emoji again removes the reaction entirely.
    if (sameEmoji) {
      await supabaseAdmin.from("message_reactions").delete().eq("id", sameEmoji.id);
      return { ok: true, active: false };
    }

    // Switching emoji: drop any previous reaction(s) by this user first.
    if (mine.length) {
      await supabaseAdmin
        .from("message_reactions")
        .delete()
        .in(
          "id",
          mine.map((r) => r.id),
        );
    }

    const { error } = await supabaseAdmin.from("message_reactions").insert({
      message_id: data.messageId,
      message_type: data.messageType,
      anonymous_user_hash: data.hashedId,
      emoji: data.emoji,
    });
    // Ignore unique-violation races (already reacted)
    if (error && (error as { code?: string }).code !== "23505") {
      throw new Error(error.message);
    }
    return { ok: true, active: true };

  });

export const fetchDirectReactions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ hashedId: z.string().min(8) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!HASH_RE.test(data.hashedId)) {
      throw new Error("Invalid identity");
    }
    // Only return reactions for direct messages the caller participates in.
    const [sent, received] = await Promise.all([
      supabaseAdmin.from("direct_messages").select("id").eq("sender_hash", data.hashedId),
      supabaseAdmin.from("direct_messages").select("id").eq("recipient_hash", data.hashedId),
    ]);
    if (sent.error) throw new Error(sent.error.message);
    if (received.error) throw new Error(received.error.message);
    const ids = Array.from(
      new Set([...(sent.data ?? []), ...(received.data ?? [])].map((r) => r.id)),
    );
    if (ids.length === 0)
      return { reactions: [] as Array<{ id: string; message_id: string; emoji: string; anonymous_user_hash: string }> };
    const { data: reactions, error } = await supabaseAdmin
      .from("message_reactions")
      .select("id,message_id,emoji,anonymous_user_hash")
      .eq("message_type", "direct")
      .in("message_id", ids);
    if (error) throw new Error(error.message);
    return { reactions: reactions ?? [] };
  });

export const filterTakenUsernames = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        names: z.array(z.string().min(3).max(40).regex(USERNAME_RE)).min(1).max(40),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const names = Array.from(new Set(data.names));
    const taken = new Set<string>();

    const [posts, global, community, dmSent, dmRecv] = await Promise.all([
      supabaseAdmin.from("posts").select("username").in("username", names),
      supabaseAdmin.from("global_messages").select("username").in("username", names),
      supabaseAdmin.from("community_messages").select("username").in("username", names),
      supabaseAdmin.from("direct_messages").select("sender_username").in("sender_username", names),
      supabaseAdmin.from("direct_messages").select("recipient_username").in("recipient_username", names),
    ]);

    for (const r of posts.data ?? []) if (r.username) taken.add(r.username);
    for (const r of global.data ?? []) if (r.username) taken.add(r.username);
    for (const r of community.data ?? []) if (r.username) taken.add(r.username);
    for (const r of dmSent.data ?? []) if (r.sender_username) taken.add(r.sender_username);
    for (const r of dmRecv.data ?? []) if (r.recipient_username) taken.add(r.recipient_username);

    return {
      taken: Array.from(taken),
      available: names.filter((n) => !taken.has(n)),
    };
  });

/** Public list of usernames that carry a verified tick. */
export const listVerifiedUsernames = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("verified_users" as any).select("username");
    return { usernames: ((data as any[]) ?? []).map((r) => r.username as string) };
  });

/** Public list of admin-assigned custom avatars, keyed by username. */
export const listAvatarOverrides = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("anon_users" as any)
      .select("username, avatar_url")
      .not("avatar_url", "is", null);
    const overrides: { username: string; url: string }[] = [];
    for (const r of (data as any[]) ?? []) {
      if (r.username && r.avatar_url) overrides.push({ username: r.username, url: r.avatar_url });
    }
    return { overrides };
  });

/** Register (or refresh) the caller's anonymous identity so admins can see
 * every user — even brand-new ones with no posts or messages yet. */
export const registerIdentity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ hashedId: z.string().min(8), username: z.string().min(3).max(40) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!HASH_RE.test(data.hashedId)) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("anon_users" as any)
      .upsert(
        { user_hash: data.hashedId, username: data.username, forgotten: false },
        { onConflict: "user_hash" },
      );
    return { ok: true as const };
  });

/** Mark the caller's current identity as abandoned ("Forget Me"). Lets admins
 * count how many users wiped themselves vs how many are still real/active. */
export const markForgotten = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ hashedId: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    if (!HASH_RE.test(data.hashedId)) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("anon_users" as any)
      .upsert(
        { user_hash: data.hashedId, forgotten: true },
        { onConflict: "user_hash" },
      );
    return { ok: true as const };
  });


/** Wipe every trace of the caller's activity. Used by "Forget Me". */
export const purgeMyActivity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ hashedId: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    if (!HASH_RE.test(data.hashedId)) throw new Error("Invalid identity");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const h = data.hashedId;
    await Promise.all([
      supabaseAdmin.from("posts").delete().eq("anonymous_user_hash", h),
      supabaseAdmin.from("post_comments").delete().eq("anonymous_user_hash", h),
      supabaseAdmin.from("post_votes").delete().eq("anonymous_user_hash", h),
      supabaseAdmin.from("community_messages").delete().eq("anonymous_user_hash", h),
      supabaseAdmin.from("global_messages").delete().eq("anonymous_user_hash", h),
      supabaseAdmin.from("ratings").delete().eq("anonymous_user_hash", h),
      supabaseAdmin.from("message_reactions").delete().eq("anonymous_user_hash", h),
      supabaseAdmin.from("direct_messages").delete().eq("sender_hash", h),
      supabaseAdmin.from("direct_messages").delete().eq("recipient_hash", h),
    ]);
    return { ok: true };
  });

/**
 * Sync the caller's identity with the server: returns the username an admin may
 * have assigned (verified-name or latest content name) and whether the account
 * carries a verified tick. Lets admin renames/verification reflect on the
 * user's own device.
 */
export const syncIdentity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ hashedId: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    if (!HASH_RE.test(data.hashedId)) return { username: null as string | null, verified: false, avatarUrl: null as string | null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const h = data.hashedId;

    // Verified row is authoritative for both the tick and the assigned name.
    const { data: v } = await supabaseAdmin
      .from("verified_users" as any)
      .select("username")
      .eq("user_hash", h)
      .maybeSingle();
    const verified = !!v;
    let username: string | null = (v as any)?.username ?? null;

    // Not verified: fall back to the most recent username used by this person,
    // which reflects an admin rename across their content.
    if (!username) {
      const latest = await Promise.all([
        supabaseAdmin.from("posts").select("username, created_at").eq("anonymous_user_hash", h).order("created_at", { ascending: false }).limit(1),
        supabaseAdmin.from("post_comments").select("username, created_at").eq("anonymous_user_hash", h).order("created_at", { ascending: false }).limit(1),
        supabaseAdmin.from("global_messages").select("username, created_at").eq("anonymous_user_hash", h).order("created_at", { ascending: false }).limit(1),
        supabaseAdmin.from("community_messages").select("username, created_at").eq("anonymous_user_hash", h).order("created_at", { ascending: false }).limit(1),
        supabaseAdmin.from("direct_messages").select("sender_username, created_at").eq("sender_hash", h).order("created_at", { ascending: false }).limit(1),
      ]);
      const rows: { name: string; at: string }[] = [];
      const push = (r: any, key: string) => { const x = r.data?.[0]; if (x?.[key]) rows.push({ name: x[key], at: x.created_at }); };
      push(latest[0], "username");
      push(latest[1], "username");
      push(latest[2], "username");
      push(latest[3], "username");
      push(latest[4], "sender_username");
      rows.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      username = rows[0]?.name ?? null;
    }

    return { username, verified };
  });

/** Create a poll in the global room or a college community. Lives 24h. */
export const createPoll = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        scope: z.enum(["global", "college"]),
        collegeId: z.string().uuid().optional(),
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40),
        question: z.string().min(3).max(200),
        options: z.array(z.string().min(1).max(80)).min(2).max(4),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isBanned(data.hashedId)) return { ok: true, shadow: true };
    if (data.scope === "college" && !data.collegeId) {
      throw new Error("collegeId required for college polls");
    }
    const options = data.options.map((o) => clean(o)).filter((o) => o.length > 0);
    if (options.length < 2) throw new Error("Need at least 2 options");
    const { data: poll, error } = await supabaseAdmin
      .from("polls" as any)
      .insert({
        scope: data.scope,
        college_id: data.scope === "college" ? data.collegeId : null,
        anonymous_user_hash: data.hashedId,
        username: data.username,
        question: clean(data.question),
        options,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, shadow: false, poll };
  });

/** Cast (or change) a single vote on a poll. */
export const votePoll = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        pollId: z.string().uuid(),
        optionIndex: z.number().int().min(0).max(3),
        hashedId: z.string().min(8),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (await isBanned(data.hashedId)) return { ok: true, shadow: true };

    const { data: existing } = await supabaseAdmin
      .from("poll_votes" as any)
      .select("id, option_index")
      .eq("poll_id", data.pollId)
      .eq("anonymous_user_hash", data.hashedId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("poll_votes" as any)
        .update({ option_index: data.optionIndex })
        .eq("id", (existing as any).id);
    } else {
      const { error } = await supabaseAdmin.from("poll_votes" as any).insert({
        poll_id: data.pollId,
        option_index: data.optionIndex,
        anonymous_user_hash: data.hashedId,
      });
      if (error && (error as { code?: string }).code !== "23505") {
        throw new Error(error.message);
      }
    }
    return { ok: true };
  });

/** Delete a poll — only the user who created it can. */
export const deletePoll = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ pollId: z.string().uuid(), hashedId: z.string().min(8) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: poll } = await supabaseAdmin
      .from("polls" as any)
      .select("anonymous_user_hash")
      .eq("id", data.pollId)
      .maybeSingle();
    if (!poll) return { ok: false as const };
    if ((poll as any).anonymous_user_hash !== data.hashedId) return { ok: false as const };
    await supabaseAdmin.from("poll_votes" as any).delete().eq("poll_id", data.pollId);
    const { error } = await supabaseAdmin.from("polls" as any).delete().eq("id", data.pollId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
