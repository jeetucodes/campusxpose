import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, ArrowRight, Trophy, Sparkles, Play, X, Crown } from "lucide-react";
import { loadOrCreateIdentity } from "../lib/identity";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "Campus Games Hub — CampusXpose" },
      { name: "description", content: "Play fun casual mini-games, track your level progress and kill time on CampusXpose!" },
    ],
  }),
  component: GamesHub,
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";

type LeaderboardCategory = "overall" | "arrow" | "2048";

export interface LeaderboardPlayer {
  id: string;
  name: string;
  college: string;
  score: number;
  arrowLevel: number;
  best2048: number;
  badge: string;
  updatedAt: number;
  isCurrentUser?: boolean;
}

const LEADERBOARD_STORAGE_KEY = "cx_campus_game_leaderboard";

export default function GamesHub() {
  const [username, setUsername] = useState<string>("Campus Gamer");
  const [college, setCollege] = useState<string>("Campus Student");
  const [stats, setStats] = useState({
    arrowLevel: 0,
    pipeLevel: 0,
    best2048: 0,
    memoryBest: 0,
  });
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardPlayer[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "puzzle" | "arcade">("all");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lbCategory, setLbCategory] = useState<LeaderboardCategory>("overall");
  
  const [gameStatus, setGameStatus] = useState<Record<string, boolean>>({
    "arrow-puzzle": true,
    "pipe-connect": true,
    "2048": true,
    "memory-match": true,
  });

  const [arrowTotalLevels, setArrowTotalLevels] = useState<number>(100);
  const [pipeTotalLevels, setPipeTotalLevels] = useState<number>(30);

  // Real-time game status & level count listener
  useEffect(() => {
    const syncStatus = () => {
      try {
        const saved = localStorage.getItem("cx_games_status");
        if (saved) setGameStatus(JSON.parse(saved));

        const arrowCustom = localStorage.getItem("cx_arrow_custom_levels");
        const arrowExtra = arrowCustom ? JSON.parse(arrowCustom).length : 0;
        setArrowTotalLevels(100 + arrowExtra);

        const pipeCustom = localStorage.getItem("cx_pipe_custom_levels");
        const pipeExtra = pipeCustom ? JSON.parse(pipeCustom).length : 0;
        setPipeTotalLevels(30 + pipeExtra);
      } catch (e) {
        console.warn("Error reading game status", e);
      }
    };

    syncStatus();
    window.addEventListener("storage", syncStatus);
    window.addEventListener("cx_games_status_change", syncStatus);
    window.addEventListener("cx_custom_levels_change", syncStatus);

    return () => {
      window.removeEventListener("storage", syncStatus);
      window.removeEventListener("cx_games_status_change", syncStatus);
      window.removeEventListener("cx_custom_levels_change", syncStatus);
    };
  }, []);

  // Rotating featured game index (auto-changes every 4 seconds)
  const [featuredIndexOffset, setFeaturedIndexOffset] = useState<number>(0);

  // Auto-rotation timer for featured hero banner
  useEffect(() => {
    const timer = setInterval(() => {
      setFeaturedIndexOffset(prev => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadRealData() {
      try {
        const idObj = await loadOrCreateIdentity();
        const currentName = idObj?.username || "Campus Gamer";
        setUsername(currentName);

        const savedCollege = localStorage.getItem("cx_selected_college") || localStorage.getItem("selected_college_name") || "Campus Student";
        setCollege(savedCollege);

        const arrowLvl = parseInt(localStorage.getItem("cx_arrow_level") || "0", 10);
        const pipeLvl = parseInt(localStorage.getItem("cx_pipe_level") || "0", 10);
        const h2048 = parseInt(localStorage.getItem("cx_2048_highscore") || "0", 10);
        const memBest = parseInt(localStorage.getItem("cx_memory_best") || "0", 10);

        const realArrowLvl = isNaN(arrowLvl) ? 0 : arrowLvl + 1;
        const realPipeLvl = isNaN(pipeLvl) ? 0 : pipeLvl + 1;
        const realH2048 = isNaN(h2048) ? 0 : h2048;
        const realMemBest = isNaN(memBest) ? 0 : memBest;

        setStats({
          arrowLevel: realArrowLvl,
          pipeLevel: realPipeLvl,
          best2048: realH2048,
          memoryBest: realMemBest,
        });

        // Compute real player score
        const arrowPoints = realArrowLvl * 150;
        const pipePoints = realPipeLvl * 100;
        const totalPts = arrowPoints + pipePoints + realH2048;

        const getBadgeText = (pts: number, lvl: number) => {
          if (lvl > 20 || pts > 2000) return "👑 Grandmaster";
          if (lvl > 10 || pts > 1000) return "⚡ Logic Wizard";
          if (lvl > 3 || pts > 400) return "🏹 Arrow Pioneer";
          if (pts > 0) return "🚀 Active Player";
          return "🌱 Campus Rookie";
        };

        // Load existing real leaderboard entries from storage
        let storedPlayers: LeaderboardPlayer[] = [];
        try {
          const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
          if (raw) storedPlayers = JSON.parse(raw);
        } catch (e) {
          console.warn("Storage parse error", e);
        }

        // Upsert current user's real verified score
        const userRecord: LeaderboardPlayer = {
          id: idObj.uid || "user_local",
          name: `@${currentName}`,
          college: savedCollege,
          score: totalPts,
          arrowLevel: realArrowLvl,
          best2048: realH2048,
          badge: getBadgeText(totalPts, realArrowLvl),
          updatedAt: Date.now(),
          isCurrentUser: true,
        };

        const existingIdx = storedPlayers.findIndex(
          p => p.id === userRecord.id || p.name === userRecord.name
        );

        if (existingIdx >= 0) {
          storedPlayers[existingIdx] = { ...userRecord, isCurrentUser: true };
        } else {
          storedPlayers.push(userRecord);
        }

        // Mark current user flag properly
        storedPlayers = storedPlayers.map(p => ({
          ...p,
          isCurrentUser: p.id === userRecord.id || p.name === userRecord.name,
        }));

        // Sort descending by score
        storedPlayers.sort((a, b) => b.score - a.score);

        // Save back real updated store
        localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(storedPlayers));
        setLeaderboardList(storedPlayers);

      } catch (e) {
        console.warn("Error reading real user game stats", e);
      }
    }
    loadRealData();
  }, []);

  const currentUser = leaderboardList.find(p => p.isCurrentUser);
  const totalUserPoints = currentUser?.score || (stats.arrowLevel * 150) + (stats.pipeLevel * 100) + stats.best2048;
  const userRank = (leaderboardList.findIndex(p => p.isCurrentUser) >= 0 ? leaderboardList.findIndex(p => p.isCurrentUser) + 1 : 1);

  // Filter leaderboard based on tab
  const filteredLeaderboard = React.useMemo(() => {
    let list = [...leaderboardList];
    if (lbCategory === "arrow") {
      list.sort((a, b) => b.arrowLevel - a.arrowLevel);
    } else if (lbCategory === "2048") {
      list.sort((a, b) => b.best2048 - a.best2048);
    } else {
      list.sort((a, b) => b.score - a.score);
    }
    return list.slice(0, 5); // TOP 5 ONLY
  }, [leaderboardList, lbCategory]);

  const GAMES = [
    {
      id: "arrow-puzzle",
      title: "Arrow Puzzle",
      tagline: "Clear the board using deflector logic & strategy!",
      description: `${arrowTotalLevels} levels of deflector mirrors, ice corridors & explosive bombs! Tap arrows and clear the board.`,
      emoji: "🏹",
      bgGradient: "from-[#fef08a] via-[#fcd34d] to-[#fbbf24]",
      category: "puzzle",
      badge: "FEATURED",
      badgeBg: "bg-[#fef08a] text-black",
      color: "bg-[#fca5a5]",
      link: "/games/arrow-puzzle",
      statLabel: stats.arrowLevel > 1 ? `Lvl ${stats.arrowLevel} / ${arrowTotalLevels}` : `${arrowTotalLevels} Levels Available`,
      icon: "🎯",
    },
    {
      id: "pipe-connect",
      title: "Pipe Connect",
      tagline: "Wire up the circuit and power the node!",
      description: "Connect matching color power tubes and complete electrical circuit paths under time!",
      emoji: "⚡",
      bgGradient: "from-[#bfdbfe] via-[#60a5fa] to-[#3b82f6]",
      category: "puzzle",
      badge: "POPULAR",
      badgeBg: "bg-[#bfdbfe] text-black",
      color: "bg-[#93c5fd]",
      link: "/games/pipe-connect",
      statLabel: stats.pipeLevel > 1 ? `Lvl ${stats.pipeLevel} / ${pipeTotalLevels}` : `${pipeTotalLevels} Circuit Levels`,
      icon: "🔌",
    },
    {
      id: "2048",
      title: "2048 Classic",
      tagline: "Slide, merge matching tiles and beat your high score!",
      description: "Join matching number tiles together to reach the legendary 2048 tile and set new high scores!",
      emoji: "🧩",
      bgGradient: "from-[#fbcfe8] via-[#f472b6] to-[#ec4899]",
      category: "arcade",
      badge: "CLASSIC",
      badgeBg: "bg-[#fbcfe8] text-black",
      color: "bg-[#f472b6]",
      link: "/games/2048",
      statLabel: stats.best2048 > 0 ? `Best Score: ${stats.best2048}` : "Infinite Score Mode",
      icon: "⭐",
    },
    {
      id: "memory-match",
      title: "Memory Match",
      tagline: "Flip and match campus emoji cards under time!",
      description: "Test your focus & memory speed! Match all campus emoji card pairs before time runs out.",
      emoji: "🃏",
      bgGradient: "from-[#bbf7d0] via-[#4ade80] to-[#22c55e]",
      category: "arcade",
      badge: "FAST PACED",
      badgeBg: "bg-[#bbf7d0] text-black",
      color: "bg-[#86efac]",
      link: "/games/memory-match",
      statLabel: stats.memoryBest > 0 ? `Best Time: ${stats.memoryBest}s` : "Speed Brain Training",
      icon: "⏱️",
    },
  ];

  // ONLY INCLUDE ONLINE GAMES (Turned-OFF games are COMPLETELY HIDDEN)
  const activeOnlineGames = GAMES.filter(g => gameStatus[g.id] !== false);

  // Auto-rotating active featured game calculation (only from online games)
  const activeFeaturedGame = activeOnlineGames.length > 0
    ? activeOnlineGames[featuredIndexOffset % activeOnlineGames.length]
    : null;

  const filteredGames = activeOnlineGames.filter(
    g => selectedFilter === "all" || g.category === selectedFilter
  );

  return (
    <div className="min-h-screen bg-[#f4f4f5] pb-28 text-black font-sans select-none">
      {/* Sticky Header — Clean & Minimal */}
      <div className="sticky top-0 z-40 border-b-4 border-black bg-[#fef08a] py-3 shadow-sm">
        <div className="mx-auto max-w-2xl px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border-2 border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Gamepad2 className="h-6 w-6" strokeWidth={3} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight uppercase text-black leading-none">
                Campus Arcade
              </h1>
              <span className="text-[11px] font-black text-black/70 uppercase tracking-wider">
                Mini Games & Brain Puzzles
              </span>
            </div>
          </div>
          
          {/* Top Nav Leaderboard Trigger */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-yellow-100 px-3.5 py-1.5 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Trophy className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span>Leaderboard</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">

        {/* Dynamic Auto-Rotating Featured Hero Banner (Only Online Games) */}
        {activeFeaturedGame && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeaturedGame.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className={`relative overflow-hidden border-4 border-black bg-gradient-to-br ${activeFeaturedGame.bgGradient} p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 bg-white px-3 py-1 border-2 border-black rounded-full text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span>FEATURED GAME</span>
                  </div>

                  {/* Animated Carousel Progress Dots */}
                  <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 border-2 border-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    {activeOnlineGames.map((g, idx) => (
                      <div
                        key={g.id}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          idx === (featuredIndexOffset % activeOnlineGames.length) ? "w-5 bg-black" : "w-2 bg-black/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h2 className="font-display text-3xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                    {activeFeaturedGame.title} <span className="text-2xl">{activeFeaturedGame.emoji}</span>
                  </h2>
                  <p className="text-sm font-bold text-black/90 leading-relaxed max-w-md">
                    {activeFeaturedGame.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link to={activeFeaturedGame.link}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-black text-white px-5 py-2.5 font-display font-black text-sm uppercase tracking-wide border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex items-center gap-2 transition-transform cursor-pointer"
                      style={{ borderRadius: WOBBLY_SM }}
                    >
                      <Play className="h-4 w-4 fill-white" /> Play Now
                    </motion.button>
                  </Link>
                  
                  <div className="bg-white/90 border-2 border-black px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Trophy className="h-4 w-4 text-amber-600" />
                    <span>{activeFeaturedGame.statLabel}</span>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-2 opacity-15 text-9xl pointer-events-none select-none font-black">
                {activeFeaturedGame.emoji}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Filter Tabs */}
        {activeOnlineGames.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(["all", "puzzle", "arcade"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSelectedFilter(tab)}
                  className={`px-4 py-2 border-2 border-black font-display font-black text-xs uppercase tracking-wider transition-all outline-none cursor-pointer ${
                    selectedFilter === tab
                      ? "bg-black text-white shadow-[3px_3px_0px_0px_rgba(254,240,138,1)] scale-105"
                      : "bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  {tab === "all" ? "🎮 All Games" : tab === "puzzle" ? "🧠 Logic Puzzles" : "🕹️ Arcade"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Games Grid — ONLY ONLINE GAMES ARE RENDERED */}
        <div className="space-y-4 pt-1">
          {filteredGames.map((game, idx) => (
            <Link key={game.id} to={game.link} className="block outline-none">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`group relative flex items-center gap-4 border-4 border-black ${game.color} p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}
                style={{ borderRadius: WOBBLY_MD }}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-4 border-black bg-white text-3xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-6 transition-transform">
                  {game.emoji}
                </div>

                <div className="flex-1 space-y-1 text-left min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl font-black text-black uppercase tracking-tight truncate">
                      {game.title}
                    </h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 border-2 border-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${game.badgeBg}`}>
                      {game.badge}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-black/85 leading-snug line-clamp-1">
                    {game.tagline}
                  </p>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] font-black bg-white/90 border border-black px-2 py-0.5 rounded-md text-black/90 flex items-center gap-1">
                      <span>{game.icon}</span> {game.statLabel}
                    </span>
                  </div>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white border-4 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-110 group-hover:bg-black group-hover:text-white">
                  <ArrowRight className="h-6 w-6" strokeWidth={3.5} />
                </div>
              </motion.div>
            </Link>
          ))}

          {activeOnlineGames.length === 0 && (
            <div className="p-8 bg-white border-4 border-black rounded-3xl text-center space-y-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-5xl animate-bounce">🛠️</div>
              <h3 className="font-display text-2xl font-black uppercase text-black">Arcade Under Maintenance</h3>
              <p className="text-sm font-bold text-black/70">
                All campus mini-games are currently undergoing server upgrades by Campus Admin. Please check back shortly!
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ─── Real Dynamic Campus Leaderboard Modal Overlay ───────────────────────── */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
            onClick={() => setShowLeaderboard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 25 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white border-4 border-black p-5 flex flex-col max-h-[85vh] relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden text-black"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <button
                onClick={() => setShowLeaderboard(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-black border-2 border-black z-10 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>

              {/* Title & Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-[#fef08a] border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Trophy className="h-7 w-7 text-amber-500 fill-amber-500" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-black uppercase tracking-tight leading-none">
                    Top 5 Leaderboard
                  </h2>
                  <span className="text-xs font-bold text-black/70">
                    Live Real-Time Player Rankings 🏆
                  </span>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 mb-3 bg-gray-100 p-1 border-2 border-black rounded-xl">
                {(["overall", "arrow", "2048"] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setLbCategory(cat)}
                    className={`flex-1 py-1.5 font-display font-black text-xs uppercase rounded-lg border border-black transition-all ${
                      lbCategory === cat ? "bg-[#fef08a] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-white text-black/70 hover:bg-gray-200"
                    }`}
                  >
                    {cat === "overall" ? "Overall 🏆" : cat === "arrow" ? "Arrow 🏹" : "2048 🧩"}
                  </button>
                ))}
              </div>

              {/* User Live Score & Rank Summary Card */}
              <div className="p-3.5 bg-[#bfdbfe] border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white border-2 border-black flex items-center justify-center font-display font-black text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    #{userRank}
                  </div>
                  <div>
                    <div className="text-xs font-black text-black flex items-center gap-1">
                      <span>@{username}</span>
                      <span className="bg-black text-white text-[9px] px-1.5 py-0.2 rounded font-black uppercase">YOU</span>
                    </div>
                    <div className="text-[10px] font-bold text-black/70">
                      {college} • <span className="text-black font-black">{currentUser?.badge || "Active Player"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-black text-black leading-none">
                    {lbCategory === "overall" ? `${totalUserPoints} Pts` : lbCategory === "arrow" ? `Lvl ${stats.arrowLevel}` : `${stats.best2048} Pts`}
                  </div>
                  <div className="text-[9px] font-bold text-black/60">Your Score</div>
                </div>
              </div>

              {/* Scrollable Top 5 Live Leaders List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                <h3 className="text-xs font-black uppercase tracking-wider text-black mb-1 flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-500 fill-amber-500" /> Top 5 Players
                </h3>

                {filteredLeaderboard.map((player, index) => {
                  const rankNum = index + 1;
                  const isTop1 = rankNum === 1;
                  const isTop2 = rankNum === 2;
                  const isTop3 = rankNum === 3;
                  const displayScore = lbCategory === "arrow" ? `Lvl ${player.arrowLevel}` : lbCategory === "2048" ? `${player.best2048} pts` : `${player.score.toLocaleString()} pts`;

                  return (
                    <div
                      key={player.id}
                      className={`p-3 border-2 border-black rounded-xl flex items-center justify-between transition-all ${
                        player.isCurrentUser
                          ? "bg-[#fef08a] border-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] scale-[1.01]"
                          : isTop1
                          ? "bg-amber-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          : isTop2
                          ? "bg-slate-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          : isTop3
                          ? "bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-display font-black text-xs shrink-0 ${
                          isTop1 ? "bg-amber-400 text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : isTop2 ? "bg-slate-300 text-black" : isTop3 ? "bg-amber-600 text-white" : "bg-gray-100 text-black"
                        }`}>
                          {isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : `#${rankNum}`}
                        </div>

                        <div>
                          <div className="text-xs font-black text-black flex items-center gap-1.5">
                            <span>{player.name}</span>
                            {player.isCurrentUser && (
                              <span className="bg-black text-white text-[9px] px-1.5 py-0.2 rounded font-black uppercase">YOU</span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-black/70">
                            {player.college} • <span className="text-black font-black">{player.badge}</span>
                          </div>
                        </div>
                      </div>

                      <div className="font-display text-sm font-black text-black text-right shrink-0">
                        {displayScore}
                      </div>
                    </div>
                  );
                })}

                {filteredLeaderboard.length === 0 && (
                  <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl text-center space-y-1">
                    <p className="text-xs font-black text-black">No game records yet!</p>
                    <p className="text-[11px] font-bold text-black/60">Play Arrow Puzzle or 2048 to claim Rank #1!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
