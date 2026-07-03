import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

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
};

export const getHomeData = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeData> => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [colleges, posts, incidents, allColleges, postRows, incidentRows, recent, users] =
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
    };
  },
);
