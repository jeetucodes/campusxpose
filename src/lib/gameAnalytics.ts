import { supabase } from "@/integrations/supabase/client";
import { loadOrCreateIdentity } from "./identity";

export interface RealPlayerRecord {
  uid: string;
  username: string;
  college: string;
  arrowLevel: number;
  pipeLevel: number;
  best2048: number;
  memoryBest: number;
  totalScore: number;
  lastPlayedGame: string;
  lastPlayedTime: number;
  totalGamesPlayed: number;
}

export interface GameAnalytics {
  totalPlays: number;
  gamePlayCounts: {
    "arrow-puzzle": number;
    "pipe-connect": number;
    "2048": number;
    "memory-match": number;
  };
  players: Record<string, RealPlayerRecord>;
}

const ANALYTICS_STORAGE_KEY = "cx_campus_games_analytics";
const LEADERBOARD_STORAGE_KEY = "cx_campus_game_leaderboard";
const SUPABASE_ANALYTICS_KEY = "global_arcade_analytics";

export function getGameAnalytics(): GameAnalytics {
  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Analytics storage load error", e);
  }

  return {
    totalPlays: 0,
    gamePlayCounts: {
      "arrow-puzzle": 0,
      "pipe-connect": 0,
      "2048": 0,
      "memory-match": 0,
    },
    players: {},
  };
}

function mergeAnalytics(local: GameAnalytics, remote: GameAnalytics): GameAnalytics {
  const mergedPlayers: Record<string, RealPlayerRecord> = { ...remote.players };

  Object.values(local.players || {}).forEach(localP => {
    const remoteP = mergedPlayers[localP.uid];
    if (!remoteP || localP.lastPlayedTime > remoteP.lastPlayedTime) {
      mergedPlayers[localP.uid] = localP;
    }
  });

  const mergedCounts = {
    "arrow-puzzle": Math.max(local.gamePlayCounts?.["arrow-puzzle"] || 0, remote.gamePlayCounts?.["arrow-puzzle"] || 0),
    "pipe-connect": Math.max(local.gamePlayCounts?.["pipe-connect"] || 0, remote.gamePlayCounts?.["pipe-connect"] || 0),
    "2048": Math.max(local.gamePlayCounts?.["2048"] || 0, remote.gamePlayCounts?.["2048"] || 0),
    "memory-match": Math.max(local.gamePlayCounts?.["memory-match"] || 0, remote.gamePlayCounts?.["memory-match"] || 0),
  };

  const totalPlays = Math.max(local.totalPlays || 0, remote.totalPlays || 0);

  return {
    totalPlays,
    gamePlayCounts: mergedCounts,
    players: mergedPlayers,
  };
}

// Fetch global game analytics & leaderboard from Supabase
export async function fetchGlobalAnalyticsFromSupabase(): Promise<GameAnalytics | null> {
  try {
    const { data, error } = await (supabase as any)
      .from("app_settings")
      .select("value")
      .eq("key", SUPABASE_ANALYTICS_KEY)
      .maybeSingle();

    if (error) {
      console.warn("Supabase analytics fetch error", error);
      return null;
    }

    if (data && data.value) {
      const globalData = data.value as GameAnalytics;
      const localData = getGameAnalytics();
      const mergedAnalytics = mergeAnalytics(localData, globalData);
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(mergedAnalytics));
      return mergedAnalytics;
    }
  } catch (e) {
    console.warn("Supabase fetch exception", e);
  }
  return null;
}

export async function recordGameSession(
  gameId: "arrow-puzzle" | "pipe-connect" | "2048" | "memory-match",
  achievedScore: number = 0,
  levelReached: number = 1
) {
  try {
    const identity = await loadOrCreateIdentity();
    const username = identity?.username || "Campus Gamer";
    const college = localStorage.getItem("cx_selected_college") || localStorage.getItem("selected_college_name") || "Campus Student";
    const uid = identity?.uid || `user_${Date.now()}`;

    // First fetch latest from remote if available
    let analytics = getGameAnalytics();
    try {
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("value")
        .eq("key", SUPABASE_ANALYTICS_KEY)
        .maybeSingle();

      if (data && data.value) {
        analytics = mergeAnalytics(analytics, data.value as GameAnalytics);
      }
    } catch (e) {}

    // Increment play counts
    analytics.totalPlays = (analytics.totalPlays || 0) + 1;
    if (!analytics.gamePlayCounts) {
      analytics.gamePlayCounts = { "arrow-puzzle": 0, "pipe-connect": 0, "2048": 0, "memory-match": 0 };
    }
    analytics.gamePlayCounts[gameId] = (analytics.gamePlayCounts[gameId] || 0) + 1;

    // Load user current level records
    const arrowLvl = parseInt(localStorage.getItem("cx_arrow_level") || "0", 10) + 1;
    const pipeLvl = parseInt(localStorage.getItem("cx_pipe_level") || "0", 10) + 1;
    const h2048 = parseInt(localStorage.getItem("cx_2048_highscore") || "0", 10);
    const memBest = parseInt(localStorage.getItem("cx_memory_best") || "0", 10);

    const calcTotalScore = (arrowLvl * 150) + (pipeLvl * 100) + h2048;

    const existingPlayer: RealPlayerRecord = analytics.players[uid] || {
      uid,
      username: `@${username}`,
      college,
      arrowLevel: arrowLvl,
      pipeLevel: pipeLvl,
      best2048: h2048,
      memoryBest: memBest,
      totalScore: calcTotalScore,
      lastPlayedGame: gameId,
      lastPlayedTime: Date.now(),
      totalGamesPlayed: 0,
    };

    existingPlayer.username = `@${username}`;
    existingPlayer.college = college;
    existingPlayer.lastPlayedGame = gameId;
    existingPlayer.lastPlayedTime = Date.now();
    existingPlayer.totalGamesPlayed = (existingPlayer.totalGamesPlayed || 0) + 1;
    existingPlayer.arrowLevel = Math.max(existingPlayer.arrowLevel || 0, arrowLvl);
    existingPlayer.pipeLevel = Math.max(existingPlayer.pipeLevel || 0, pipeLvl);
    existingPlayer.best2048 = Math.max(existingPlayer.best2048 || 0, h2048);
    if (memBest > 0) {
      existingPlayer.memoryBest = existingPlayer.memoryBest === 0 ? memBest : Math.min(existingPlayer.memoryBest, memBest);
    }
    existingPlayer.totalScore = (existingPlayer.arrowLevel * 150) + (existingPlayer.pipeLevel * 100) + existingPlayer.best2048;

    analytics.players[uid] = existingPlayer;

    // Save locally
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analytics));

    // Save strictly real user to Leaderboard
    const realPlayersList = Object.values(analytics.players).map(p => ({
      id: p.uid,
      name: p.username,
      college: p.college,
      score: p.totalScore,
      arrowLevel: p.arrowLevel,
      best2048: p.best2048,
      badge: p.totalScore > 2000 ? "👑 Grandmaster" : p.totalScore > 1000 ? "⚡ Logic Wizard" : p.totalScore > 400 ? "🏹 Arrow Pioneer" : "🚀 Active Player",
      updatedAt: p.lastPlayedTime,
      isCurrentUser: p.uid === uid,
    }));

    realPlayersList.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(realPlayersList));

    // Upsert to Supabase for cross-device global sync!
    try {
      await (supabase as any).from("app_settings").upsert(
        {
          key: SUPABASE_ANALYTICS_KEY,
          value: analytics,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    } catch (e) {
      console.warn("Supabase upsert analytics error", e);
    }

    // Dispatch real-time update event
    window.dispatchEvent(new Event("cx_game_played_event"));
  } catch (e) {
    console.warn("Error recording game session", e);
  }
}

// Subscribe to Supabase Realtime changes for cross-device live updates
export function subscribeGlobalAnalytics(onUpdate: (analytics: GameAnalytics) => void) {
  fetchGlobalAnalyticsFromSupabase().then(data => {
    if (data) onUpdate(data);
  });

  const channel = (supabase as any)
    .channel("public:app_settings:global_arcade")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "app_settings",
        filter: `key=eq.${SUPABASE_ANALYTICS_KEY}`,
      },
      (payload: any) => {
        if (payload.new && payload.new.value) {
          const remoteAnalytics = payload.new.value as GameAnalytics;
          const localData = getGameAnalytics();
          const merged = mergeAnalytics(localData, remoteAnalytics);
          localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(merged));
          onUpdate(merged);
        }
      }
    )
    .subscribe();

  return () => {
    (supabase as any).removeChannel(channel);
  };
}
