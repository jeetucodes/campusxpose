import React, { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Info, Copy, Check, Plus, Trash2, Power, Sparkles, Code, Layers, X, ExternalLink, Activity, ShieldCheck, Edit, Eye, Search, Save, RotateCcw, ArrowLeft, Radio } from "lucide-react";
import { toast } from "sonner";
import { getStaticLevel } from "../data/arrow-puzzle-levels";

export const Route = createFileRoute("/admin/games")({
  component: AdminGamesManagement,
});

const GAMES_STATUS_KEY = "cx_games_status";
const ARROW_OVERRIDES_KEY = "cx_arrow_level_overrides";

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
  storageKey: string;
  totalBuiltIn: number;
  prompt: string;
  sampleSingleJson: string;
  sampleMultipleJson: string;
}

const ALL_GAMES: GameMeta[] = [
  {
    id: "arrow-puzzle",
    name: "Arrow Puzzle",
    emoji: "🏹",
    link: "/games/arrow-puzzle",
    category: "Logic Deflector",
    desc: "100+ Logic Deflector & Mirror Levels",
    color: "bg-amber-50 border-amber-200 text-amber-950",
    storageKey: "cx_arrow_custom_levels",
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
}

Multiple Levels Format:
[
  { "gridSize": 5, "arrows": [{ "id": 0, "row": 1, "col": 1, "dir": "up" }], "obstacles": [] },
  { "gridSize": 5, "arrows": [{ "id": 0, "row": 2, "col": 2, "dir": "down" }], "obstacles": [] }
]`,
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
    color: "bg-blue-50 border-blue-200 text-blue-950",
    storageKey: "cx_pipe_custom_levels",
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
    color: "bg-pink-50 border-pink-200 text-pink-950",
    storageKey: "cx_2048_custom_levels",
    totalBuiltIn: 1,
    prompt: `Act as a Level Designer for 2048 Puzzle Game.
Generate a custom challenge board JSON.`,
    sampleSingleJson: `{
  "title": "Super 4096 Challenge",
  "targetTile": 4096,
  "initialBoard": [
    [0, 2, 4, 8],
    [16, 32, 64, 128],
    [256, 512, 1024, 0],
    [0, 0, 0, 2]
  ]
}`,
    sampleMultipleJson: `[
  {
    "title": "4096 Challenge Pack 1",
    "targetTile": 4096,
    "initialBoard": [[0, 2, 4, 8], [16, 32, 64, 128], [256, 512, 1024, 0], [0, 0, 0, 2]]
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
    color: "bg-emerald-50 border-emerald-200 text-emerald-950",
    storageKey: "cx_memory_custom_levels",
    totalBuiltIn: 1,
    prompt: `Act as a Level Designer for Memory Match Game.
Generate a level JSON with pairs, time limit, and emojis.`,
    sampleSingleJson: `{
  "title": "Speed Cyber Match",
  "timeLimit": 45,
  "gridPairs": 8,
  "emojis": ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑"]
}`,
    sampleMultipleJson: `[
  {
    "title": "Speed Cyber Match Pack 1",
    "timeLimit": 45,
    "gridPairs": 8,
    "emojis": ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑"]
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

  useEffect(() => {
    try {
      const savedStatus = localStorage.getItem(GAMES_STATUS_KEY);
      if (savedStatus) {
        setGameStatus(JSON.parse(savedStatus));
      }

      const savedOverrides = localStorage.getItem(ARROW_OVERRIDES_KEY);
      if (savedOverrides) {
        setLevelOverrides(JSON.parse(savedOverrides));
      }
    } catch (e) {
      console.warn("Storage load error", e);
    }
  }, []);

  // Reload custom levels when active detail game changes
  useEffect(() => {
    if (!activeDetailGameId) return;
    const meta = ALL_GAMES.find(g => g.id === activeDetailGameId);
    if (!meta) return;

    try {
      const savedCustom = localStorage.getItem(meta.storageKey);
      if (savedCustom) {
        setCustomLevels(JSON.parse(savedCustom));
      } else {
        setCustomLevels([]);
      }
    } catch (e) {
      setCustomLevels([]);
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

      if (selectedGameMeta.id === "arrow-puzzle") {
        if (selectedLevelBox.isBuiltIn) {
          const updatedOverrides = { ...levelOverrides, [selectedLevelBox.index]: parsed };
          setLevelOverrides(updatedOverrides);
          localStorage.setItem(ARROW_OVERRIDES_KEY, JSON.stringify(updatedOverrides));
          toast.success(`Level #${selectedLevelBox.index + 1} updated! ✏️`);
        } else {
          const customIdx = selectedLevelBox.index - 100;
          const updatedCustom = [...customLevels];
          updatedCustom[customIdx] = parsed;
          setCustomLevels(updatedCustom);
          localStorage.setItem(selectedGameMeta.storageKey, JSON.stringify(updatedCustom));
          toast.success(`Custom Level #${customIdx + 1} updated! ✏️`);
        }
      } else {
        const updatedCustom = [...customLevels];
        updatedCustom[selectedLevelBox.index] = parsed;
        setCustomLevels(updatedCustom);
        localStorage.setItem(selectedGameMeta.storageKey, JSON.stringify(updatedCustom));
        toast.success(`Level updated! ✏️`);
      }

      setSelectedLevelBox(null);
    } catch (e) {
      toast.error("Invalid JSON format! Please check your edits.");
    }
  };

  // Delete level box
  const handleDeleteSelectedLevelBox = () => {
    if (!selectedLevelBox) return;

    if (selectedGameMeta.id === "arrow-puzzle" && selectedLevelBox.isBuiltIn) {
      if (selectedLevelBox.isOverridden) {
        const updated = { ...levelOverrides };
        delete updated[selectedLevelBox.index];
        setLevelOverrides(updated);
        localStorage.setItem(ARROW_OVERRIDES_KEY, JSON.stringify(updated));
        toast.success(`Level #${selectedLevelBox.index + 1} reset to default! 🔄`);
      } else {
        toast.info("Built-in levels cannot be deleted, but you can edit them!");
      }
    } else {
      const targetIdx = selectedGameMeta.id === "arrow-puzzle" ? selectedLevelBox.index - 100 : selectedLevelBox.index;
      const updatedList = customLevels.filter((_, i) => i !== targetIdx);
      setCustomLevels(updatedList);
      localStorage.setItem(selectedGameMeta.storageKey, JSON.stringify(updatedList));
      toast.success("Level deleted!");
    }

    setSelectedLevelBox(null);
  };

  // Compiled list of levels for active game
  const levelBoxes = useMemo(() => {
    if (!activeDetailGameId) return [];
    const meta = selectedGameMeta;

    const list: { index: number; isBuiltIn: boolean; isOverridden: boolean; data: any }[] = [];

    if (meta.id === "arrow-puzzle") {
      // 100 Built-in Levels
      for (let i = 0; i < 100; i++) {
        const isOverridden = !!levelOverrides[i];
        const data = isOverridden ? levelOverrides[i] : getStaticLevel(i);
        list.push({ index: i, isBuiltIn: true, isOverridden, data });
      }
      // Custom Levels
      customLevels.forEach((lvl, i) => {
        list.push({ index: 100 + i, isBuiltIn: false, isOverridden: false, data: lvl });
      });
    } else {
      customLevels.forEach((lvl, i) => {
        list.push({ index: i, isBuiltIn: false, isOverridden: false, data: lvl });
      });
    }

    if (!searchLevelQuery.trim()) return list;

    const q = searchLevelQuery.toLowerCase();
    return list.filter(item => {
      const lvlNum = item.index + 1;
      return (
        lvlNum.toString().includes(q) ||
        (item.data.title && item.data.title.toLowerCase().includes(q))
      );
    });
  }, [activeDetailGameId, selectedGameMeta, levelOverrides, customLevels, searchLevelQuery]);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 text-foreground font-sans select-none">

      {/* ─── VIEW 1: CLEAN MAIN GAMES LIST (when activeDetailGameId === null) ─── */}
      {activeDetailGameId === null && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                <Gamepad2 className="h-8 w-8 text-primary" /> Campus Arcade Control
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Toggle game availability with radio buttons or click a game to manage & edit levels.
              </p>
            </div>
          </div>

          {/* Clean Games List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="p-5 rounded-3xl border bg-card shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-3xl shadow-sm">
                        {game.emoji}
                      </div>
                      <div>
                        <div className="font-extrabold text-lg flex items-center gap-2">
                          {game.name}
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 border text-slate-700 font-bold">
                            {game.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{game.desc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Radio Button Toggle Row */}
                  <div className="p-3 bg-slate-50 border rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Radio className={`h-4 w-4 ${isOnline ? "text-emerald-600" : "text-rose-500"}`} /> Status:
                    </span>

                    {/* Radio Options */}
                    <div className="flex items-center gap-3 bg-white border p-1 rounded-xl shadow-xs">
                      <label className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                        isOnline ? "bg-emerald-500 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
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

                      <label className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                        !isOnline ? "bg-rose-500 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
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
                    className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
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
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveDetailGameId(null)}
                className="p-2.5 rounded-2xl border bg-card hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Games List
              </button>

              <div className="flex items-center gap-2">
                <span className="text-3xl">{selectedGameMeta.emoji}</span>
                <div>
                  <h1 className="text-xl md:text-2xl font-black">{selectedGameMeta.name} Level Studio</h1>
                  <p className="text-xs text-muted-foreground">Click any level box to inspect, edit, or delete.</p>
                </div>
              </div>
            </div>

            {/* Radio Toggle Status */}
            <div className="flex items-center gap-2 bg-card border p-1.5 rounded-2xl shadow-xs">
              <button
                onClick={() => toggleGame(selectedGameMeta.id, true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  gameStatus[selectedGameMeta.id] !== false ? "bg-emerald-500 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                ● ON
              </button>
              <button
                onClick={() => toggleGame(selectedGameMeta.id, false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  gameStatus[selectedGameMeta.id] === false ? "bg-rose-500 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                ○ OFF
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-card border rounded-3xl shadow-xs">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Level #..."
                value={searchLevelQuery}
                onChange={e => setSearchLevelQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* ℹ️ Get AI Prompt Info */}
              <button
                onClick={() => setShowAiPromptModal(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <Info className="h-4 w-4" /> ℹ️ AI Prompt Info
              </button>

              {/* ➕ Add Single Level Button */}
              <button
                onClick={() => {
                  setSingleLevelJson(selectedGameMeta.sampleSingleJson);
                  setShowAddSingleModal(true);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-2xl text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> ➕ Add Single Level
              </button>
            </div>
          </div>

          {/* LEVEL BOXES GRID (Click any box to inspect / edit / delete) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
              <span>LEVEL BOXES ({levelBoxes.length} Total Levels)</span>
              <span>Click box to Edit or Delete</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-3 max-h-[420px] overflow-y-auto p-1 custom-scrollbar">
              {levelBoxes.map((item) => {
                const levelNum = item.index + 1;
                return (
                  <motion.button
                    key={item.index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenLevelBox(item)}
                    className={`h-20 border-2 rounded-2xl flex flex-col items-center justify-center p-2 relative shadow-xs transition-all cursor-pointer ${
                      item.isOverridden
                        ? "bg-amber-100 border-amber-400 text-amber-950 font-black shadow-amber-200"
                        : !item.isBuiltIn
                        ? "bg-purple-100 border-purple-400 text-purple-950 font-black shadow-purple-200"
                        : "bg-card border-slate-200 text-foreground font-bold hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-base font-black">Level {levelNum}</span>
                    <span className="text-[10px] opacity-70">
                      {item.isOverridden ? "EDITED" : !item.isBuiltIn ? "CUSTOM" : "DEFAULT"}
                    </span>
                  </motion.button>
                );
              })}

              {levelBoxes.length === 0 && (
                <div className="col-span-full p-8 border border-dashed rounded-3xl text-center text-xs text-muted-foreground">
                  No levels found matching "{searchLevelQuery}". Click "➕ Add Single Level" or paste multiple levels below!
                </div>
              )}
            </div>
          </div>

          {/* 📥 BOTTOM SECTION: BULK IMPORT MULTIPLE LEVELS AT ONCE */}
          <div className="p-6 bg-card border rounded-3xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black flex items-center gap-2 uppercase tracking-wider">
                <Code className="h-4 w-4 text-blue-500" /> 📥 Bulk AI Level Importer (Import Multiple Levels at Once)
              </label>

              <button
                onClick={() => setBulkCodeToImport(selectedGameMeta.sampleMultipleJson)}
                className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Load Sample Multiple Levels Array
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-1 shadow-inner">
              <textarea
                value={bulkCodeToImport}
                onChange={e => setBulkCodeToImport(e.target.value)}
                placeholder={`Paste JSON array of multiple levels here...\nExample:\n[\n  { "gridSize": 5, "arrows": [...] },\n  { "gridSize": 5, "arrows": [...] }\n]`}
                rows={5}
                className="w-full p-4 font-mono text-xs text-slate-100 bg-transparent focus:outline-none resize-y leading-relaxed"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleBulkImportLevels}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
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
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-card border rounded-3xl p-6 shadow-2xl relative space-y-4 text-foreground"
            >
              <button
                onClick={() => setShowAddSingleModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Add 1 Single Level</h3>
                  <p className="text-xs text-muted-foreground">Paste JSON object for exactly 1 level below.</p>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-1 shadow-inner">
                <textarea
                  value={singleLevelJson}
                  onChange={e => setSingleLevelJson(e.target.value)}
                  rows={8}
                  className="w-full p-4 font-mono text-xs text-slate-100 bg-transparent focus:outline-none resize-y leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t">
                <button
                  onClick={() => setShowAddSingleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSingleLevel}
                  className="bg-primary text-primary-foreground px-6 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer"
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
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl bg-card border rounded-3xl p-6 shadow-2xl relative space-y-4 text-foreground"
            >
              <button
                onClick={() => setSelectedLevelBox(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 text-amber-600 rounded-2xl font-black text-lg">
                    #{selectedLevelBox.index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold">Level #{selectedLevelBox.index + 1} Editor</h3>
                    <span className="text-xs text-muted-foreground">
                      {selectedLevelBox.isBuiltIn ? "Built-in Game Level" : "Custom Added Level"}
                    </span>
                  </div>
                </div>

                {/* Delete / Reset Button */}
                <button
                  onClick={handleDeleteSelectedLevelBox}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{selectedLevelBox.isOverridden ? "Reset Level" : "Delete Level"}</span>
                </button>
              </div>

              {/* JSON Editor Box */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Edit Level JSON Config:</label>
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-1 shadow-inner">
                  <textarea
                    value={editingLevelJson}
                    onChange={e => setEditingLevelJson(e.target.value)}
                    rows={9}
                    className="w-full p-4 font-mono text-xs text-slate-100 bg-transparent focus:outline-none resize-y leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t">
                <button
                  onClick={() => setSelectedLevelBox(null)}
                  className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSelectedLevelBox}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Save Level Edits
                </button>
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
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl bg-card border rounded-3xl p-6 shadow-2xl relative space-y-4 text-foreground"
            >
              <button
                onClick={() => setShowAiPromptModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-500 rounded-2xl">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold">AI Level Designer Prompt</h3>
                  <p className="text-xs text-muted-foreground">
                    Copy prompt for <span className="font-bold text-amber-600">{selectedGameMeta.name}</span> and send to ChatGPT/Gemini!
                  </p>
                </div>
              </div>

              <div className="relative bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs max-h-72 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
                <pre className="whitespace-pre-wrap">{selectedGameMeta.prompt}</pre>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <button
                  onClick={() => setShowAiPromptModal(false)}
                  className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={copyAiPrompt}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  {copiedPrompt ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedPrompt ? "Copied!" : "Copy AI Prompt"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
