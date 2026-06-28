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
    if (error) throw new Error(error.message);

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
    z.object({ postId: z.string().uuid(), dir: z.enum(["up", "down"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("upvotes, downvotes")
      .eq("id", data.postId)
      .single();
    if (!post) throw new Error("Post not found");
    const update =
      data.dir === "up"
        ? { upvotes: (post.upvotes ?? 0) + 1 }
        : { downvotes: (post.downvotes ?? 0) + 1 };
    await supabaseAdmin.from("posts").update(update).eq("id", data.postId);
    return { ok: true };
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

export const submitDirectMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40),
        recipientUsername: z.string().min(3).max(40),
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
    const { error } = await supabaseAdmin.from("direct_messages").insert({
      sender_hash: data.hashedId,
      sender_username: data.username,
      recipient_username: data.recipientUsername,
      content: clean(data.content),
    });
    if (error) throw new Error(error.message);
    return { ok: true, shadow: false };
  });
