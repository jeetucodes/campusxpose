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

/** Fetch all projects with avg rating. Optionally filter by tag & sort. */
export const listProjects = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        tag: z.string().optional(),
        sort: z.enum(["newest", "rating"]).default("newest"),
        limit: z.number().min(1).max(100).default(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch projects
    let q = supabaseAdmin
      .from("projects" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit) as any;

    const { data: projects, error } = await q;
    if (error) throw new Error(error.message);

    // Fetch avg ratings for all projects
    const { data: ratings } = await (supabaseAdmin
      .from("project_ratings" as any)
      .select("project_id, rating, rating_ui, rating_functionality, rating_concept, rating_bugs") as any);

    const ratingMap = new Map<
      string,
      { 
        sum: number; count: number;
        sum_ui: number; sum_func: number; sum_concept: number; sum_bugs: number;
      }
    >();
    
    for (const r of ratings ?? []) {
      const entry = ratingMap.get(r.project_id) ?? { 
        sum: 0, count: 0, sum_ui: 0, sum_func: 0, sum_concept: 0, sum_bugs: 0 
      };
      entry.sum += r.rating || 0;
      entry.sum_ui += r.rating_ui || 0;
      entry.sum_func += r.rating_functionality || 0;
      entry.sum_concept += r.rating_concept || 0;
      entry.sum_bugs += r.rating_bugs || 0;
      entry.count += 1;
      ratingMap.set(r.project_id, entry);
    }

    let result = (projects ?? []).map((p: any) => {
      const rv = ratingMap.get(p.id);
      const ratingCount = rv ? rv.count : 0;
      const avgRating = ratingCount > 0 ? rv!.sum / ratingCount : 0;
      const avgRatingUi = ratingCount > 0 ? rv!.sum_ui / ratingCount : 0;
      const avgRatingFunc = ratingCount > 0 ? rv!.sum_func / ratingCount : 0;
      const avgRatingConcept = ratingCount > 0 ? rv!.sum_concept / ratingCount : 0;
      const avgRatingBugs = ratingCount > 0 ? rv!.sum_bugs / ratingCount : 0;
      
      return { 
        ...p, avgRating, ratingCount, 
        avgRatingUi, avgRatingFunc, avgRatingConcept, avgRatingBugs 
      };
    });

    // Filter by tag
    if (data.tag) {
      result = result.filter((p: any) => Array.isArray(p.tags) && p.tags.includes(data.tag));
    }

    // Sort
    if (data.sort === "rating") {
      result.sort((a: any, b: any) => b.avgRating - a.avgRating);
    }

    return result;
  });

/** Fetch single project detail with avg rating. */
export const getProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [projectRes, ratingsRes] = await Promise.all([
      supabaseAdmin.from("projects" as any).select("*").eq("id", data.id).single() as any,
      supabaseAdmin
        .from("project_ratings" as any)
        .select("*")
        .eq("project_id", data.id)
        .order("created_at", { ascending: false }) as any,
    ]);

    if (projectRes.error) throw new Error(projectRes.error.message);

    const ratings = ratingsRes.data ?? [];
    const ratingCount = ratings.length;
    
    let avgRating = 0, avgRatingUi = 0, avgRatingFunc = 0, avgRatingConcept = 0, avgRatingBugs = 0;
    
    if (ratingCount > 0) {
      avgRating = ratings.reduce((s: number, r: any) => s + (r.rating || 0), 0) / ratingCount;
      avgRatingUi = ratings.reduce((s: number, r: any) => s + (r.rating_ui || 0), 0) / ratingCount;
      avgRatingFunc = ratings.reduce((s: number, r: any) => s + (r.rating_functionality || 0), 0) / ratingCount;
      avgRatingConcept = ratings.reduce((s: number, r: any) => s + (r.rating_concept || 0), 0) / ratingCount;
      avgRatingBugs = ratings.reduce((s: number, r: any) => s + (r.rating_bugs || 0), 0) / ratingCount;
    }

    return { 
      project: projectRes.data, 
      ratings, 
      ratingCount,
      avgRating, 
      avgRatingUi, 
      avgRatingFunc, 
      avgRatingConcept, 
      avgRatingBugs
    };
  });

/** Create a new project (ghost identity required). */
export const createProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40),
        title: z.string().min(2).max(120),
        description: z.string().max(5000).optional(),
        imageUrl: z.string().url().optional(),
        tags: z.array(z.string()).max(6).optional(),
        githubUrl: z.string().url().optional().or(z.literal("")),
        liveUrl: z.string().url().optional().or(z.literal("")),
        lookingForCollaborators: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: project, error } = await (supabaseAdmin
      .from("projects" as any)
      .insert({
        owner_ghost_id: data.hashedId,
        owner_username: data.username,
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        image_url: data.imageUrl ?? null,
        tags: data.tags ?? [],
        github_url: data.githubUrl || null,
        live_url: data.liveUrl || null,
        looking_for_collaborators: data.lookingForCollaborators,
      })
      .select("id")
      .single() as any);

    if (error) throw new Error(error.message);
    return { ok: true as const, id: project.id };
  });

/** Update an existing project (owner only). */
export const updateProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        hashedId: z.string().min(8),
        title: z.string().min(2).max(120),
        description: z.string().max(5000).optional(),
        imageUrl: z.string().url().optional().or(z.literal("")),
        tags: z.array(z.string()).max(6).optional(),
        githubUrl: z.string().url().optional().or(z.literal("")),
        liveUrl: z.string().url().optional().or(z.literal("")),
        lookingForCollaborators: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify ownership
    const { data: existing } = await (supabaseAdmin
      .from("projects" as any)
      .select("owner_ghost_id")
      .eq("id", data.id)
      .single() as any);
    if (!existing || existing.owner_ghost_id !== data.hashedId) {
      throw new Error("Not authorized to edit this project.");
    }

    const { error } = await supabaseAdmin
      .from("projects" as any)
      .update({
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        image_url: data.imageUrl || null,
        tags: data.tags ?? [],
        github_url: data.githubUrl || null,
        live_url: data.liveUrl || null,
        looking_for_collaborators: data.lookingForCollaborators,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Delete a project (owner only). Also removes ratings + collab requests via cascade. */
export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), hashedId: z.string().min(8) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify ownership
    const { data: existing } = await (supabaseAdmin
      .from("projects" as any)
      .select("owner_ghost_id")
      .eq("id", data.id)
      .single() as any);
    if (!existing || existing.owner_ghost_id !== data.hashedId) {
      throw new Error("Not authorized to delete this project.");
    }

    const { error } = await supabaseAdmin
      .from("projects" as any)
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });


export const rateProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        hashedId: z.string().min(8),
        username: z.string().min(3).max(40),
        rating: z.number().int().min(1).max(5),
        ratingUi: z.number().int().min(1).max(5).optional(),
        ratingFunc: z.number().int().min(1).max(5).optional(),
        ratingConcept: z.number().int().min(1).max(5).optional(),
        ratingBugs: z.number().int().min(1).max(5).optional(),
        comment: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("project_ratings" as any)
      .upsert(
        {
          project_id: data.projectId,
          rater_ghost_id: data.hashedId,
          rater_username: data.username,
          rating: data.rating,
          rating_ui: data.ratingUi,
          rating_functionality: data.ratingFunc,
          rating_concept: data.ratingConcept,
          rating_bugs: data.ratingBugs,
          comment: data.comment?.trim() ?? null,
        },
        { onConflict: "project_id,rater_ghost_id" },
      );

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Send a collaborate request. Notifies the project owner. */
export const requestCollaborate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        projectTitle: z.string().min(1),
        ownerGhostId: z.string().min(8),
        ownerUsername: z.string().min(3).max(40),
        senderGhostId: z.string().min(8),
        senderUsername: z.string().min(3).max(40),
        message: z.string().max(200).optional(),
        skills: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check for existing pending request from this user
    const { data: existing } = await (supabaseAdmin
      .from("collaborate_requests" as any)
      .select("id")
      .eq("project_id", data.projectId)
      .eq("sender_ghost_id", data.senderGhostId)
      .eq("status", "pending")
      .maybeSingle() as any);

    if (existing) throw new Error("You already have a pending request for this project.");

    const { error } = await supabaseAdmin.from("collaborate_requests" as any).insert({
      project_id: data.projectId,
      project_title: data.projectTitle,
      sender_ghost_id: data.senderGhostId,
      sender_username: data.senderUsername,
      owner_ghost_id: data.ownerGhostId,
      owner_username: data.ownerUsername,
      message: data.message?.trim() ?? null,
      skills: data.skills?.trim() ?? null,
      status: "pending",
    });

    if (error) throw new Error(error.message);

    // Notify the project owner (in-app)
    try {
      await supabaseAdmin.rpc("enqueue_notifications" as any, {
        _hashes: [data.ownerGhostId],
        _type: "collaborate",
        _title: "New Collaboration Request",
        _message: `Someone wants to collaborate on your project "${data.projectTitle}"! Click to review.`,
        _link: `/projects/${data.projectId}`,
      });
    } catch {
      // Best-effort: don't fail the request if notification fails
    }

    return { ok: true as const };
  });

/** Owner-scoped: list collaborate requests for a specific project they own. */
export const listProjectCollabRequests = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        ownerGhostId: z.string().min(8),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify ownership
    const { data: project } = await (supabaseAdmin
      .from("projects" as any)
      .select("owner_ghost_id")
      .eq("id", data.projectId)
      .single() as any);

    if (!project || project.owner_ghost_id !== data.ownerGhostId) {
      throw new Error("Unauthorized");
    }

    const { data: requests, error } = await (supabaseAdmin
      .from("collaborate_requests" as any)
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false }) as any);

    if (error) throw new Error(error.message);
    return requests ?? [];
  });

/** Owner-scoped: accept or reject a collaborate request for a project they own. */
export const updateProjectCollabRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        ownerGhostId: z.string().min(8),
        action: z.enum(["accepted", "rejected"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch request and verify owner ownership
    const { data: req, error: fetchErr } = await (supabaseAdmin
      .from("collaborate_requests" as any)
      .select("*")
      .eq("id", data.requestId)
      .single() as any);

    if (fetchErr || !req) throw new Error("Request not found");
    if (req.owner_ghost_id !== data.ownerGhostId) throw new Error("Unauthorized");

    // Update status
    const { error } = await supabaseAdmin
      .from("collaborate_requests" as any)
      .update({ status: data.action })
      .eq("id", data.requestId);

    if (error) throw new Error(error.message);

    if (data.action === "accepted") {
      // Auto-open DM
      try {
        await supabaseAdmin.from("direct_messages" as any).insert({
          sender_username: req.owner_username,
          recipient_username: req.sender_username,
          sender_hash: req.owner_ghost_id,
          recipient_hash: req.sender_ghost_id,
          content: `Hi! I accepted your collaboration request for "${req.project_title}". Let's talk!`,
        });
      } catch {
        // Best-effort
      }

      // Notify the sender
      try {
        await supabaseAdmin.rpc("enqueue_notifications" as any, {
          _hashes: [req.sender_ghost_id],
          _type: "collaborate",
          _title: "Collaboration Request Accepted! 🎉",
          _message: `Your collaboration request for "${req.project_title}" was accepted! Check your messages 💬`,
          _link: `/messages?to=${encodeURIComponent(req.owner_username)}`,
        });
      } catch {
        // Best-effort
      }
    }

    return { ok: true as const };
  });

/** Admin: list all collaborate requests (optionally filtered by status). */
export const adminListCollabRequests = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(1),
        status: z.enum(["pending", "accepted", "rejected", "all"]).default("pending"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("collaborate_requests" as any)
      .select("*")
      .order("created_at", { ascending: false }) as any;

    if (data.status !== "all") {
      q = q.eq("status", data.status);
    }

    const { data: requests, error } = await q;
    if (error) throw new Error(error.message);
    return requests ?? [];
  });

/** Admin: accept or reject a collaborate request. On accept: auto-DM + notify sender. */
export const adminUpdateCollabRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(1),
        requestId: z.string().uuid(),
        action: z.enum(["accepted", "rejected"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch the request first
    const { data: req, error: fetchErr } = await (supabaseAdmin
      .from("collaborate_requests" as any)
      .select("*")
      .eq("id", data.requestId)
      .single() as any);

    if (fetchErr || !req) throw new Error("Request not found");

    // Update status
    const { error } = await supabaseAdmin
      .from("collaborate_requests" as any)
      .update({ status: data.action })
      .eq("id", data.requestId);

    if (error) throw new Error(error.message);

    if (data.action === "accepted") {
      // Auto-open DM: admin sends a DM from owner to sender
      try {
        await supabaseAdmin.from("direct_messages" as any).insert({
          sender_username: req.owner_username,
          recipient_username: req.sender_username,
          sender_hash: req.owner_ghost_id,
          recipient_hash: req.sender_ghost_id,
          content: `Hi! I accepted your collaboration request for "${req.project_title}". Let's talk!`,
        });
      } catch {
        // Best-effort
      }

      // Notify the sender
      try {
        await supabaseAdmin.rpc("enqueue_notifications" as any, {
          _hashes: [req.sender_ghost_id],
          _type: "collaborate",
          _title: "Collaboration Request Accepted! 🎉",
          _message: `Your collaboration request for "${req.project_title}" was accepted! Check your messages 💬`,
          _link: `/messages?to=${encodeURIComponent(req.owner_username)}`,
        });
      } catch {
        // Best-effort
      }
    }

    return { ok: true as const };
  });
