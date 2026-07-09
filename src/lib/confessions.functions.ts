import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getConfessions = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: confessions, error } = await supabaseAdmin
      .from("confessions" as any)
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) throw error;

    // Get like counts from confession_likes table
    const { data: likeCounts } = await supabaseAdmin
      .from("confession_likes" as any)
      .select("confession_id");

    // Aggregate like counts per confession
    const likeMap: Record<string, number> = {};
    if (likeCounts) {
      for (const row of likeCounts as any[]) {
        likeMap[row.confession_id] = (likeMap[row.confession_id] || 0) + 1;
      }
    }

    return (confessions || []).map((c: any) => ({
      ...c,
      likes: likeMap[c.id] || 0,
    }));
  });

export const addConfession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    return z.object({ 
      content: z.string().min(1).max(1000),
      username: z.string().optional()
    }).parse(d);
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: confession, error } = await supabaseAdmin
      .from("confessions" as any)
      .insert({
        content: data.content,
        username: data.username || "Anonymous"
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return { ...confession, likes: 0 };
  });

export const toggleLikeConfession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    return z.object({
      id: z.string().uuid(),
      device_id: z.string().min(1).max(128),
      action: z.enum(["like", "unlike"]),
    }).parse(d);
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.action === "like") {
      // Insert row — ignore if already exists (idempotent)
      await supabaseAdmin
        .from("confession_likes" as any)
        .upsert({ confession_id: data.id, device_id: data.device_id }, { onConflict: "confession_id,device_id" });
    } else {
      // Delete the like row
      await supabaseAdmin
        .from("confession_likes" as any)
        .delete()
        .eq("confession_id", data.id)
        .eq("device_id", data.device_id);
    }

    // Return the authoritative like count from DB
    const { count } = await supabaseAdmin
      .from("confession_likes" as any)
      .select("*", { count: "exact", head: true })
      .eq("confession_id", data.id);

    return { ok: true, likes: count ?? 0 };
  });

export const getMyLikedConfessions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    return z.object({ device_id: z.string().min(1).max(128) }).parse(d);
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("confession_likes" as any)
      .select("confession_id")
      .eq("device_id", data.device_id);

    return (rows || []).map((r: any) => r.confession_id as string);
  });
