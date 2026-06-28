import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type HomeData = {
  collegeCount: number;
  postCount: number;
  top: Array<{
    id: string;
    name: string;
    city: string | null;
    incident_count: number | null;
    total_rating: number | null;
  }>;
};

export const getHomeData = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeData> => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );

    const [colleges, posts, top] = await Promise.all([
      supabase.from("colleges").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase
        .from("colleges")
        .select("id, name, city, incident_count, total_rating")
        .order("incident_count", { ascending: false })
        .limit(5),
    ]);

    return {
      collegeCount: colleges.count ?? 0,
      postCount: posts.count ?? 0,
      top: top.data ?? [],
    };
  },
);
