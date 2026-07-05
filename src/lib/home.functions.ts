import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type HomeData = {
  collegeCount: number;
  postCount: number;
  incidentCount: number;
  userCount: number;
  top: Array<{
    id: string;
    name: string;
    city: string | null;
    incident_count: number | null;
    total_rating: number | null;
  }>;
  recentPosts: Array<{
    id: string;
    username: string | null;
    content: string | null;
    category: string | null;
    created_at: string | null;
    college_id: string | null;
    college_name: string | null;
    upvotes: number | null;
  }>;
  news: Array<{
    id: string;
    text: string;
    link_url: string | null;
    image_url: string | null;
    created_at: string;
    upvotes: number;
    comment_count: number;
  }>;
  site_settings?: {
    news_enabled: boolean;
  };
};

export const getHomeData = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeData> => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [colleges, posts, incidents, allColleges, postRows, incidentRows, recent, users, newsRows, siteSettingsRows] =
      await Promise.all([
        supabase.from("colleges").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("incidents").select("*", { count: "exact", head: true }),
        supabase.from("colleges").select("id, name, city, total_rating"),
        supabase.from("posts").select("college_id"),
        supabase.from("incidents").select("college_id"),
        supabase
          .from("posts")
          .select("id, username, content, category, created_at, college_id, upvotes")
          .order("upvotes", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(12),
        supabaseAdmin.from("anon_users" as any).select("*", { count: "exact", head: true }),
        supabase.from("news" as any).select("id, text, link_url, image_url, created_at, upvotes, comment_count").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("site_settings" as any).select("*").eq("id", 1).single(),
      ]);

    // Live report counts per college (posts + incidents).
    const counts = new Map<string, number>();
    for (const r of [...(postRows.data ?? []), ...(incidentRows.data ?? [])]) {
      const cid = (r as { college_id: string | null }).college_id;
      if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1);
    }

    const collegeNames = new Map<string, string>();
    for (const c of allColleges.data ?? []) {
      collegeNames.set(c.id as string, c.name as string);
    }

    const top = (allColleges.data ?? [])
      .map((c) => ({
        id: c.id as string,
        name: c.name as string,
        city: (c.city ?? null) as string | null,
        total_rating: (c.total_rating ?? null) as number | null,
        incident_count: counts.get(c.id as string) ?? 0,
      }))
      .sort((a, b) => b.incident_count - a.incident_count)
      .slice(0, 5);

    return {
      collegeCount: colleges.count ?? 0,
      postCount: posts.count ?? 0,
      incidentCount: incidents.count ?? 0,
      userCount: users.count ?? 0,
      top,
      recentPosts: (recent.data ?? []).map((p) => ({
        id: p.id as string,
        username: (p.username ?? null) as string | null,
        content: (p.content ?? null) as string | null,
        category: (p.category ?? null) as string | null,
        created_at: (p.created_at ?? null) as string | null,
        college_id: (p.college_id ?? null) as string | null,
        college_name: collegeNames.get(p.college_id as string) ?? null,
        upvotes: (p.upvotes ?? 0) as number | null,
      })),
      news: (newsRows.data ?? []).map((n) => ({
        id: n.id,
        text: n.text,
        link_url: n.link_url,
        image_url: n.image_url,
        created_at: n.created_at,
        upvotes: n.upvotes || 0,
        comment_count: n.comment_count || 0,
      })),
      site_settings: siteSettingsRows?.data ? { news_enabled: siteSettingsRows.data.news_enabled } : { news_enabled: true },
    };
  },
);

export const toggleLikeNewsItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    return (d as { id: string, action: string }).id ? { id: (d as { id: string, action: string }).id, action: (d as { action: string }).action } : { id: "", action: "like" };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Get current
    const { data: news } = await supabaseAdmin.from("news" as any).select("upvotes").eq("id", data.id).single();
    if (!news) throw new Error("Not found");
    
    // Update
    const change = data.action === "unlike" ? -1 : 1;
    await supabaseAdmin.from("news" as any).update({ upvotes: Math.max(0, ((news as any).upvotes || 0) + change) }).eq("id", data.id);
    return { ok: true };
  });

export const getNewsComments = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    return (d as { newsId: string }).newsId ? { newsId: (d as { newsId: string }).newsId } : { newsId: "" };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: comments, error } = await supabaseAdmin
      .from("news_comments" as any)
      .select("*")
      .eq("news_id", data.newsId)
      .order("created_at", { ascending: true });
      
    if (error) throw error;
    return comments || [];
  });

export const addNewsComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    return z.object({ 
      newsId: z.string(), 
      username: z.string().nullable().optional(), 
      content: z.string().min(1).max(500) 
    }).parse(d);
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: comment, error } = await supabaseAdmin
      .from("news_comments" as any)
      .insert({
        news_id: data.newsId,
        username: data.username || "Anonymous",
        content: data.content,
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // Increment counter
    const { data: news } = await supabaseAdmin.from("news" as any).select("comment_count").eq("id", data.newsId).single();
    if (news) {
      await supabaseAdmin.from("news" as any).update({ comment_count: ((news as any).comment_count || 0) + 1 }).eq("id", data.newsId);
    }
    
    return comment;
  });
