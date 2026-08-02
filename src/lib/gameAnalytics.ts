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

export async function recordGameSession(gameId: "arrow-puzzle" | "pipe-connect" | "2048" | "memory-match", achievedScore: number = 0, levelReached: number = 1) {
  try {
    const identity = await loadOrCreateIdentity();
    const username = identity?.username || "Campus Gamer";
    const college = localStorage.getItem("cx_selected_college") || localStorage.getItem("selected_college_name") || "Campus Student";
    const uid = identity?.uid || `user_${Date.now()}`;

    const analytics = getGameAnalytics();

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

    const existingPlayer = analytics.players[uid] || {
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
    existingPlayer.totalGamesPlayed += 1;
    existingPlayer.arrowLevel = Math.max(existingPlayer.arrowLevel, arrowLvl);
    existingPlayer.pipeLevel = Math.max(existingPlayer.pipeLevel, pipeLvl);
    existingPlayer.best2048 = Math.max(existingPlayer.best2048, h2048);
    if (memBest > 0) {
      existingPlayer.memoryBest = existingPlayer.memoryBest === 0 ? memBest : Math.min(existingPlayer.memoryBest, memBest);
    }
    existingPlayer.totalScore = (existingPlayer.arrowLevel * 150) + (existingPlayer.pipeLevel * 100) + existingPlayer.best2048;

    analytics.players[uid] = existingPlayer;

    // Save analytics
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analytics));

    // Save strictly real user to Leaderboard (NO FAKE DATA)
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

    // Dispatch real-time update event
    window.dispatchEvent(new Event("cx_game_played_event"));
  } catch (e) {
    console.warn("Error recording game session", e);
  }
}
