import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Ad = {
  id: string;
  title: string;
  kind: "banner" | "video" | string;
  body: string | null;
  link_url: string | null;
  media_url: string | null;
  embed_url: string | null;
  cta_label: string | null;
  show_home: boolean;
  show_global: boolean;
  show_college: boolean;
  active: boolean;
  sort_order: number;
};

type Placement = "home" | "global" | "college";

const COLS: Record<Placement, string> = {
  home: "show_home",
  global: "show_global",
  college: "show_college",
};

/**
 * Fetches active ads for a placement, but only when the global ads master
 * switch (app_settings.ads_enabled) is turned on by the admin.
 */
export function useAds(placement: Placement): Ad[] {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const { data: setting } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "ads_enabled")
        .maybeSingle();
      const enabled = (setting as any)?.value === true;
      if (!enabled) {
        if (alive) setAds([]);
        return;
      }
      const { data } = await supabase
        .from("ads" as any)
        .select("*")
        .eq("active", true)
        .eq(COLS[placement], true)
        .order("sort_order", { ascending: true });
      if (alive) setAds(((data as any[]) ?? []) as Ad[]);
    };

    load();

    const ch = supabase
      .channel(`ads-${placement}-${Math.random().toString(36).substring(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ads" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, load)
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [placement]);

  return ads;
}
