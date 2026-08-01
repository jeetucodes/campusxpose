import React, { useCallback, useEffect, useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, ChevronDown, Zap, Heart, X, Lightbulb, Trophy, Lock } from "lucide-react";
import { getPipeLevel, getConnections, PipeTile, PipeLevelData, TOTAL_PIPE_LEVELS } from "../data/pipe-puzzle-levels";

export const Route = createFileRoute("/games/pipe-connect")({
  head: () => ({
    meta: [
      { title: "Pipe Connect — CampusXpose Games" },
      { name: "description", content: "Rotate wire tiles to build an electric circuit! A fun logic puzzle on CampusXpose." },
    ],
  }),
  component: PipeConnectGame,
});

// ─── SVG Tile Renderers ──────────────────────────────────────────────────────

function StraightWire({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="30" y1="0" x2="30" y2="60"
        stroke={powered ? "#00f5ff" : "#334155"}
        strokeWidth={powered ? "9" : "6"}
        strokeLinecap="round"
      />
      {powered && (
        <>
          <line x1="30" y1="0" x2="30" y2="60"
            stroke="#7fffd4" strokeWidth="3" strokeLinecap="round" opacity="0.8"
          />
          <line x1="30" y1="0" x2="30" y2="60"
            stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6"
          />
        </>
      )}
    </svg>
  );
}

function ElbowWire({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <path d="M30 0 L30 30 L60 30"
        fill="none"
        stroke={powered ? "#00f5ff" : "#334155"}
        strokeWidth={powered ? "9" : "6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {powered && (
        <>
          <path d="M30 0 L30 30 L60 30" fill="none"
            stroke="#7fffd4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"
          />
          <path d="M30 0 L30 30 L60 30" fill="none"
            stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"
          />
        </>
      )}
    </svg>
  );
}

function TJunctionWire({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="30" y1="0" x2="30" y2="30" stroke={powered ? "#00f5ff" : "#334155"} strokeWidth={powered ? "9" : "6"} strokeLinecap="round" />
      <line x1="0" y1="30" x2="60" y2="30" stroke={powered ? "#00f5ff" : "#334155"} strokeWidth={powered ? "9" : "6"} strokeLinecap="round" />
      {powered && (
        <>
          <line x1="30" y1="0" x2="30" y2="30" stroke="#7fffd4" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <line x1="0" y1="30" x2="60" y2="30" stroke="#7fffd4" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        </>
      )}
      <circle cx="30" cy="30" r={powered ? "6" : "4"} fill={powered ? "#00f5ff" : "#334155"} />
      {powered && <circle cx="30" cy="30" r="3" fill="white" opacity="0.7" />}
    </svg>
  );
}

function CrossWire({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="30" y1="0" x2="30" y2="60" stroke={powered ? "#00f5ff" : "#334155"} strokeWidth={powered ? "9" : "6"} strokeLinecap="round" />
      <line x1="0" y1="30" x2="60" y2="30" stroke={powered ? "#00f5ff" : "#334155"} strokeWidth={powered ? "9" : "6"} strokeLinecap="round" />
      {powered && (
        <>
          <line x1="30" y1="0" x2="30" y2="60" stroke="#7fffd4" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <line x1="0" y1="30" x2="60" y2="30" stroke="#7fffd4" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        </>
      )}
      <circle cx="30" cy="30" r={powered ? "7" : "5"} fill={powered ? "#00f5ff" : "#334155"} />
      {powered && (
        <>
          <circle cx="30" cy="30" r="4" fill="#7fffd4" />
          <circle cx="30" cy="30" r="2" fill="white" />
        </>
      )}
    </svg>
  );
}

function SourceIcon({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      {/* Wire stub */}
      <line x1="30" y1="32" x2="30" y2="60"
        stroke={powered ? "#00f5ff" : "#475569"} strokeWidth="7" strokeLinecap="round"
      />
      {powered && <line x1="30" y1="32" x2="30" y2="60" stroke="#7fffd4" strokeWidth="3" strokeLinecap="round" opacity="0.8" />}
      {/* Outer ring */}
      <circle cx="30" cy="22" r="18" fill={powered ? "rgba(0,245,255,0.15)" : "rgba(71,85,105,0.2)"} />
      {/* Main circle */}
      <circle cx="30" cy="22" r="14" fill={powered ? "#059669" : "#1e293b"} stroke={powered ? "#10b981" : "#334155"} strokeWidth="2" />
      <circle cx="30" cy="22" r="10" fill={powered ? "#10b981" : "#0f172a"} />
      {/* Lightning bolt */}
      <path d="M33 12 L27 21 L32 21 L27 32 L34 22 L29 22 Z"
        fill={powered ? "#fff" : "#64748b"} />
      {/* Glow effect when powered */}
      {powered && <circle cx="30" cy="22" r="18" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />}
    </svg>
  );
}

function DeviceIcon({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      {/* Wire stub */}
      <line x1="30" y1="0" x2="30" y2="28"
        stroke={powered ? "#00f5ff" : "#475569"} strokeWidth="7" strokeLinecap="round"
      />
      {powered && <line x1="30" y1="0" x2="30" y2="28" stroke="#7fffd4" strokeWidth="3" strokeLinecap="round" opacity="0.8" />}
      {/* Outer glow ring when powered */}
      {powered && <circle cx="30" cy="40" r="19" fill="rgba(251,191,36,0.2)" />}
      {/* Bulb circle */}
      <circle cx="30" cy="40" r="15" fill={powered ? "#d97706" : "#1e293b"} stroke={powered ? "#fbbf24" : "#334155"} strokeWidth="2" />
      <circle cx="30" cy="40" r="11" fill={powered ? "#f59e0b" : "#0f172a"} />
      {/* Filament */}
      {powered ? (
        <>
          <circle cx="27" cy="37" r="5" fill="#fef9c3" opacity="0.8" />
          <line x1="26" y1="36" x2="26" y2="44" stroke="#fff7ed" strokeWidth="2" />
          <line x1="30" y1="35" x2="30" y2="45" stroke="#fff7ed" strokeWidth="2" />
          <line x1="34" y1="36" x2="34" y2="44" stroke="#fff7ed" strokeWidth="2" />
        </>
      ) : (
        <>
          <line x1="26" y1="36" x2="26" y2="44" stroke="#334155" strokeWidth="1.5" />
          <line x1="30" y1="35" x2="30" y2="45" stroke="#334155" strokeWidth="1.5" />
          <line x1="34" y1="36" x2="34" y2="44" stroke="#334155" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}

function BlockedIcon() {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <rect x="8" y="8" width="44" height="44" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
      <line x1="18" y1="18" x2="42" y2="42" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="42" y1="18" x2="18" y2="42" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function OverloadIcon({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="30" y1="0" x2="30" y2="60" stroke={powered ? "#ff4444" : "#4b5563"} strokeWidth="7" strokeLinecap="round" />
      <line x1="0" y1="30" x2="60" y2="30" stroke={powered ? "#ff4444" : "#4b5563"} strokeWidth="7" strokeLinecap="round" />
      {powered && (
        <>
          <line x1="30" y1="0" x2="30" y2="60" stroke="#ff8888" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          <line x1="0" y1="30" x2="60" y2="30" stroke="#ff8888" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        </>
      )}
      <circle cx="30" cy="30" r="15" fill={powered ? "#dc2626" : "#1e293b"} stroke={powered ? "#ff4444" : "#374151"} strokeWidth="2" />
      <circle cx="30" cy="30" r="11" fill={powered ? "#b91c1c" : "#111827"} />
      <text x="30" y="36" textAnchor="middle" fill={powered ? "#fff" : "#6b7280"} fontSize="15" fontWeight="bold">⚠</text>
    </svg>
  );
}

// ─── Power Flow Logic (BFS) ──────────────────────────────────────────────────

function computePoweredTiles(tiles: PipeTile[], gridSize: number): { powered: Set<string>; hitOverload: string | null } {
  const tileMap = new Map<string, PipeTile>();
  for (const t of tiles) {
    tileMap.set(`${t.row},${t.col}`, t);
  }

  const powered = new Set<string>();
  const queue: string[] = [];

  for (const t of tiles) {
    if (t.type === "source") {
      const key = `${t.row},${t.col}`;
      powered.add(key);
      queue.push(key);
    }
  }

  const DIRS: [number, number, number, number][] = [
    [-1, 0, 0, 2],
    [0, 1, 1, 3],
    [1, 0, 2, 0],
    [0, -1, 3, 1],
  ];

  let hitOverload: string | null = null;

  while (queue.length > 0) {
    const key = queue.shift()!;
    const [rStr, cStr] = key.split(",");
    const r = parseInt(rStr), c = parseInt(cStr);
    const tile = tileMap.get(key)!;
    const conns = getConnections(tile.type, tile.rotation);

    for (const [dr, dc, sideIdx, neighborSideIdx] of DIRS) {
      if (!conns[sideIdx]) continue;
      const nr = r + dr, nc = c + dc;
      const nKey = `${nr},${nc}`;
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
      if (powered.has(nKey)) continue;
      const neighbor = tileMap.get(nKey);
      if (!neighbor) continue;
      if (neighbor.type === "empty" || neighbor.type === "blocked") continue;
      const nConns = getConnections(neighbor.type, neighbor.rotation);
      if (!nConns[neighborSideIdx]) continue;
      if (neighbor.type === "overload") {
        hitOverload = nKey;
        powered.add(nKey);
        continue;
      }
      powered.add(nKey);
      queue.push(nKey);
    }
  }

  return { powered, hitOverload };
}

function checkWin(tiles: PipeTile[], powered: Set<string>): boolean {
  return tiles
    .filter(t => t.type === "device")
    .every(t => powered.has(`${t.row},${t.col}`));
}

// ─── Tier Labels ─────────────────────────────────────────────────────────────
function getTierLabel(levelIdx: number): { label: string; color: string } {
  if (levelIdx < 8) return { label: "Tutorial", color: "#22d3ee" };
  if (levelIdx < 18) return { label: "Easy", color: "#4ade80" };
  if (levelIdx < 30) return { label: "Medium", color: "#facc15" };
  if (levelIdx < 40) return { label: "Hard", color: "#fb923c" };
  return { label: "Expert", color: "#f87171" };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PipeConnectGame() {
  const [isMounted, setIsMounted] = useState(false);
  const [levelIdx, setLevelIdx] = useState(0);
  const [highestUnlocked, setHighestUnlocked] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = parseInt(localStorage.getItem("cx_pipe_level") || "0", 10);
      if (!isNaN(saved)) {
        setLevelIdx(saved);
        setHighestUnlocked(saved);
      }
    } catch (e) {
      console.warn("localStorage error", e);
    }
  }, []);

  const [levelData, setLevelData] = useState<PipeLevelData | null>(null);
  const [tiles, setTiles] = useState<PipeTile[]>([]);
  const [moves, setMoves] = useState(0);
  const [lives, setLives] = useState(5);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hintedTileKey, setHintedTileKey] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [overloadAnim, setOverloadAnim] = useState<{ row: number; col: number } | null>(null);
  const [rotatingTile, setRotatingTile] = useState<string | null>(null);

  const initLevel = useCallback((idx: number) => {
    const data = getPipeLevel(idx);
    setLevelData(data);
    setTiles(data.tiles);
    setMoves(0);
    setLives(5);
    setHintsLeft(3);
    setHintedTileKey(null);
    setWon(false);
    setGameOver(false);
    setOverloadAnim(null);
    setRotatingTile(null);
  }, []);

  useEffect(() => { initLevel(levelIdx); }, [levelIdx, initLevel]);

  const { powered, hitOverload } = useMemo(() => {
    if (!levelData) return { powered: new Set<string>(), hitOverload: null };
    return computePoweredTiles(tiles, levelData.gridSize);
  }, [tiles, levelData]);

  useEffect(() => {
    if (hitOverload && !won && !gameOver) {
      const [r, c] = hitOverload.split(",").map(Number);
      setOverloadAnim({ row: r, col: c });
      setTimeout(() => {
        setOverloadAnim(null);
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) setGameOver(true);
          return next;
        });
        if (levelData) {
          const data = getPipeLevel(levelIdx);
          setTiles(data.tiles);
          setMoves(0);
        }
      }, 800);
    }
  }, [hitOverload, won, gameOver, levelData, levelIdx]);

  useEffect(() => {
    if (tiles.length > 0 && !won && !gameOver && !hitOverload) {
      if (checkWin(tiles, powered)) {
        setWon(true);
        const nextLevel = levelIdx + 1;
        setHighestUnlocked(prev => {
          const max = Math.max(prev, nextLevel);
          try {
            localStorage.setItem("cx_pipe_level", String(max));
          } catch (e) {
            console.warn("localStorage error", e);
          }
          return max;
        });
      }
    }
  }, [tiles, powered, won, gameOver, hitOverload, levelIdx]);

  const handleTap = useCallback((tile: PipeTile) => {
    if (won || gameOver || tile.fixed || overloadAnim) return;
    if (!levelData) return;
    const movesLeft = levelData.maxMoves - moves;
    if (movesLeft <= 0) {
      setGameOver(true);
      return;
    }
    if (hintedTileKey === `${tile.row},${tile.col}`) setHintedTileKey(null);
    const key = `${tile.row},${tile.col}`;
    setRotatingTile(key);
    setTimeout(() => setRotatingTile(null), 250);
    setTiles(prev =>
      prev.map(t =>
        t.row === tile.row && t.col === tile.col
          ? { ...t, rotation: (t.rotation + 1) % 4 }
          : t
      )
    );
    setMoves(m => m + 1);
  }, [won, gameOver, moves, levelData, overloadAnim, hintedTileKey]);

  const handleHint = () => {
    if (hintsLeft > 0 && !won && !gameOver) {
      setHintsLeft(h => h - 1);
      const unsolved = tiles.filter(t => !t.fixed && t.type !== "empty" && t.rotation !== t.solvedRotation);
      if (unsolved.length > 0) {
        const hint = unsolved[Math.floor(Math.random() * unsolved.length)];
        setHintedTileKey(`${hint.row},${hint.col}`);
      }
    }
  };

  const nextLevel = () => setLevelIdx(i => i + 1);
  const resetLevel = () => initLevel(levelIdx);

  if (!isMounted || !levelData) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #0a0e1a 100%)" }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent"
      />
    </div>
  );

  const movesLeft = levelData.maxMoves - moves;
  const tier = getTierLabel(levelIdx);
  const progressPct = Math.round(((levelIdx) / TOTAL_PIPE_LEVELS) * 100);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #0d1526 40%, #0a0e1a 100%)" }}>

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-800/60 backdrop-blur-xl" style={{ background: "rgba(10,14,26,0.92)" }}>
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex flex-col items-center">
            <h1 className="font-bold text-lg tracking-widest uppercase" style={{ background: "linear-gradient(90deg, #00f5ff, #7fffd4, #00f5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ⚡ Pipe Connect
            </h1>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">

        {/* Level Header Card */}
        <div className="rounded-2xl border border-slate-700/50 p-4" style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(10,14,26,0.9))", boxShadow: "0 0 30px rgba(0,245,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowLevels(true)}
              className="flex items-center gap-3 group"
            >
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-0.5">Level</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black" style={{ color: "#00f5ff", textShadow: "0 0 20px rgba(0,245,255,0.5)" }}>
                    {levelIdx + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-500">/ {TOTAL_PIPE_LEVELS}</span>
                  <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors" strokeWidth={3} />
                </div>
              </div>
            </button>

            {/* Tier Badge */}
            <div className="flex items-center gap-2">
              <div
                className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border"
                style={{ color: tier.color, borderColor: `${tier.color}40`, background: `${tier.color}15`, textShadow: `0 0 10px ${tier.color}60` }}
              >
                {tier.label}
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={i < lives ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0.2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Heart className={`h-4 w-4 ${i < lives ? "fill-rose-500 text-rose-500" : "text-slate-700"}`} style={i < lives ? { filter: "drop-shadow(0 0 4px rgba(244,63,94,0.6))" } : {}} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #00f5ff, #7fffd4)", boxShadow: "0 0 8px rgba(0,245,255,0.5)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          {/* Moves Used */}
          <div className="rounded-xl border border-slate-700/40 p-3 flex flex-col items-center" style={{ background: "rgba(15,23,42,0.8)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
            <span className="text-[9px] font-black tracking-widest uppercase text-slate-500 mb-1">Moves</span>
            <span className="text-xl font-black text-slate-200">{moves}</span>
          </div>
          {/* Moves Left */}
          <div className="rounded-xl border p-3 flex flex-col items-center" style={{
            background: movesLeft <= 3 ? "rgba(239,68,68,0.1)" : "rgba(15,23,42,0.8)",
            borderColor: movesLeft <= 3 ? "rgba(239,68,68,0.4)" : "rgba(51,65,85,0.4)",
            boxShadow: movesLeft <= 3 ? "0 0 15px rgba(239,68,68,0.2)" : "inset 0 1px 0 rgba(255,255,255,0.03)"
          }}>
            <span className="text-[9px] font-black tracking-widest uppercase text-slate-500 mb-1">Left</span>
            <span className="text-xl font-black" style={{ color: movesLeft <= 3 ? "#f87171" : "#e2e8f0" }}>{movesLeft}</span>
          </div>
          {/* Hint Button */}
          <button
            onClick={handleHint}
            disabled={hintsLeft === 0 || won || gameOver}
            className="rounded-xl border p-3 flex flex-col items-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: hintsLeft > 0 ? "rgba(251,191,36,0.1)" : "rgba(15,23,42,0.8)",
              borderColor: hintsLeft > 0 ? "rgba(251,191,36,0.4)" : "rgba(51,65,85,0.4)",
              boxShadow: hintsLeft > 0 ? "0 0 15px rgba(251,191,36,0.15)" : "none"
            }}
          >
            <Lightbulb className="h-5 w-5 mb-1" style={{ color: hintsLeft > 0 ? "#fbbf24" : "#4b5563" }} strokeWidth={2.5} />
            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: hintsLeft > 0 ? "#fbbf24" : "#4b5563" }}>{hintsLeft}x</span>
          </button>
          {/* Reset Button */}
          <button
            onClick={resetLevel}
            className="rounded-xl border border-slate-700/40 p-3 flex flex-col items-center transition-all hover:scale-105 active:scale-95 hover:border-slate-600/60"
            style={{ background: "rgba(15,23,42,0.8)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}
          >
            <RotateCcw className="h-5 w-5 mb-1 text-slate-400" strokeWidth={2.5} />
            <span className="text-[9px] font-black tracking-widest uppercase text-slate-500">Reset</span>
          </button>
        </div>

        {/* Game Board */}
        <div
          className="relative w-full select-none rounded-3xl p-3"
          style={{
            background: "rgba(5,8,18,0.95)",
            border: "1px solid rgba(0,245,255,0.12)",
            boxShadow: "0 0 40px rgba(0,245,255,0.05), inset 0 0 60px rgba(0,0,0,0.5)"
          }}
        >
          {/* Circuit board grid lines (decorative) */}
          <div className="absolute inset-3 rounded-2xl overflow-hidden pointer-events-none opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00f5ff" strokeWidth="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div
            className="grid gap-2 relative z-10"
            style={{
              gridTemplateColumns: `repeat(${levelData.gridSize}, 1fr)`,
              gridTemplateRows: `repeat(${levelData.gridSize}, 1fr)`,
              aspectRatio: "1 / 1",
            }}
          >
            {tiles.map((tile) => {
              const key = `${tile.row},${tile.col}`;
              const isPowered = powered.has(key);
              const isHinted = hintedTileKey === key;
              const isRotating = rotatingTile === key;
              const isOverloading = overloadAnim && overloadAnim.row === tile.row && overloadAnim.col === tile.col;

              if (tile.type === "empty") {
                return (
                  <div
                    key={key}
                    className="rounded-xl"
                    style={{
                      gridRow: tile.row + 1,
                      gridColumn: tile.col + 1,
                      background: "rgba(5,8,18,0.6)",
                      border: "1px solid rgba(255,255,255,0.03)"
                    }}
                  />
                );
              }

              // Tile background styles
              let tileBg = "";
              let tileBorder = "";
              let tileGlow = "";

              if (tile.type === "blocked") {
                tileBg = "rgba(15,23,42,0.9)";
                tileBorder = "rgba(51,65,85,0.6)";
              } else if (tile.type === "overload") {
                if (isOverloading) {
                  tileBg = "rgba(239,68,68,0.8)";
                  tileBorder = "#ef4444";
                  tileGlow = "0 0 30px rgba(239,68,68,0.8)";
                } else if (isPowered) {
                  tileBg = "rgba(127,29,29,0.9)";
                  tileBorder = "rgba(239,68,68,0.5)";
                  tileGlow = "0 0 15px rgba(239,68,68,0.3)";
                } else {
                  tileBg = "rgba(17,24,39,0.9)";
                  tileBorder = "rgba(75,85,99,0.5)";
                }
              } else if (tile.type === "source") {
                tileBg = isPowered ? "rgba(4,47,46,0.9)" : "rgba(15,23,42,0.9)";
                tileBorder = isPowered ? "rgba(16,185,129,0.6)" : "rgba(51,65,85,0.6)";
                if (isPowered) tileGlow = "0 0 20px rgba(16,185,129,0.3)";
              } else if (tile.type === "device") {
                tileBg = isPowered ? "rgba(69,26,3,0.9)" : "rgba(15,23,42,0.9)";
                tileBorder = isPowered ? "rgba(251,191,36,0.6)" : "rgba(51,65,85,0.6)";
                if (isPowered) tileGlow = "0 0 25px rgba(251,191,36,0.4)";
              } else {
                // Wire tiles
                tileBg = isPowered ? "rgba(0,30,40,0.95)" : "rgba(15,23,42,0.9)";
                tileBorder = isPowered ? "rgba(0,245,255,0.4)" : "rgba(51,65,85,0.5)";
                if (isPowered) tileGlow = "0 0 15px rgba(0,245,255,0.15)";
              }

              return (
                <motion.button
                  key={key}
                  onClick={() => handleTap(tile)}
                  disabled={tile.fixed || won || gameOver}
                  className="rounded-xl flex items-center justify-center relative overflow-hidden transition-shadow"
                  style={{
                    gridRow: tile.row + 1,
                    gridColumn: tile.col + 1,
                    background: tileBg,
                    border: `1px solid ${tileBorder}`,
                    boxShadow: isHinted ? "0 0 0 2px #fbbf24, 0 0 20px rgba(251,191,36,0.5)" : tileGlow || "inset 0 1px 0 rgba(255,255,255,0.04)",
                    outline: "none",
                  }}
                  animate={
                    isOverloading
                      ? { scale: [1, 1.3, 0.85, 1.1, 1], transition: { duration: 0.5 } }
                      : isRotating
                      ? { scale: [1, 0.88, 1], transition: { duration: 0.18 } }
                      : { scale: 1 }
                  }
                  whileHover={!tile.fixed && !won && !gameOver ? { scale: 1.08, transition: { duration: 0.1 } } : {}}
                  whileTap={!tile.fixed && !won && !gameOver ? { scale: 0.9 } : {}}
                >
                  {/* Powered pulse overlay */}
                  {isPowered && tile.type !== "blocked" && tile.type !== "overload" && (
                    <motion.div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      animate={{ opacity: [0.05, 0.15, 0.05] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ background: tile.type === "device" ? "rgba(251,191,36,0.3)" : tile.type === "source" ? "rgba(16,185,129,0.3)" : "rgba(0,245,255,0.2)" }}
                    />
                  )}

                  <div
                    className="w-[76%] h-[76%] relative"
                    style={{
                      transform: `rotate(${tile.rotation * 90}deg)`,
                      transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  >
                    {tile.type === "straight" && <StraightWire powered={isPowered} />}
                    {tile.type === "elbow" && <ElbowWire powered={isPowered} />}
                    {tile.type === "t-junction" && <TJunctionWire powered={isPowered} />}
                    {tile.type === "cross" && <CrossWire powered={isPowered} />}
                    {tile.type === "source" && <SourceIcon powered={isPowered} />}
                    {tile.type === "device" && <DeviceIcon powered={isPowered} />}
                    {tile.type === "blocked" && <BlockedIcon />}
                    {tile.type === "overload" && <OverloadIcon powered={isPowered} />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Win overlay */}
          <AnimatePresence>
            {won && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl z-20"
                style={{ background: "rgba(0,10,20,0.85)", backdropFilter: "blur(8px)" }}
              >
                <motion.div
                  initial={{ scale: 0.5, y: 30 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  className="rounded-2xl p-7 text-center w-[88%] max-w-sm"
                  style={{ background: "linear-gradient(135deg, rgba(4,47,46,0.95), rgba(5,8,18,0.95))", border: "1px solid rgba(0,245,255,0.3)", boxShadow: "0 0 50px rgba(0,245,255,0.15)" }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, -8, 8, 0] }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                    className="text-6xl mb-4"
                  >⚡</motion.div>
                  <h2 className="text-2xl font-black mb-1" style={{ color: "#00f5ff", textShadow: "0 0 20px rgba(0,245,255,0.5)" }}>
                    Circuit Complete!
                  </h2>
                  <p className="text-slate-400 text-sm font-medium mb-5">
                    Solved in <strong style={{ color: "#fbbf24" }}>{moves}</strong> moves
                  </p>
                  <div className="flex flex-col gap-3">
                    {levelIdx < TOTAL_PIPE_LEVELS - 1 && (
                      <button
                        onClick={nextLevel}
                        className="w-full h-11 rounded-xl font-black text-sm tracking-widest uppercase transition-all hover:scale-105 active:scale-95"
                        style={{ background: "linear-gradient(135deg, #00f5ff, #059669)", color: "#000", boxShadow: "0 0 20px rgba(0,245,255,0.3)" }}
                      >
                        Next Level ⚡
                      </button>
                    )}
                    <button
                      onClick={resetLevel}
                      className="w-full h-11 rounded-xl font-bold text-sm tracking-wider border border-slate-700 text-slate-300 hover:border-slate-500 transition-all"
                      style={{ background: "rgba(15,23,42,0.8)" }}
                    >
                      Retry Level
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Over overlay */}
          <AnimatePresence>
            {gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl z-20"
                style={{ background: "rgba(0,5,10,0.88)", backdropFilter: "blur(8px)" }}
              >
                <motion.div
                  initial={{ scale: 0.5, y: 30 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  className="rounded-2xl p-7 text-center w-[88%] max-w-sm"
                  style={{ background: "linear-gradient(135deg, rgba(69,10,10,0.95), rgba(5,8,18,0.95))", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 0 50px rgba(239,68,68,0.1)" }}
                >
                  <div className="text-6xl mb-4">💔</div>
                  <h2 className="text-2xl font-black mb-1 text-rose-400">
                    {lives <= 0 ? "Out of Lives!" : "Out of Moves!"}
                  </h2>
                  <p className="text-slate-400 text-sm font-medium mb-5">
                    You made <strong className="text-rose-400">{moves}</strong> moves
                  </p>
                  <button
                    onClick={resetLevel}
                    className="w-full h-11 rounded-xl font-black text-sm tracking-widest uppercase transition-all hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)", color: "#fff", boxShadow: "0 0 20px rgba(220,38,38,0.3)" }}
                  >
                    Try Again
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* How to Play */}
        <button
          onClick={() => setShowHelp(true)}
          className="w-full rounded-xl border border-slate-700/50 p-3 font-bold text-sm text-slate-400 hover:text-cyan-400 hover:border-cyan-400/30 transition-all flex items-center justify-center gap-2"
          style={{ background: "rgba(15,23,42,0.6)" }}
        >
          <Lightbulb className="h-4 w-4" /> How to Play
        </button>

      </div>

      {/* How to Play Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-6 relative"
              style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(10,14,26,0.98))", border: "1px solid rgba(0,245,255,0.2)", boxShadow: "0 0 60px rgba(0,245,255,0.1)" }}
            >
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-xl font-black mb-5 flex items-center gap-2" style={{ color: "#00f5ff" }}>
                <Zap className="h-5 w-5" /> How to Play
              </h2>
              <div className="space-y-3">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Tap wire tiles to <strong className="text-cyan-400">rotate</strong> them 90° clockwise. Build a continuous
                  circuit from <strong className="text-emerald-400">⚡ Sources</strong> to
                  all <strong className="text-amber-400">💡 Devices</strong>.
                </p>
                <div className="rounded-xl p-4 space-y-2.5" style={{ background: "rgba(5,8,18,0.8)", border: "1px solid rgba(51,65,85,0.5)" }}>
                  {[
                    { icon: "⚡", label: "Source", desc: "Fixed. Emits power in one direction.", color: "#10b981" },
                    { icon: "💡", label: "Device", desc: "Fixed. Light it up to win!", color: "#fbbf24" },
                    { icon: "🔌", label: "Wires", desc: "Straight, corner, T-junction, cross. Tap to rotate!", color: "#00f5ff" },
                    { icon: "🚫", label: "Blocked", desc: "Broken tile. Power can't pass through.", color: "#64748b" },
                    { icon: "⚠️", label: "Overload", desc: "Danger! Touching it costs you a life!", color: "#f87171" },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="text-base">{item.icon}</span>
                      <p className="text-sm text-slate-400 font-medium">
                        <strong style={{ color: item.color }}>{item.label}:</strong> {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 italic text-center">Plan carefully — you have limited moves per level!</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Selector Modal */}
      <AnimatePresence>
        {showLevels && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowLevels(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-5 relative flex flex-col max-h-[80vh]"
              style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.99), rgba(10,14,26,0.99))", border: "1px solid rgba(0,245,255,0.15)", boxShadow: "0 0 60px rgba(0,0,0,0.8)" }}
            >
              <button
                onClick={() => setShowLevels(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center border border-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-xl font-black mb-1" style={{ color: "#00f5ff" }}>
                Select Level
              </h2>
              <p className="text-xs text-slate-500 mb-4 font-medium">Progress: {highestUnlocked + 1} / {TOTAL_PIPE_LEVELS}</p>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {[
                  { label: "Tutorial", range: [0, 7], color: "#22d3ee" },
                  { label: "Easy", range: [8, 17], color: "#4ade80" },
                  { label: "Medium", range: [18, 29], color: "#facc15" },
                  { label: "Hard", range: [30, 39], color: "#fb923c" },
                  { label: "Expert", range: [40, 49], color: "#f87171" },
                ].map(({ label, range, color }) => (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }} />
                      <span className="text-[10px] font-black tracking-widest uppercase" style={{ color }}>{label}</span>
                      <div className="h-px flex-1" style={{ background: `linear-gradient(270deg, ${color}40, transparent)` }} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: range[1] - range[0] + 1 }, (_, idx) => range[0] + idx).map(i => {
                        const unlocked = i <= highestUnlocked;
                        const current = i === levelIdx;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (unlocked) {
                                setLevelIdx(i);
                                setShowLevels(false);
                              }
                            }}
                            disabled={!unlocked}
                            className="h-10 w-10 rounded-xl font-black text-sm transition-all relative"
                            style={{
                              background: current
                                ? `linear-gradient(135deg, ${color}40, ${color}20)`
                                : unlocked
                                ? "rgba(15,23,42,0.8)"
                                : "rgba(10,14,26,0.5)",
                              border: `1px solid ${current ? color : unlocked ? "rgba(51,65,85,0.6)" : "rgba(30,41,59,0.5)"}`,
                              color: current ? color : unlocked ? "#94a3b8" : "#1e293b",
                              boxShadow: current ? `0 0 12px ${color}40` : "none",
                              transform: current ? "scale(1.12)" : "scale(1)",
                            }}
                          >
                            {unlocked ? i + 1 : <Lock className="h-3 w-3 mx-auto opacity-30" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
