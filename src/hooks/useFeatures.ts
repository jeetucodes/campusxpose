import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFeatures() {
  const [projectsEnabled, setProjectsEnabled] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const { data: setting } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "projects_enabled")
        .maybeSingle();
      if (alive) {
        setProjectsEnabled((setting as any)?.value === true);
      }
    };

    load();

    const ch = supabase
      .channel(`app-features-${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.projects_enabled" },
        load
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return { projectsEnabled };
}
