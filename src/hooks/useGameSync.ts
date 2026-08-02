import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GAMES_STATUS_KEY = "cx_games_status";

/**
 * Syncs the game status and custom levels from Supabase app_settings to localStorage.
 * This ensures the game always loads the globally synced settings without breaking
 * the existing synchronous localStorage logic in the game components.
 */
export function useGameSync(gameId: string, customLevelsKey: string, levelOverridesKey?: string) {
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    let alive = true;
    
    const sync = async () => {
      try {
        const keysToFetch = [GAMES_STATUS_KEY, customLevelsKey];
        if (levelOverridesKey) keysToFetch.push(levelOverridesKey);

        const { data, error } = await supabase
          .from("app_settings" as any)
          .select("key, value")
          .in("key", keysToFetch);

        if (!alive || error) return;

        let statusChanged = false;
        let levelsChanged = false;

        const map = new Map((data || []).map((row: any) => [row.key, row.value]));

        // Sync Game Status
        const serverStatus = map.get(GAMES_STATUS_KEY);
        if (serverStatus !== undefined) {
          const localStatus = localStorage.getItem(GAMES_STATUS_KEY);
          const serverStr = JSON.stringify(serverStatus);
          if (localStatus !== serverStr) {
            localStorage.setItem(GAMES_STATUS_KEY, serverStr);
            statusChanged = true;
          }
        }

        // Sync Custom Levels
        const serverLevels = map.get(customLevelsKey);
        if (serverLevels !== undefined) {
          const localLevels = localStorage.getItem(customLevelsKey);
          const serverStr = JSON.stringify(serverLevels);
          if (localLevels !== serverStr) {
            localStorage.setItem(customLevelsKey, serverStr);
            levelsChanged = true;
          }
        }
        
        // Sync Level Overrides
        if (levelOverridesKey) {
           const serverOverrides = map.get(levelOverridesKey);
           if (serverOverrides !== undefined) {
             const localOverrides = localStorage.getItem(levelOverridesKey);
             const serverStr = JSON.stringify(serverOverrides);
             if (localOverrides !== serverStr) {
               localStorage.setItem(levelOverridesKey, serverStr);
               levelsChanged = true; // reusing levelsChanged since it triggers level reload
             }
           }
        }

        if (statusChanged) {
          window.dispatchEvent(new Event("cx_games_status_change"));
        }
        if (levelsChanged) {
          window.dispatchEvent(new Event("cx_custom_levels_change"));
        }

        setSyncComplete(true);
      } catch (err) {
        console.error("Failed to sync game state from Supabase", err);
        setSyncComplete(true);
      }
    };

    sync();

    // Optionally set up a subscription for real-time updates
    const channel = supabase.channel(`game-sync-${gameId}-${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload) => {
          const changedKey = (payload.new as any)?.key;
          if (changedKey === GAMES_STATUS_KEY || changedKey === customLevelsKey || changedKey === levelOverridesKey) {
            sync();
          }
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [gameId, customLevelsKey, levelOverridesKey]);

  return { syncComplete };
}
