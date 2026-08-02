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

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";

// ─── SVG Tile Renderers ──────────────────────────────────────────────────────

function StraightWire({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="30" y1="0" x2="30" y2="60" stroke="#000" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

function ElbowWire({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <path d="M30 0 L30 30 L60 30" fill="none" stroke="#000" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TJunctionWire({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="30" y1="0" x2="30" y2="30" stroke="#000" strokeWidth="12" strokeLinecap="round" />
      <line x1="0" y1="30" x2="60" y2="30" stroke="#000" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

function CrossWire({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="30" y1="0" x2="30" y2="60" stroke="#000" strokeWidth="12" strokeLinecap="round" />
      <line x1="0" y1="30" x2="60" y2="30" stroke="#000" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

function SourceIcon({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="30" y1="30" x2="30" y2="60" stroke="#000" strokeWidth="12" strokeLinecap="round" />
      <circle cx="30" cy="22" r="16" fill="#000" />
      <path d="M33 12 L27 21 L32 21 L27 32 L34 22 L29 22 Z" fill={powered ? "#bbf7d0" : "#fff"} />
    </svg>
  );
}

function DeviceIcon({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="30" y1="0" x2="30" y2="30" stroke="#000" strokeWidth="12" strokeLinecap="round" />
      <circle cx="30" cy="40" r="16" fill={powered ? "#fef08a" : "#fff"} stroke="#000" strokeWidth="6" />
      {powered && <circle cx="25" cy="35" r="4" fill="#fff" />}
    </svg>
  );
}

function BlockedIcon() {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="15" y1="15" x2="45" y2="45" stroke="#000" strokeWidth="12" strokeLinecap="round" />
      <line x1="45" y1="15" x2="15" y2="45" stroke="#000" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

function OverloadIcon({ powered }: { powered: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <line x1="30" y1="0" x2="30" y2="60" stroke="#000" strokeWidth="12" strokeLinecap="round" />
      <line x1="0" y1="30" x2="60" y2="30" stroke="#000" strokeWidth="12" strokeLinecap="round" />
      <circle cx="30" cy="30" r="18" fill="#f87171" stroke="#000" strokeWidth="6" />
      <text x="30" y="40" textAnchor="middle" fill="#000" fontSize="28" fontWeight="black">!</text>
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
  if (levelIdx < 8) return { label: "Tutorial", color: "#bfdbfe" };
  if (levelIdx < 18) return { label: "Easy", color: "#bbf7d0" };
  if (levelIdx < 30) return { label: "Medium", color: "#fef08a" };
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

  // Check if game disabled by Admin
  const isGameDisabled = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("cx_games_status");
      if (raw) {
        const map = JSON.parse(raw);
        return map["pipe-connect"] === false;
      }
    } catch (e) {}
    return false;
  }, []);

  const initLevel = useCallback((idx: number) => {
    let data = getPipeLevel(idx);

    // Read custom AI imported levels by Admin
    try {
      const customRaw = localStorage.getItem("cx_pipe_custom_levels");
      if (customRaw) {
        const customLevels = JSON.parse(customRaw);
        if (Array.isArray(customLevels) && customLevels.length > 0) {
          if (idx >= 30 && idx - 30 < customLevels.length) {
            data = customLevels[idx - 30];
          }
        }
      }
    } catch (e) {}

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

  if (isGameDisabled) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md space-y-4" style={{ borderRadius: WOBBLY_MD }}>
          <div className="text-6xl animate-bounce">🛠️</div>
          <h2 className="font-display text-2xl font-black text-black uppercase">Under Maintenance</h2>
          <p className="text-sm font-bold text-black/70">
            Pipe Connect has been temporarily turned OFF by Campus Admin for level upgrades. Please check back soon!
          </p>
          <Link to="/games">
            <button className="w-full h-12 bg-black text-white border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(254,240,138,1)] cursor-pointer" style={{ borderRadius: WOBBLY_SM }}>
              Back to Games Hub
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isMounted || !levelData) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f4f5]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 rounded-full border-4 border-black border-t-transparent"
      />
    </div>
  );

  const movesLeft = levelData.maxMoves - moves;
  const tier = getTierLabel(levelIdx);
  const progressPct = Math.round(((levelIdx) / TOTAL_PIPE_LEVELS) * 100);

  return (
    <div className="min-h-screen bg-[#f4f4f5]">

      {/* Header */}
      <div className="sticky top-0 z-40 border-b-4 border-black bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-black text-black hover:scale-105 transition-transform">
            <ArrowLeft className="h-5 w-5" strokeWidth={3} /> Back
          </Link>
          <div className="flex flex-col items-center">
            <h1 className="font-display text-2xl font-black tracking-tight uppercase text-black">
              Pipe Connect
            </h1>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-8 space-y-8">

        {/* Stats Dashboard */}
        <div className="space-y-6">
          {/* Top Row: Level & Lives */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowLevels(true)} 
              className="flex items-center gap-2 bg-[#fbcfe8] px-5 py-2.5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all outline-none"
              style={{ borderRadius: WOBBLY_SM }}
            >
              <span className="font-display text-xl font-black text-black tracking-tight uppercase">Level {levelIdx + 1}</span>
              <span className="text-[12px] font-black text-black/70 flex items-center bg-white px-2 py-0.5 rounded-full border-2 border-black">
                / {TOTAL_PIPE_LEVELS} <ChevronDown className="h-3 w-3 ml-1" strokeWidth={4} />
              </span>
            </button>
            <div className="flex items-center gap-1.5 bg-white px-4 py-2.5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_SM }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={i < lives ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0.3 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  <Heart
                    className={`h-5 w-5 ${i < lives ? "text-black fill-black" : "text-black/30"}`}
                  />
                  {i < lives && (
                    <div className="absolute top-[3px] left-[3px] w-[5px] h-[5px] bg-white rounded-full blur-[0.5px]" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom Row: Moves, Left, Reset */}
          <div className="flex items-stretch gap-4">
            <div className="flex-1 bg-[#bfdbfe] border-4 border-black p-3 flex flex-col items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_SM }}>
              <div className="text-[12px] font-black text-black/70 uppercase tracking-widest mb-1">Moves</div>
              <div className="font-display text-3xl font-black text-black leading-none">{moves}</div>
            </div>
            <div className="flex-1 bg-[#bbf7d0] border-4 border-black p-3 flex flex-col items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_SM }}>
              <div className="text-[12px] font-black text-black/70 uppercase tracking-widest mb-1">Left</div>
              <div className="font-display text-3xl font-black text-black leading-none">{movesLeft}</div>
            </div>
            <button
              onClick={handleHint}
              disabled={hintsLeft === 0 || won || gameOver}
              className={`w-[60px] sm:w-[70px] h-auto flex-shrink-0 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center p-0 transition-all hover:translate-y-1 hover:shadow-none ${hintsLeft > 0 ? "bg-[#fef08a] text-black" : "bg-gray-200 text-gray-400 opacity-60 hover:translate-y-0"}`}
              style={{ borderRadius: WOBBLY_SM }}
            >
              <div className="flex flex-col items-center justify-center py-2">
                <Lightbulb className="h-6 w-6 sm:h-7 sm:w-7 mb-1" strokeWidth={3} />
                <span className="text-[11px] font-black leading-none bg-white border-2 border-black text-black px-2 py-0.5 rounded-full">{hintsLeft}</span>
              </div>
            </button>
            <button
              onClick={resetLevel}
              className="w-[60px] sm:w-[70px] h-auto flex-shrink-0 border-4 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 transition-all hover:translate-y-1 hover:shadow-none p-0 flex items-center justify-center"
              style={{ borderRadius: WOBBLY_SM }}
            >
              <RotateCcw className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Game Board */}
        <div
          className="relative w-full border-4 border-black bg-white p-3 sm:p-4 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          style={{ borderRadius: WOBBLY_MD }}
        >

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
                    className="bg-black/5 border-2 border-dashed border-black/20"
                    style={{
                      gridRow: tile.row + 1,
                      gridColumn: tile.col + 1,
                      borderRadius: WOBBLY_SM
                    }}
                  />
                );
              }

              // Tile background styles
              let tileBg = "";

              if (tile.type === "blocked") {
                tileBg = "#d6d3d1";
              } else if (tile.type === "overload") {
                if (isOverloading) {
                  tileBg = "#f87171";
                } else if (isPowered) {
                  tileBg = "#fca5a5";
                } else {
                  tileBg = "#fecaca";
                }
              } else if (tile.type === "source") {
                tileBg = isPowered ? "#bbf7d0" : "#d1d5db";
              } else if (tile.type === "device") {
                tileBg = isPowered ? "#fef08a" : "#d1d5db";
              } else {
                tileBg = isPowered ? "#bfdbfe" : "#ffffff";
              }

              return (
                <motion.button
                  key={key}
                  onClick={() => handleTap(tile)}
                  disabled={tile.fixed || won || gameOver}
                  className={`flex items-center justify-center relative overflow-hidden transition-shadow border-2 border-black z-10 ${
                    tile.fixed ? "opacity-70 shadow-none scale-95 cursor-default" : "cursor-pointer hover:scale-105 active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  } ${isHinted ? "ring-4 ring-[#fef08a] !shadow-[0_0_15px_rgba(254,240,138,1)] z-20" : ""}`}
                  style={{
                    gridRow: tile.row + 1,
                    gridColumn: tile.col + 1,
                    background: tileBg,
                    borderRadius: WOBBLY_SM,
                    outline: "none",
                  }}
                  animate={
                    isOverloading
                      ? { scale: [1, 1.2, 0.9, 1.1, 1], transition: { duration: 0.5 } }
                      : isRotating
                      ? { scale: [1, 0.85, 1], transition: { duration: 0.18 } }
                      : { scale: tile.fixed ? 0.95 : 1 }
                  }
                >
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
                className="absolute inset-0 flex flex-col items-center justify-center bg-[#bbf7d0]/80 backdrop-blur-sm z-30"
                style={{ borderRadius: WOBBLY_MD }}
              >
                <motion.div
                  initial={{ scale: 0.5, y: 50, rotate: 5 }}
                  animate={{ scale: 1, y: 0, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.6 }}
                  className="bg-white border-4 border-black p-8 text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-[80%]"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-6xl"
                  >
                    🎉
                  </motion.div>
                  <h2 className="font-display text-3xl font-black text-black uppercase">
                    Circuit Complete!
                  </h2>
                  <p className="text-black/70 text-lg font-bold">
                    Solved in <strong className="text-black">{moves}</strong> moves
                  </p>
                  <div className="flex flex-col gap-3 justify-center mt-2">
                    {levelIdx < TOTAL_PIPE_LEVELS - 1 && (
                      <button onClick={nextLevel} className="w-full h-12 bg-[#fef08a] text-black hover:bg-[#fde047] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-lg font-black" style={{ borderRadius: WOBBLY_SM }}>
                        Next Level <Zap className="h-5 w-5 ml-2 fill-black text-black inline" />
                      </button>
                    )}
                    <button onClick={resetLevel} className="w-full h-12 bg-white text-black hover:bg-gray-100 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-lg font-black" style={{ borderRadius: WOBBLY_SM }}>
                      <RotateCcw className="h-5 w-5 mr-2 inline" strokeWidth={3} /> Retry
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
                className="absolute inset-0 flex flex-col items-center justify-center bg-[#fbcfe8]/80 backdrop-blur-sm z-30"
                style={{ borderRadius: WOBBLY_MD }}
              >
                <motion.div
                  initial={{ scale: 0.5, y: 50, rotate: -5 }}
                  animate={{ scale: 1, y: 0, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="bg-white border-4 border-black p-8 text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-[80%]"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <div className="text-6xl animate-bounce">💔</div>
                  <h2 className="font-display text-3xl font-black text-black uppercase">
                    {lives <= 0 ? "Out of Lives!" : "Out of Moves!"}
                  </h2>
                  <p className="text-black/70 text-lg font-bold">
                    You made <strong className="text-black">{moves}</strong> moves
                  </p>
                  <button onClick={resetLevel} className="h-12 w-full mt-2 bg-[#fbcfe8] text-black hover:bg-[#f9a8d4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-lg font-black" style={{ borderRadius: WOBBLY_SM }}>
                    <RotateCcw className="h-5 w-5 mr-2 inline" strokeWidth={3} /> Try Again
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* How to Play */}
        <button
          onClick={() => setShowHelp(true)}
          className="w-full bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 font-display font-black uppercase tracking-wide text-black hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <Lightbulb className="h-6 w-6 text-black" strokeWidth={3} /> How to Play
        </button>

      </div>

      {/* How to Play Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-black border-2 border-black"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
              <h2 className="font-display text-2xl font-black mb-4 flex items-center gap-2 uppercase">
                <Lightbulb className="h-6 w-6 text-black" strokeWidth={3} /> How to Play
              </h2>
              <div className="space-y-4">
                <p className="text-sm text-black/80 font-bold leading-relaxed">
                  Tap wire tiles to <strong className="text-black bg-black/10 px-1 rounded">rotate</strong> them 90° clockwise. Build a continuous
                  circuit from <strong className="text-black underline">Sources</strong> to
                  all <strong className="text-black underline">Devices</strong>.
                </p>
                <div className="rounded-xl p-4 space-y-2.5 border-2 border-black bg-[#fef08a] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_SM }}>
                  {[
                    { icon: "⚡", label: "Source", desc: "Emits power." },
                    { icon: "💡", label: "Device", desc: "Light it up!" },
                    { icon: "🔌", label: "Wires", desc: "Tap to rotate." },
                    { icon: "🚫", label: "Blocked", desc: "Can't pass." },
                    { icon: "⚠️", label: "Overload", desc: "Costs 1 life!" },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2">
                      <span className="text-base">{item.icon}</span>
                      <p className="text-sm text-black font-bold">
                        <strong>{item.label}:</strong> {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowLevels(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-white border-4 border-black p-6 flex flex-col max-h-[80vh] relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <button
                onClick={() => setShowLevels(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-black border-2 border-black z-10"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-black text-black uppercase">Select Level</h2>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 pb-2 custom-scrollbar">
                <div className="flex flex-wrap gap-3 justify-center">
                  {Array.from({ length: TOTAL_PIPE_LEVELS }).map((_, i) => {
                    const unlocked = i <= highestUnlocked;
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
                        className={`h-12 w-12 shrink-0 border-2 border-black font-display font-black text-sm transition-all outline-none flex items-center justify-center ${
                          i === levelIdx
                            ? "bg-[#bfdbfe] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] scale-110 z-10"
                            : unlocked
                            ? "bg-white text-black hover:bg-[#fbcfe8] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:scale-95"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                        }`}
                        style={{ borderRadius: WOBBLY_SM }}
                      >
                        {unlocked ? i + 1 : "🔒"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
