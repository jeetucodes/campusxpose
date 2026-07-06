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
    return confessions || [];
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
    
    return confession;
  });

export const toggleLikeConfession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    return z.object({
      id: z.string().uuid(),
      action: z.enum(["like", "unlike"]),
    }).parse(d);
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: confession } = await supabaseAdmin
      .from("confessions" as any)
      .select("likes")
      .eq("id", data.id)
      .single();
    if (!confession) throw new Error("Not found");
    const change = data.action === "unlike" ? -1 : 1;
    await supabaseAdmin
      .from("confessions" as any)
      .update({ likes: Math.max(0, ((confession as any).likes || 0) + change) })
      .eq("id", data.id);
    return { ok: true };
  });

