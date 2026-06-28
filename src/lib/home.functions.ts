import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type HomeData = {
  collegeCount: number;
  postCount: number;
  incidentCount: number;
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
  }>;
};

export const getHomeData = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeData> => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );

    const [colleges, posts, incidents, top, recent] = await Promise.all([
      supabase.from("colleges").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("incidents").select("*", { count: "exact", head: true }),
      supabase
        .from("colleges")
        .select("id, name, city, incident_count, total_rating")
        .order("incident_count", { ascending: false })
        .limit(5),
      supabase
        .from("posts")
        .select("id, username, content, category, created_at, college_id")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    return {
      collegeCount: colleges.count ?? 0,
      postCount: posts.count ?? 0,
      incidentCount: incidents.count ?? 0,
      top: top.data ?? [],
      recentPosts: recent.data ?? [],
    };
  },
);
