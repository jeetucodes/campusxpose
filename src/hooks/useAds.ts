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
  show_games?: boolean;
  active: boolean;
  sort_order: number;
  timer_seconds?: number;
};

type Placement = "home" | "global" | "college" | "games";

const COLS: Record<Placement, string> = {
  home: "show_home",
  global: "show_global",
  college: "show_college",
  games: "show_games",
};

/**
 * Fetches active ads for a placement, but only when the global ads master
 * switch (app_settings.ads_enabled) is turned on by the admin.
 * Automatically attaches timer_seconds from app_settings.
 */
export function useAds(placement: Placement): Ad[] {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        // Fetch timers & map settings
        const [globalTimerRes, timersMapRes] = await Promise.all([
          supabase
            .from("app_settings" as any)
            .select("value")
            .eq("key", "ad_timer_seconds")
            .maybeSingle(),
          supabase
            .from("app_settings" as any)
            .select("value")
            .eq("key", "cx_ad_timers_map")
            .maybeSingle(),
        ]);

        const globalTimer = Number((globalTimerRes.data as any)?.value) || 3;
        const timersMap: Record<string, number> = (timersMapRes.data as any)?.value || {};

        const applyTimers = (adList: Ad[]): Ad[] => {
          return adList.map((ad) => ({
            ...ad,
            timer_seconds: timersMap[ad.id] ?? globalTimer,
          }));
        };

        if (placement === "games") {
          const { data: rawAds } = await supabase
            .from("ads" as any)
            .select("*")
            .eq("active", true)
            .order("sort_order", { ascending: true });

          const activeAds = ((rawAds as any[]) ?? []) as Ad[];

          const { data: gamesMapSetting } = await supabase
            .from("app_settings" as any)
            .select("value")
            .eq("key", "cx_games_ad_map")
            .maybeSingle();

          const gamesMap: Record<string, boolean> = (gamesMapSetting as any)?.value || {};
          const taggedGamesAds = activeAds.filter((ad) => !!gamesMap[ad.id]);
          const resultAds = taggedGamesAds.length > 0 ? taggedGamesAds : activeAds;

          if (alive) setAds(applyTimers(resultAds));
          return;
        }

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

        if (alive) setAds(applyTimers(((data as any[]) ?? []) as Ad[]));
      } catch (e) {
        console.warn("Error fetching ads", e);
        if (alive) setAds([]);
      }
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
