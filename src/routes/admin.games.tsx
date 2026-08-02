import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Info, Copy, Check, Plus, Trash2, Power, Sparkles, Code, Layers, X, ExternalLink, Activity, ShieldCheck, Terminal, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/games")({
  component: AdminGamesManagement,
});

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
  desc: string;
  color: string;
  storageKey: string;
  prompt: string;
  sampleJson: string;
}

const ALL_GAMES: GameMeta[] = [
  {
    id: "arrow-puzzle",
    name: "Arrow Puzzle",
    emoji: "🏹",
    link: "/games/arrow-puzzle",
    desc: "100+ Logic Deflector & Mirror Levels",
    color: "from-amber-500/10 via-orange-500/10 to-amber-500/5 border-amber-500/30",
    storageKey: "cx_arrow_custom_levels",
    prompt: `Act as a Level Designer for Arrow Puzzle.
Generate a valid JSON object or JSON array for an Arrow Puzzle level.

Game Mechanics:
- Grid size: 5x5 or 6x6.
- Arrows: direction "up", "down", "left", "right".
- Mirror Slash "/": Up->Right, Down->Left, Right->Up, Left->Down.
- Mirror Backslash "\\": Up->Left, Down->Right, Right->Down, Left->Up.
- Obstacles: "wall", "bomb", "ice", "rotator", "gate-up", "gate-down".

Required JSON Format:
{
  "gridSize": 5,
  "arrows": [
    { "id": 0, "row": 1, "col": 1, "dir": "up" },
    { "id": 1, "row": 3, "col": 2, "dir": "right" }
  ],
  "obstacles": [
    { "id": 0, "row": 1, "col": 2, "type": "mirror-slash" },
    { "id": 1, "row": 2, "col": 2, "type": "wall" },
    { "id": 2, "row": 4, "col": 1, "type": "bomb" }
  ]
}`,
    sampleJson: `{
  "gridSize": 5,
  "arrows": [{ "id": 0, "row": 1, "col": 1, "dir": "up" }],
  "obstacles": [{ "id": 0, "row": 1, "col": 2, "type": "mirror-slash" }]
}`,
  },
  {
    id: "pipe-connect",
    name: "Pipe Connect",
    emoji: "⚡",
    link: "/games/pipe-connect",
    desc: "Circuit Wiring & Electrical Node Puzzles",
    color: "from-blue-500/10 via-indigo-500/10 to-blue-500/5 border-blue-500/30",
    storageKey: "cx_pipe_custom_levels",
    prompt: `Act as a Level Designer for Pipe Connect Circuit Game.
Generate a valid JSON object or JSON array for a Pipe Connect circuit level.

Tile Types:
- "source" (electric power source, fixed: true)
- "device" (target bulb node to power, fixed: true)
- "straight", "elbow", "t-junction", "cross" (rotatable wires)
- "blocked" (impassable wall, fixed: true)
- "overload" (hazard trap, fixed: true)

Required JSON Format:
{
  "gridSize": 4,
  "maxMoves": 15,
  "tiles": [
    { "row": 0, "col": 0, "type": "source", "rotation": 0, "solvedRotation": 0, "fixed": true },
    { "row": 0, "col": 1, "type": "straight", "rotation": 1, "solvedRotation": 1, "fixed": false },
    { "row": 0, "col": 2, "type": "device", "rotation": 0, "solvedRotation": 0, "fixed": true }
  ]
}`,
    sampleJson: `{
  "gridSize": 4,
  "maxMoves": 12,
  "tiles": [
    { "row": 0, "col": 0, "type": "source", "rotation": 0, "solvedRotation": 0, "fixed": true },
    { "row": 0, "col": 1, "type": "elbow", "rotation": 2, "solvedRotation": 0, "fixed": false },
    { "row": 1, "col": 1, "type": "device", "rotation": 0, "solvedRotation": 0, "fixed": true }
  ]
}`,
  },
  {
    id: "2048",
    name: "2048 Classic",
    emoji: "🧩",
    link: "/games/2048",
    desc: "Custom Preset Board Challenges & High Score Modes",
    color: "from-pink-500/10 via-purple-500/10 to-pink-500/5 border-pink-500/30",
    storageKey: "cx_2048_custom_levels",
    prompt: `Act as a Level Designer for 2048 Puzzle Game.
Generate a custom challenge starting board or target goal JSON.

Required JSON Format:
{
  "title": "Super 4096 Challenge",
  "targetTile": 4096,
  "initialBoard": [
    [0, 2, 4, 8],
    [16, 32, 64, 128],
    [256, 512, 1024, 0],
    [0, 0, 0, 2]
  ]
}`,
    sampleJson: `{
  "title": "Master 4096 Sprint",
  "targetTile": 4096,
  "initialBoard": [
    [0, 2, 4, 8],
    [16, 32, 64, 128],
    [256, 512, 1024, 0],
    [0, 0, 0, 2]
  ]
}`,
  },
  {
    id: "memory-match",
    name: "Memory Match",
    emoji: "🃏",
    link: "/games/memory-match",
    desc: "Speed Brain Emoji Card Pairs & Timed Levels",
    color: "from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border-emerald-500/30",
    storageKey: "cx_memory_custom_levels",
    prompt: `Act as a Level Designer for Memory Match Game.
Generate a valid level JSON with pair count, timer limit, and card emoji theme.

Required JSON Format:
{
  "title": "Speed Cyber Match",
  "timeLimit": 45,
  "gridPairs": 8,
  "emojis": ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑"]
}`,
    sampleJson: `{
  "title": "Speed Cyber Match",
  "timeLimit": 45,
  "gridPairs": 8,
  "emojis": ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑"]
}`,
  },
];

export default function AdminGamesManagement() {
  const [gameStatus, setGameStatus] = useState<GameStatusMap>({
    "arrow-puzzle": true,
    "pipe-connect": true,
    "2048": true,
    "memory-match": true,
  });

  const [selectedGameId, setSelectedGameId] = useState<GameId>("arrow-puzzle");
  const [showAiPromptModal, setShowAiPromptModal] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [codeToImport, setCodeToImport] = useState("");
  const [customLevels, setCustomLevels] = useState<any[]>([]);

  const selectedGameMeta = ALL_GAMES.find(g => g.id === selectedGameId) || ALL_GAMES[0];

  useEffect(() => {
    try {
      const savedStatus = localStorage.getItem(GAMES_STATUS_KEY);
      if (savedStatus) {
        setGameStatus(JSON.parse(savedStatus));
      }
    } catch (e) {
      console.warn("Storage load error", e);
    }
  }, []);

  // Reload custom levels whenever selected game changes
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem(selectedGameMeta.storageKey);
      if (savedCustom) {
        setCustomLevels(JSON.parse(savedCustom));
      } else {
        setCustomLevels([]);
      }
    } catch (e) {
      setCustomLevels([]);
    }
  }, [selectedGameId, selectedGameMeta.storageKey]);

  const toggleGame = (gameId: string) => {
    const updated = { ...gameStatus, [gameId]: !gameStatus[gameId] };
    setGameStatus(updated);
    localStorage.setItem(GAMES_STATUS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("cx_games_status_change"));
    toast.success(`${gameId} status updated to ${updated[gameId] ? "ONLINE" : "OFFLINE"}`);
  };

  const copyAiPrompt = () => {
    navigator.clipboard.writeText(selectedGameMeta.prompt);
    setCopiedPrompt(true);
    toast.success(`AI Prompt for ${selectedGameMeta.name} copied to clipboard!`);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleImportLevel = () => {
    if (!codeToImport.trim()) {
      toast.error("Please paste the AI generated level code JSON!");
      return;
    }

    try {
      const parsed = JSON.parse(codeToImport);
      let newLevels: any[] = [];

      if (Array.isArray(parsed)) {
        newLevels = parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        newLevels = [parsed];
      } else {
        throw new Error("Invalid level format");
      }

      const updatedList = [...customLevels, ...newLevels];
      setCustomLevels(updatedList);
      localStorage.setItem(selectedGameMeta.storageKey, JSON.stringify(updatedList));

      toast.success(`Successfully imported ${newLevels.length} new level(s) for ${selectedGameMeta.name}! 🎉`);
      setCodeToImport("");
    } catch (e) {
      toast.error("Invalid JSON code format! Please check the AI code snippet.");
    }
  };

  const handleDeleteCustomLevel = (index: number) => {
    const updatedList = customLevels.filter((_, i) => i !== index);
    setCustomLevels(updatedList);
    localStorage.setItem(selectedGameMeta.storageKey, JSON.stringify(updatedList));
    toast.success("Custom level deleted");
  };

  const onlineCount = Object.values(gameStatus).filter(Boolean).length;

  return (
    <div className="flex h-full flex-col p-4 md:p-8 max-w-6xl mx-auto w-full space-y-8">
      
      {/* ─── Hero Header Banner ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" /> ARCADE STUDIO CONTROL
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-amber-400" /> Games & AI Level Studio
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl font-medium leading-relaxed">
              Control game availability, toggle maintenance statuses, and generate AI-crafted level packs for all CampusXpose mini-games.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
              <Activity className="h-5 w-5 text-emerald-400" />
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Games</div>
                <div className="text-lg font-black text-emerald-400">{onlineCount} / {ALL_GAMES.length} Online</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
              <Layers className="h-5 w-5 text-amber-400" />
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Game</div>
                <div className="text-lg font-black text-amber-300">{selectedGameMeta.name} {selectedGameMeta.emoji}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -right-8 -bottom-8 opacity-10 text-9xl select-none pointer-events-none">
          🎮
        </div>
      </div>

      {/* ─── 1. GAMES ON/OFF TOGGLE CONTROL CARDS ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Power className="h-5 w-5 text-emerald-500" /> Mini Games Availability (ON / OFF)
            </h2>
            <p className="text-xs text-muted-foreground">
              Toggle servers and game availability. Turning off a game instantly displays an offline maintenance card to players.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ALL_GAMES.map(game => {
            const isOnline = gameStatus[game.id] !== false;
            return (
              <motion.div
                key={game.id}
                whileHover={{ scale: 1.01 }}
                className={`p-5 rounded-3xl border bg-gradient-to-br ${game.color} bg-card shadow-sm flex flex-col justify-between space-y-4 transition-all`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-background border flex items-center justify-center text-2xl shadow-sm">
                      {game.emoji}
                    </div>
                    <div>
                      <div className="font-extrabold text-base flex items-center gap-2">
                        {game.name}
                        <Link to={game.link} target="_blank" className="text-muted-foreground hover:text-primary transition-colors" title="Playtest Game">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{game.desc}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-sm ${
                    isOnline ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-rose-500 text-white shadow-rose-500/20"
                  }`}>
                    {isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>{isOnline ? "Accessible to all students" : "Maintenance Lock Enabled"}</span>
                  </span>

                  <button
                    onClick={() => toggleGame(game.id)}
                    className={`px-5 py-2 rounded-2xl text-xs font-black transition-all shadow-md cursor-pointer ${
                      isOnline
                        ? "bg-rose-500 hover:bg-rose-600 text-white hover:shadow-rose-500/30"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-emerald-500/30"
                    }`}
                  >
                    {isOnline ? "Turn OFF Game" : "Turn ON Game"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─── 2. UNIVERSAL AI LEVEL BUILDER STUDIO ─────────────────────── */}
      <div className="rounded-3xl border bg-card p-6 shadow-md space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" /> Universal AI Level Generator & Importer
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a target game, copy its optimized AI prompt, and paste the generated JSON code to add custom level packs!
            </p>
          </div>

          {/* ℹ️ AI Prompt Info Button */}
          <button
            onClick={() => setShowAiPromptModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-2xl text-xs font-extrabold shadow-md transition-all hover:scale-105 cursor-pointer shrink-0"
          >
            <Info className="h-4 w-4" />
            <span>ℹ️ Get AI Prompt ({selectedGameMeta.name})</span>
          </button>
        </div>

        {/* Game Selection Tab Switcher */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Game to Add Levels For:</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_GAMES.map(g => {
              const isSelected = selectedGameId === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGameId(g.id)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                      : "bg-slate-50 hover:bg-slate-100 text-foreground border-border"
                  }`}
                >
                  <span className="text-xl">{g.emoji}</span>
                  <div>
                    <div className="font-extrabold text-xs leading-tight">{g.name}</div>
                    <div className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      Level Pack Builder
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Import Textarea Box */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold flex items-center gap-2">
              <Terminal className="h-4 w-4 text-blue-500" /> Paste AI-Generated JSON Code for <span className="text-primary font-extrabold">{selectedGameMeta.name} {selectedGameMeta.emoji}</span>
            </label>

            <button
              onClick={() => setCodeToImport(selectedGameMeta.sampleJson)}
              className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Load Sample Template
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-1 shadow-inner">
            <textarea
              value={codeToImport}
              onChange={e => setCodeToImport(e.target.value)}
              placeholder={`Paste AI code snippet here for ${selectedGameMeta.name}...\nExample:\n${selectedGameMeta.sampleJson}`}
              rows={6}
              className="w-full p-4 font-mono text-xs text-slate-100 bg-transparent focus:outline-none resize-y leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" /> Supports single level object or JSON array of levels
            </span>

            <button
              onClick={handleImportLevel}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-xs font-extrabold shadow-lg transition-all hover:scale-105 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Import & Add Level to {selectedGameMeta.name}
            </button>
          </div>
        </div>

        {/* Custom Added Levels Grid */}
        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-500" /> Loaded Custom Levels for {selectedGameMeta.name} ({customLevels.length})
            </h3>

            {customLevels.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2.5 py-0.5 rounded-full">
                Active in Game
              </span>
            )}
          </div>

          {customLevels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {customLevels.map((lvl, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded-2xl bg-card shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-sm text-foreground">
                        {lvl.title ? lvl.title : `Custom Level #${idx + 1}`}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {lvl.gridSize ? `Grid ${lvl.gridSize}x${lvl.gridSize}` : "Custom Config"}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteCustomLevel(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                      title="Delete level"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="bg-slate-900 text-slate-300 p-2.5 rounded-xl font-mono text-[10px] truncate border border-slate-800">
                    {JSON.stringify(lvl)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 border border-dashed rounded-2xl text-center space-y-2 bg-slate-50/50">
              <p className="text-xs font-bold text-muted-foreground">No custom levels added yet for {selectedGameMeta.name}.</p>
              <p className="text-[11px] text-muted-foreground">
                Click the <span className="font-bold text-amber-600">"ℹ️ Get AI Prompt"</span> button above to copy the prompt and generate new level codes!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── AI PROMPT MODAL ─────────────────────────────────────────────── */}
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
              className="w-full max-w-xl bg-card border rounded-3xl p-6 shadow-2xl relative space-y-5"
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
                    Copy this prompt for <span className="font-bold text-amber-600">{selectedGameMeta.name} {selectedGameMeta.emoji}</span> and give it to ChatGPT / Gemini / Claude.
                  </p>
                </div>
              </div>

              <div className="relative bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs max-h-72 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
                <pre className="whitespace-pre-wrap">{selectedGameMeta.prompt}</pre>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs font-bold text-muted-foreground">
                  Paste the generated JSON in the code box.
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAiPromptModal(false)}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={copyAiPrompt}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-2xl text-xs font-extrabold shadow-md transition-all hover:scale-105 cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedPrompt ? "Copied to Clipboard!" : "Copy AI Prompt"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
