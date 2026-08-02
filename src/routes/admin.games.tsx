import React, { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Info, Copy, Check, Plus, Trash2, Power, Sparkles, Code, Layers, X, ExternalLink, Activity, ShieldCheck, Edit, Eye, Search, Save, RotateCcw, ArrowLeft, Radio, BarChart3, Users, Flame, TrendingDown, Clock, Award, Play } from "lucide-react";
import { toast } from "sonner";
import { getStaticLevel } from "../data/arrow-puzzle-levels";
import { getPipeLevel } from "../data/pipe-puzzle-levels";
import { getGameAnalytics, subscribeGlobalAnalytics, GameAnalytics, RealPlayerRecord } from "../lib/gameAnalytics";

export const Route = createFileRoute("/admin/games")({
  component: AdminGamesManagement,
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";

const GAMES_STATUS_KEY = "cx_games_status";

interface GameStatusMap {
  [gameId: string]: boolean;
}

type GameId = "arrow-puzzle" | "pipe-connect" | "2048" | "memory-match";

interface GameMeta {
  id: GameId;
  name: string;
  emoji: string;
  link: string;
  category: string;
  desc: string;
  color: string;
  badgeBg: string;
  storageKey: string;
  overridesKey: string;
  totalBuiltIn: number;
  prompt: string;
  sampleSingleJson: string;
  sampleMultipleJson: string;
}

const STATIC_2048_LEVELS = [
  { title: "Classic 2048 Grid", targetTile: 2048, gridSize: 4, desc: "Reach 2048 tile by merging identical numbers" },
  { title: "4096 Master Challenge", targetTile: 4096, gridSize: 4, desc: "Pro mode: reach tile 4096" },
  { title: "8192 Speed Rush", targetTile: 8192, gridSize: 4, desc: "Expert mode: reach tile 8192" },
  { title: "Super Obstacle Grid", targetTile: 2048, gridSize: 4, obstacles: [[1, 1]], desc: "2048 grid with 1 blocked obstacle tile" },
];

const STATIC_MEMORY_LEVELS = [
  { title: "Easy Emoji Match", pairsCount: 4, timeLimit: 60, emojis: ["🚀", "💻", "🤖", "⚡"] },
  { title: "Medium Campus Match", pairsCount: 6, timeLimit: 50, emojis: ["🚀", "💻", "🤖", "⚡", "🎮", "🧠"] },
  { title: "Hard Speed Match", pairsCount: 8, timeLimit: 40, emojis: ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑"] },
  { title: "Expert Cyber Match", pairsCount: 10, timeLimit: 30, emojis: ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑", "🎯", "🏆"] },
];

const ALL_GAMES: GameMeta[] = [
  {
    id: "arrow-puzzle",
    name: "Arrow Puzzle",
    emoji: "🏹",
    link: "/games/arrow-puzzle",
    category: "Logic Deflector",
    desc: "100+ Logic Deflector & Mirror Levels",
    color: "bg-[#fca5a5]",
    badgeBg: "bg-[#fef08a] text-black",
    storageKey: "cx_arrow_custom_levels",
    overridesKey: "cx_arrow_level_overrides",
    totalBuiltIn: 100,
    prompt: `Act as a Level Designer for Arrow Puzzle.
Generate a valid JSON for Arrow Puzzle levels.

Game Mechanics:
- Grid size: 5x5 or 6x6.
- Arrows: direction "up", "down", "left", "right".
- Mirror Slash "/": Up->Right, Down->Left, Right->Up, Left->Down.
- Mirror Backslash "\\": Up->Left, Down->Right, Right->Down, Left->Up.
- Obstacles: "wall", "bomb", "ice", "rotator", "gate-up", "gate-down".

Single Level Format:
{
  "gridSize": 5,
  "arrows": [
    { "id": 0, "row": 1, "col": 1, "dir": "up" }
  ],
  "obstacles": [
    { "id": 0, "row": 1, "col": 2, "type": "mirror-slash" }
  ]
}`,
    sampleSingleJson: `{
  "gridSize": 5,
  "arrows": [{ "id": 0, "row": 1, "col": 1, "dir": "up" }],
  "obstacles": [{ "id": 0, "row": 1, "col": 2, "type": "mirror-slash" }]
}`,
    sampleMultipleJson: `[
  {
    "gridSize": 5,
    "arrows": [{ "id": 0, "row": 1, "col": 1, "dir": "up" }],
    "obstacles": [{ "id": 0, "row": 1, "col": 2, "type": "mirror-slash" }]
  },
  {
    "gridSize": 5,
    "arrows": [{ "id": 0, "row": 2, "col": 2, "dir": "right" }],
    "obstacles": [{ "id": 0, "row": 2, "col": 3, "type": "wall" }]
  }
]`,
  },
  {
    id: "pipe-connect",
    name: "Pipe Connect",
    emoji: "⚡",
    link: "/games/pipe-connect",
    category: "Circuit Wiring",
    desc: "30 Electrical Circuit Levels",
    color: "bg-[#93c5fd]",
    badgeBg: "bg-[#bfdbfe] text-black",
    storageKey: "cx_pipe_custom_levels",
    overridesKey: "cx_pipe_level_overrides",
    totalBuiltIn: 30,
    prompt: `Act as a Level Designer for Pipe Connect Circuit Game.
Generate a valid JSON for Pipe Connect circuit levels.

Tile Types: "source", "device", "straight", "elbow", "t-junction", "cross", "blocked", "overload"

Single Level Format:
{
  "gridSize": 4,
  "maxMoves": 15,
  "tiles": [
    { "row": 0, "col": 0, "type": "source", "rotation": 0, "solvedRotation": 0, "fixed": true },
    { "row": 0, "col": 1, "type": "straight", "rotation": 1, "solvedRotation": 1, "fixed": false },
    { "row": 0, "col": 2, "type": "device", "rotation": 0, "solvedRotation": 0, "fixed": true }
  ]
}`,
    sampleSingleJson: `{
  "gridSize": 4,
  "maxMoves": 12,
  "tiles": [
    { "row": 0, "col": 0, "type": "source", "rotation": 0, "solvedRotation": 0, "fixed": true },
    { "row": 0, "col": 1, "type": "elbow", "rotation": 2, "solvedRotation": 0, "fixed": false },
    { "row": 1, "col": 1, "type": "device", "rotation": 0, "solvedRotation": 0, "fixed": true }
  ]
}`,
    sampleMultipleJson: `[
  {
    "gridSize": 4,
    "maxMoves": 12,
    "tiles": [
      { "row": 0, "col": 0, "type": "source", "rotation": 0, "solvedRotation": 0, "fixed": true },
      { "row": 0, "col": 1, "type": "device", "rotation": 0, "solvedRotation": 0, "fixed": true }
    ]
  }
]`,
  },
  {
    id: "2048",
    name: "2048 Classic",
    emoji: "🧩",
    link: "/games/2048",
    category: "Number Merge",
    desc: "Infinite High Score & Challenge Modes",
    color: "bg-[#f472b6]",
    badgeBg: "bg-[#fbcfe8] text-black",
    storageKey: "cx_2048_custom_levels",
    overridesKey: "cx_2048_level_overrides",
    totalBuiltIn: 4,
    prompt: `Act as a Level Designer for 2048 Puzzle Game.
Generate a custom challenge level JSON.`,
    sampleSingleJson: `{
  "title": "Super 4096 Challenge",
  "targetTile": 4096,
  "gridSize": 4,
  "desc": "Pro mode: reach tile 4096"
}`,
    sampleMultipleJson: `[
  {
    "title": "4096 Challenge Pack 1",
    "targetTile": 4096,
    "gridSize": 4,
    "desc": "Pro mode: reach tile 4096"
  },
  {
    "title": "8192 Speed Rush Pack 2",
    "targetTile": 8192,
    "gridSize": 4,
    "desc": "Expert mode: reach tile 8192"
  }
]`,
  },
  {
    id: "memory-match",
    name: "Memory Match",
    emoji: "🃏",
    link: "/games/memory-match",
    category: "Card Pair Speed",
    desc: "Speed Brain Emoji Card Pairs",
    color: "bg-[#86efac]",
    badgeBg: "bg-[#bbf7d0] text-black",
    storageKey: "cx_memory_custom_levels",
    overridesKey: "cx_memory_level_overrides",
    totalBuiltIn: 4,
    prompt: `Act as a Level Designer for Memory Match Game.
Generate a level JSON with pairs, time limit, and emojis.`,
    sampleSingleJson: `{
  "title": "Speed Cyber Match",
  "timeLimit": 45,
  "pairsCount": 8,
  "emojis": ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑"]
}`,
    sampleMultipleJson: `[
  {
    "title": "Speed Cyber Match Pack 1",
    "timeLimit": 45,
    "pairsCount": 8,
    "emojis": ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑"]
  },
  {
    "title": "Ultimate Memory Challenge",
    "timeLimit": 30,
    "pairsCount": 10,
    "emojis": ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑", "🎯", "🏆"]
  }
]`,
  },
];

export default function AdminGamesManagement() {
  const [gameStatus, setGameStatus] = useState<GameStatusMap>({
    "arrow-puzzle": true,
    "pipe-connect": true,
    "2048": true,
    "memory-match": true,
  });

  const [analytics, setAnalytics] = useState<GameAnalytics>({
    totalPlays: 0,
    gamePlayCounts: { "arrow-puzzle": 0, "pipe-connect": 0, "2048": 0, "memory-match": 0 },
    players: {},
  });

  // Active View State: null = Games List View, GameId = Inside Game Level Detail View
  const [activeDetailGameId, setActiveDetailGameId] = useState<GameId | null>(null);

  const [showAiPromptModal, setShowAiPromptModal] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  
  // Single Level Add Modal
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const [singleLevelJson, setSingleLevelJson] = useState("");

  // Multiple Levels Bulk Import Textarea
  const [bulkCodeToImport, setBulkCodeToImport] = useState("");

  // Storage data
  const [customLevels, setCustomLevels] = useState<any[]>([]);
  const [levelOverrides, setLevelOverrides] = useState<Record<number, any>>({});

  // Level Inspect/Edit Modal State
  const [selectedLevelBox, setSelectedLevelBox] = useState<{ index: number; isBuiltIn: boolean; isOverridden: boolean; data: any } | null>(null);
  const [editingLevelJson, setEditingLevelJson] = useState<string>("");

  const [searchLevelQuery, setSearchLevelQuery] = useState<string>("");

  const selectedGameMeta = ALL_GAMES.find(g => g.id === activeDetailGameId) || ALL_GAMES[0];

  const loadData = () => {
    try {
      const savedStatus = localStorage.getItem(GAMES_STATUS_KEY);
      if (savedStatus) setGameStatus(JSON.parse(savedStatus));

      const data = getGameAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.warn("Storage load error", e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeGlobalAnalytics((data) => {
      setAnalytics(data);
    });
    window.addEventListener("cx_game_played_event", loadData);
    window.addEventListener("storage", loadData);
    return () => {
      unsub();
      window.removeEventListener("cx_game_played_event", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, []);

  // Reload custom levels & level overrides when active detail game changes
  useEffect(() => {
    if (!activeDetailGameId) return;
    const meta = ALL_GAMES.find(g => g.id === activeDetailGameId);
    if (!meta) return;

    try {
      const savedCustom = localStorage.getItem(meta.storageKey);
      setCustomLevels(savedCustom ? JSON.parse(savedCustom) : []);

      const savedOverrides = localStorage.getItem(meta.overridesKey);
      setLevelOverrides(savedOverrides ? JSON.parse(savedOverrides) : {});
    } catch (e) {
      setCustomLevels([]);
      setLevelOverrides({});
    }
  }, [activeDetailGameId]);

  const toggleGame = (gameId: string, status: boolean) => {
    const updated = { ...gameStatus, [gameId]: status };
    setGameStatus(updated);
    localStorage.setItem(GAMES_STATUS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("cx_games_status_change"));
    toast.success(`${gameId} is now ${status ? "ONLINE" : "OFFLINE"}`);
  };

  const copyAiPrompt = () => {
    navigator.clipboard.writeText(selectedGameMeta.prompt);
    setCopiedPrompt(true);
    toast.success(`AI Prompt for ${selectedGameMeta.name} copied!`);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Add 1 Single Level
  const handleAddSingleLevel = () => {
    if (!singleLevelJson.trim()) {
      toast.error("Please enter level JSON code!");
      return;
    }

    try {
      const parsed = JSON.parse(singleLevelJson);
      if (Array.isArray(parsed)) {
        toast.error("You pasted multiple levels! Use the Bulk Import box below for multiple levels.");
        return;
      }

      const updatedList = [...customLevels, parsed];
      setCustomLevels(updatedList);
      localStorage.setItem(selectedGameMeta.storageKey, JSON.stringify(updatedList));
      window.dispatchEvent(new Event("cx_custom_levels_change"));

      toast.success(`Added 1 Single Level to ${selectedGameMeta.name}! 🎉`);
      setSingleLevelJson("");
      setShowAddSingleModal(false);
    } catch (e) {
      toast.error("Invalid JSON format! Please check the code snippet.");
    }
  };

  // Import Multiple Levels at Once
  const handleBulkImportLevels = () => {
    if (!bulkCodeToImport.trim()) {
      toast.error("Please paste multiple levels JSON array!");
      return;
    }

    try {
      const parsed = JSON.parse(bulkCodeToImport);
      let newLevels: any[] = [];

      if (Array.isArray(parsed)) {
        newLevels = parsed;
      } else {
        newLevels = [parsed];
      }

      const updatedList = [...customLevels, ...newLevels];
      setCustomLevels(updatedList);
      localStorage.setItem(selectedGameMeta.storageKey, JSON.stringify(updatedList));
      window.dispatchEvent(new Event("cx_custom_levels_change"));

      toast.success(`Successfully imported ${newLevels.length} levels to ${selectedGameMeta.name}! 🚀`);
      setBulkCodeToImport("");
    } catch (e) {
      toast.error("Invalid JSON format! Must be a JSON array of levels.");
    }
  };

  // Open Level Box Inspect/Edit Modal
  const handleOpenLevelBox = (item: { index: number; isBuiltIn: boolean; isOverridden: boolean; data: any }) => {
    setSelectedLevelBox(item);
    setEditingLevelJson(JSON.stringify(item.data, null, 2));
  };

  // Save changes to level box
  const handleSaveSelectedLevelBox = () => {
    if (!selectedLevelBox) return;

    try {
      const parsed = JSON.parse(editingLevelJson);

      if (selectedLevelBox.isBuiltIn) {
        const updatedOverrides = { ...levelOverrides, [selectedLevelBox.index]: parsed };
        setLevelOverrides(updatedOverrides);
        localStorage.setItem(selectedGameMeta.overridesKey, JSON.stringify(updatedOverrides));
        toast.success(`Level #${selectedLevelBox.index + 1} updated! ✏️`);
      } else {
        const customIdx = selectedLevelBox.index - selectedGameMeta.totalBuiltIn;
        const updatedCustom = [...customLevels];
        updatedCustom[customIdx] = parsed;
        setCustomLevels(updatedCustom);
        localStorage.setItem(selectedGameMeta.storageKey, JSON.stringify(updatedCustom));
        toast.success(`Custom Level #${customIdx + 1} updated! ✏️`);
      }

      window.dispatchEvent(new Event("cx_custom_levels_change"));
      setSelectedLevelBox(null);
    } catch (e) {
      toast.error("Invalid JSON format! Please check your edits.");
    }
  };

  // Delete level box
  const handleDeleteSelectedLevelBox = () => {
    if (!selectedLevelBox) return;

    if (selectedLevelBox.isBuiltIn) {
      if (selectedLevelBox.isOverridden) {
        const updated = { ...levelOverrides };
        delete updated[selectedLevelBox.index];
        setLevelOverrides(updated);
        localStorage.setItem(selectedGameMeta.overridesKey, JSON.stringify(updated));
        toast.success(`Level #${selectedLevelBox.index + 1} reset to default! 🔄`);
      } else {
        toast.info("Built-in levels cannot be deleted, but you can edit them!");
      }
    } else {
      const targetIdx = selectedLevelBox.index - selectedGameMeta.totalBuiltIn;
      const updatedList = customLevels.filter((_, i) => i !== targetIdx);
      setCustomLevels(updatedList);
      localStorage.setItem(selectedGameMeta.storageKey, JSON.stringify(updatedList));
      toast.success("Level deleted!");
    }

    window.dispatchEvent(new Event("cx_custom_levels_change"));
    setSelectedLevelBox(null);
  };

  // Compute game popularity metrics
  const gamePopularityStats = useMemo(() => {
    const counts = analytics.gamePlayCounts || { "arrow-puzzle": 0, "pipe-connect": 0, "2048": 0, "memory-match": 0 };
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    const mostPlayedId = sorted[0]?.[0] || "arrow-puzzle";
    const leastPlayedId = sorted[sorted.length - 1]?.[0] || "memory-match";

    const mostMeta = ALL_GAMES.find(g => g.id === mostPlayedId) || ALL_GAMES[0];
    const leastMeta = ALL_GAMES.find(g => g.id === leastPlayedId) || ALL_GAMES[ALL_GAMES.length - 1];

    const realPlayersList = Object.values(analytics.players || {});

    return {
      mostPlayed: `${mostMeta.emoji} ${mostMeta.name} (${counts[mostPlayedId as GameId] || 0} Plays)`,
      leastPlayed: `${leastMeta.emoji} ${leastMeta.name} (${counts[leastPlayedId as GameId] || 0} Plays)`,
      totalPlayersCount: realPlayersList.length,
      totalPlaysCount: analytics.totalPlays || 0,
      counts,
      playersList: realPlayersList.sort((a, b) => b.lastPlayedTime - a.lastPlayedTime),
    };
  }, [analytics]);

  // Compiled list of levels for active game
  const levelBoxes = useMemo(() => {
    if (!activeDetailGameId) return [];
    const meta = selectedGameMeta;

    const list: { index: number; isBuiltIn: boolean; isOverridden: boolean; data: any }[] = [];

    // Populate built-in levels for ALL 4 games
    for (let i = 0; i < meta.totalBuiltIn; i++) {
      const isOverridden = !!levelOverrides[i];
      let data = isOverridden ? levelOverrides[i] : null;

      if (!data) {
        if (meta.id === "arrow-puzzle") data = getStaticLevel(i);
        else if (meta.id === "pipe-connect") data = getPipeLevel(i);
        else if (meta.id === "2048") data = STATIC_2048_LEVELS[i] || STATIC_2048_LEVELS[0];
        else if (meta.id === "memory-match") data = STATIC_MEMORY_LEVELS[i] || STATIC_MEMORY_LEVELS[0];
      }

      list.push({ index: i, isBuiltIn: true, isOverridden, data });
    }

    // Populate custom added levels
    customLevels.forEach((lvl, i) => {
      list.push({ index: meta.totalBuiltIn + i, isBuiltIn: false, isOverridden: false, data: lvl });
    });

    if (!searchLevelQuery.trim()) return list;

    const q = searchLevelQuery.toLowerCase();
    return list.filter(item => {
      const lvlNum = item.index + 1;
      return (
        lvlNum.toString().includes(q) ||
        (item.data && item.data.title && item.data.title.toLowerCase().includes(q))
      );
    });
  }, [activeDetailGameId, selectedGameMeta, levelOverrides, customLevels, searchLevelQuery]);

  return (
    <div className="min-h-screen bg-[#f4f4f5] p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 text-black font-sans select-none pb-28">

      {/* ─── VIEW 1: CLEAN MAIN GAMES LIST & ANALYTICS (when activeDetailGameId === null) ─── */}
      {activeDetailGameId === null && (
        <div className="space-y-6">
          
          {/* Neo-Brutalist Sticky Header Banner */}
          <div className="p-6 bg-[#fef08a] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-3xl space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border-2 border-black bg-white p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Gamepad2 className="h-7 w-7 text-black" strokeWidth={3} />
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight text-black leading-none">
                  Campus Arcade Studio
                </h1>
                <span className="text-xs font-black text-black/70 uppercase tracking-wider">
                  Admin Mini Games & Real-Time Player Control
                </span>
              </div>
            </div>
          </div>



          {/* Clean Games List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ALL_GAMES.map(game => {
              const isOnline = gameStatus[game.id] !== false;
              let customCount = 0;
              try {
                const raw = localStorage.getItem(game.storageKey);
                if (raw) customCount = JSON.parse(raw).length;
              } catch (e) {}

              const totalLevelsCount = game.totalBuiltIn + customCount;

              return (
                <div
                  key={game.id}
                  className={`p-5 border-4 border-black ${game.color} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between space-y-4 transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl border-3 border-black bg-white flex items-center justify-center text-3xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {game.emoji}
                      </div>
                      <div>
                        <div className="font-display text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                          {game.name}
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 border-2 border-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${game.badgeBg}`}>
                          {game.category}
                        </span>
                        <p className="text-xs font-bold text-black/80 mt-1 line-clamp-1">{game.desc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Neo-Brutalist Radio Button Toggle Row */}
                  <div className="p-3 bg-white border-3 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-black text-black flex items-center gap-1.5 uppercase tracking-wide">
                      <Radio className={`h-4 w-4 ${isOnline ? "text-emerald-600" : "text-rose-600"}`} /> Status:
                    </span>

                    {/* Radio Options */}
                    <div className="flex items-center gap-2 bg-gray-100 border-2 border-black p-1 rounded-xl">
                      <label className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black cursor-pointer border-2 transition-all ${
                        isOnline ? "bg-[#bbf7d0] border-black text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "border-transparent text-black/60 hover:bg-gray-200"
                      }`}>
                        <input
                          type="radio"
                          name={`status-${game.id}`}
                          checked={isOnline}
                          onChange={() => toggleGame(game.id, true)}
                          className="sr-only"
                        />
                        <span>● ON</span>
                      </label>

                      <label className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black cursor-pointer border-2 transition-all ${
                        !isOnline ? "bg-[#fca5a5] border-black text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "border-transparent text-black/60 hover:bg-gray-200"
                      }`}>
                        <input
                          type="radio"
                          name={`status-${game.id}`}
                          checked={!isOnline}
                          onChange={() => toggleGame(game.id, false)}
                          className="sr-only"
                        />
                        <span>○ OFF</span>
                      </label>
                    </div>
                  </div>

                  {/* Enter Game Level Manager Button */}
                  <button
                    onClick={() => setActiveDetailGameId(game.id)}
                    className="w-full bg-black hover:bg-gray-900 text-white py-3 rounded-2xl text-xs font-display font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_rgba(254,240,138,1)] flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer"
                    style={{ borderRadius: WOBBLY_SM }}
                  >
                    <span>Manage Levels ({totalLevelsCount} Levels)</span>
                    <span>→</span>
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ─── VIEW 2: INSIDE GAME LEVEL DETAIL MANAGER (when activeDetailGameId !== null) ─── */}
      {activeDetailGameId !== null && (
        <div className="space-y-6">
          
          {/* Top Bar with Back Button */}
          <div className="p-4 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-3xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveDetailGameId(null)}
                className="p-2.5 rounded-2xl border-2 border-black bg-[#fef08a] hover:bg-yellow-200 transition-colors flex items-center gap-1 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={3} /> Back to Games List
              </button>

              <div className="flex items-center gap-2">
                <span className="text-3xl">{selectedGameMeta.emoji}</span>
                <div>
                  <h1 className="font-display text-xl md:text-2xl font-black uppercase text-black leading-none">
                    {selectedGameMeta.name} Studio
                  </h1>
                  <span className="text-[11px] font-bold text-black/70">
                    Click any level box to view, edit or delete
                  </span>
                </div>
              </div>
            </div>

            {/* Radio Toggle Status */}
            <div className="flex items-center gap-2 bg-gray-100 border-2 border-black p-1 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <button
                onClick={() => toggleGame(selectedGameMeta.id, true)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                  gameStatus[selectedGameMeta.id] !== false ? "bg-[#bbf7d0] border-black text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "border-transparent text-black/60 hover:bg-gray-200"
                }`}
              >
                ● ON
              </button>
              <button
                onClick={() => toggleGame(selectedGameMeta.id, false)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                  gameStatus[selectedGameMeta.id] === false ? "bg-[#fca5a5] border-black text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" : "border-transparent text-black/60 hover:bg-gray-200"
                }`}
              >
                ○ OFF
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white border-3 border-black rounded-3xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-black" />
              <input
                type="text"
                placeholder="Search Level #..."
                value={searchLevelQuery}
                onChange={e => setSearchLevelQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl border-2 border-black bg-white text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* ℹ️ Get AI Prompt Info */}
              <button
                onClick={() => setShowAiPromptModal(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-[#fef08a] hover:bg-yellow-200 text-black border-2 border-black px-4 py-2.5 rounded-2xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-105 cursor-pointer"
              >
                <Info className="h-4 w-4" /> ℹ️ AI Prompt Info
              </button>

              {/* ➕ Add Single Level Button */}
              <button
                onClick={() => {
                  setSingleLevelJson(selectedGameMeta.sampleSingleJson);
                  setShowAddSingleModal(true);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-black hover:bg-gray-900 text-white border-2 border-black px-4 py-2.5 rounded-2xl text-xs font-display font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(254,240,138,1)] transition-transform hover:scale-105 cursor-pointer"
              >
                <Plus className="h-4 w-4" strokeWidth={3} /> ➕ Add Single Level
              </button>
            </div>
          </div>

          {/* LEVEL BOXES GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-black text-black uppercase tracking-wider px-1">
              <span>LEVEL BOXES ({levelBoxes.length} Total Levels)</span>
              <span>Click box to Edit or Delete</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3 max-h-[420px] overflow-y-auto p-1 custom-scrollbar">
              {levelBoxes.map((item) => {
                const levelNum = item.index + 1;
                return (
                  <motion.button
                    key={item.index}
                    whileHover={{ scale: 1.06, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenLevelBox(item)}
                    className={`h-20 border-3 border-black rounded-2xl flex flex-col items-center justify-center p-2 relative shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer ${
                      item.isOverridden
                        ? "bg-[#fef08a] text-black font-black"
                        : !item.isBuiltIn
                        ? "bg-[#fbcfe8] text-black font-black"
                        : "bg-white text-black hover:bg-[#bfdbfe]"
                    }`}
                  >
                    <span className="font-display font-black text-base leading-none">Lvl {levelNum}</span>
                    <span className="text-[9px] font-black uppercase tracking-wider mt-1 px-1.5 py-0.2 bg-white/80 border border-black rounded-full">
                      {item.isOverridden ? "EDITED" : !item.isBuiltIn ? "CUSTOM" : "DEFAULT"}
                    </span>
                  </motion.button>
                );
              })}

              {levelBoxes.length === 0 && (
                <div className="col-span-full p-8 border-4 border-dashed border-gray-400 bg-white rounded-3xl text-center text-xs font-bold text-black">
                  No levels found matching "{searchLevelQuery}". Click "➕ Add Single Level" or paste multiple levels below!
                </div>
              )}
            </div>
          </div>

          {/* 📥 BOTTOM SECTION: BULK IMPORT MULTIPLE LEVELS AT ONCE */}
          <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
                <Code className="h-4 w-4 text-blue-600" /> 📥 Bulk AI Level Importer (Import Multiple Levels at Once)
              </label>

              <button
                onClick={() => setBulkCodeToImport(selectedGameMeta.sampleMultipleJson)}
                className="text-[11px] font-black text-blue-600 hover:underline cursor-pointer"
              >
                Load Sample Multiple Levels Array
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border-3 border-black bg-slate-900 p-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <textarea
                value={bulkCodeToImport}
                onChange={e => setBulkCodeToImport(e.target.value)}
                placeholder={`Paste JSON array of multiple levels here...\nExample:\n[\n  { "gridSize": 5, "arrows": [...] },\n  { "gridSize": 5, "arrows": [...] }\n]`}
                rows={5}
                className="w-full p-4 font-mono text-xs text-[#fef08a] bg-transparent focus:outline-none resize-y leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleBulkImportLevels}
                className="bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-display font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_rgba(254,240,138,1)] transition-transform hover:scale-105 cursor-pointer flex items-center gap-2"
                style={{ borderRadius: WOBBLY_SM }}
              >
                <span>Import All Multiple Levels</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ─── ➕ ADD 1 SINGLE LEVEL MODAL ────────────────────────────────── */}
      <AnimatePresence>
        {showAddSingleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
            onClick={() => setShowAddSingleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative space-y-4 text-black"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <button
                onClick={() => setShowAddSingleModal(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 border-2 border-black z-10 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#fef08a] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Plus className="h-6 w-6 text-black" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="font-display text-xl font-black uppercase text-black">Add 1 Single Level</h3>
                  <p className="text-xs font-bold text-black/70">Paste JSON object for exactly 1 level below.</p>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border-3 border-black bg-slate-900 p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <textarea
                  value={singleLevelJson}
                  onChange={e => setSingleLevelJson(e.target.value)}
                  rows={8}
                  className="w-full p-4 font-mono text-xs text-[#fef08a] bg-transparent focus:outline-none resize-y leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddSingleModal(false)}
                  className="px-4 py-2 text-xs font-black text-black/70 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSingleLevel}
                  className="bg-black text-white px-6 py-2.5 border-2 border-black font-display font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(254,240,138,1)] cursor-pointer"
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  Add This Level
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ✏️ LEVEL BOX INSPECT / EDIT / DELETE MODAL ───────────────────── */}
      <AnimatePresence>
        {selectedLevelBox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
            onClick={() => setSelectedLevelBox(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative space-y-4 text-black"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <button
                onClick={() => setSelectedLevelBox(null)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 border-2 border-black z-10 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>

              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#fef08a] border-2 border-black rounded-2xl flex items-center justify-center font-display font-black text-base shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    #{selectedLevelBox.index + 1}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-black uppercase text-black">
                      Level #{selectedLevelBox.index + 1} Editor
                    </h3>
                    <span className="text-xs font-bold text-black/70">
                      {selectedLevelBox.isBuiltIn ? "Built-in Game Level" : "Custom Added Level"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* ▶️ Play Level Directly Button */}
                  <a
                    href={`${selectedGameMeta.link}?level=${selectedLevelBox.index + 1}`}
                  >
                    <button className="px-3.5 py-1.5 rounded-xl bg-[#bbf7d0] hover:bg-emerald-200 border-2 border-black text-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                      <Play className="h-4 w-4 fill-black text-black" />
                      <span>Play Level #{selectedLevelBox.index + 1}</span>
                    </button>
                  </a>

                  {/* Delete / Reset Button */}
                  <button
                    onClick={handleDeleteSelectedLevelBox}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 border-2 border-black text-rose-900 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                    <span>{selectedLevelBox.isOverridden ? "Reset Level" : "Delete Level"}</span>
                  </button>
                </div>
              </div>

              {/* JSON Editor Box */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-black">Edit Level JSON Config:</label>
                <div className="relative rounded-2xl overflow-hidden border-3 border-black bg-slate-900 p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <textarea
                    value={editingLevelJson}
                    onChange={e => setEditingLevelJson(e.target.value)}
                    rows={9}
                    className="w-full p-4 font-mono text-xs text-[#fef08a] bg-transparent focus:outline-none resize-y leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {/* ▶️ Big Play Button in Footer */}
                <a
                  href={`${selectedGameMeta.link}?level=${selectedLevelBox.index + 1}`}
                >
                  <button
                    className="bg-[#fef08a] hover:bg-yellow-200 text-black px-4 py-2.5 border-2 border-black font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    style={{ borderRadius: WOBBLY_SM }}
                  >
                    <Play className="h-4 w-4 fill-black text-black" />
                    <span>Test Play Level #{selectedLevelBox.index + 1}</span>
                  </button>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedLevelBox(null)}
                    className="px-4 py-2 text-xs font-black text-black/70 hover:text-black cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSelectedLevelBox}
                    className="bg-[#bbf7d0] text-black px-6 py-2.5 border-2 border-black font-display font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    style={{ borderRadius: WOBBLY_SM }}
                  >
                    Save Level Edits
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ℹ️ AI PROMPT INFO MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {showAiPromptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
            onClick={() => setShowAiPromptModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative space-y-4 text-black"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <button
                onClick={() => setShowAiPromptModal(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 border-2 border-black z-10 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#fef08a] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Sparkles className="h-7 w-7 text-black" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-black uppercase text-black">AI Level Designer Prompt</h3>
                  <p className="text-xs font-bold text-black/70">
                    Copy prompt for <span className="underline font-black">{selectedGameMeta.name}</span> and send to ChatGPT/Gemini!
                  </p>
                </div>
              </div>

              <div className="relative bg-slate-900 text-[#fef08a] p-4 rounded-2xl font-mono text-xs max-h-72 overflow-y-auto leading-relaxed border-3 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <pre className="whitespace-pre-wrap">{selectedGameMeta.prompt}</pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setShowAiPromptModal(false)}
                  className="px-4 py-2 text-xs font-black text-black/70 hover:text-black cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={copyAiPrompt}
                  className="bg-[#fef08a] hover:bg-yellow-200 text-black px-6 py-2.5 border-2 border-black font-display font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  {copiedPrompt ? "Copied!" : "Copy AI Prompt"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
