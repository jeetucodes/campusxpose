import React, { useCallback, useEffect, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Trophy, Zap, Heart, Flame, Bomb, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
export const Route = createFileRoute("/games/arrow-puzzle")({
  head: () => ({
    meta: [
      { title: "Arrow Puzzle — CampusXpose Games" },
      { name: "description", content: "Tap arrows in the right order to clear the board! A fun logic puzzle on CampusXpose." },
    ],
  }),
  component: ArrowPuzzleGame,
});

// ─── Types ──────────────────────────────────────────────────────────────────
type Dir = "up" | "down" | "left" | "right";
interface Arrow { id: number; row: number; col: number; dir: Dir; }

const DIR_ICON: Record<Dir, typeof ChevronUp> = {
  up: ChevronUp, down: ChevronDown, left: ChevronLeft, right: ChevronRight,
};

const DIR_COLORS: Record<Dir, string> = {
  up: "bg-[#60a5fa] text-white shadow-[6px_6px_12px_rgba(0,0,0,0.15),inset_3px_3px_6px_rgba(255,255,255,0.6),inset_-3px_-3px_6px_rgba(30,58,138,0.3)]",
  down: "bg-[#fb7185] text-white shadow-[6px_6px_12px_rgba(0,0,0,0.15),inset_3px_3px_6px_rgba(255,255,255,0.6),inset_-3px_-3px_6px_rgba(136,19,55,0.3)]",
  left: "bg-[#34d399] text-white shadow-[6px_6px_12px_rgba(0,0,0,0.15),inset_3px_3px_6px_rgba(255,255,255,0.6),inset_-3px_-3px_6px_rgba(6,78,59,0.3)]",
  right: "bg-[#fbbf24] text-white shadow-[6px_6px_12px_rgba(0,0,0,0.15),inset_3px_3px_6px_rgba(255,255,255,0.6),inset_-3px_-3px_6px_rgba(120,53,15,0.3)]",
};

const DIR_EXIT: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -120 },
  down: { x: 0, y: 120 },
  left: { x: -120, y: 0 },
  right: { x: 120, y: 0 },
};

// ─── Procedural Level Generator ───────────────────────────────────────────────
export interface Obstacle { id: number; row: number; col: number; type: "wall" | "bomb" | "mirror-slash" | "mirror-backslash"; }

export function generateLevel(levelIdx: number): { gridSize: number; arrows: Omit<Arrow, "id">[]; obstacles: Omit<Obstacle, "id">[] } {
  let gridSize = 3;
  if (levelIdx >= 2) gridSize = 4;
  if (levelIdx >= 10) gridSize = 5;
  if (levelIdx >= 30) gridSize = 6;
  if (levelIdx >= 50) gridSize = 7;
  if (levelIdx >= 75) gridSize = 8;
  if (levelIdx >= 90) gridSize = 9;
  
  // Obstacle scaling
  let numWalls = Math.floor(levelIdx / 5);
  let numBombs = Math.floor(levelIdx / 8);
  let numMirrors = Math.floor(levelIdx / 3);
  
  // Cap obstacles at ~45% of the grid to ensure playability
  const maxObstacles = Math.floor((gridSize * gridSize) * 0.45);
  const totalDesiredObs = numWalls + numBombs + numMirrors;
  
  if (totalDesiredObs > maxObstacles) {
    const ratio = maxObstacles / totalDesiredObs;
    numWalls = Math.floor(numWalls * ratio);
    numBombs = Math.floor(numBombs * ratio);
    numMirrors = Math.floor(numMirrors * ratio);
  }
  
  // Density scaling
  const totalObs = numWalls + numBombs + numMirrors;
  const maxArrows = (gridSize * gridSize) - totalObs - 2;
  const targetArrows = 5 + Math.floor(levelIdx * 2);
  const numArrows = Math.min(maxArrows, targetArrows);
  
  const grid: ({ type: "arrow" | "wall" | "bomb" | "mirror-slash" | "mirror-backslash", dir?: Dir } | null)[][] = 
    Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  
  const obstacles: Omit<Obstacle, "id">[] = [];
  
  // 1. Place Walls, Bombs, Mirrors
  let placedObs = 0;
  let attempts = 0;
  while(placedObs < numWalls + numBombs + numMirrors && attempts < 300) {
     attempts++;
     const r = Math.floor(Math.random() * gridSize);
     const c = Math.floor(Math.random() * gridSize);
     if (grid[r][c] === null) {
       const type = placedObs < numWalls ? "wall" : placedObs < numWalls + numBombs ? "bomb" : (Math.random() > 0.5 ? "mirror-slash" : "mirror-backslash");
       grid[r][c] = { type };
       obstacles.push({row: r, col: c, type});
       placedObs++;
     }
  }
  
  // 2. Place Arrows (Backwards generation to guarantee solvability)
  const arrows: Omit<Arrow, "id">[] = [];
  
  function isPathClearInGrid(r: number, c: number, d: Dir): boolean {
    let currR = r, currC = c, currD = d;
    let steps = 0;
    while(steps < 100) {
      if (currD === "up") currR--;
      else if (currD === "down") currR++;
      else if (currD === "left") currC--;
      else if (currD === "right") currC++;
      
      if (currR < 0 || currR >= gridSize || currC < 0 || currC >= gridSize) return true;
      
      const cell = grid[currR][currC];
      if (cell) {
        if (cell.type === "mirror-slash") {
          if (currD === "up") currD = "right";
          else if (currD === "down") currD = "left";
          else if (currD === "right") currD = "up";
          else if (currD === "left") currD = "down";
        } else if (cell.type === "mirror-backslash") {
          if (currD === "up") currD = "left";
          else if (currD === "down") currD = "right";
          else if (currD === "right") currD = "down";
          else if (currD === "left") currD = "up";
        } else {
          return false;
        }
      }
      steps++;
    }
    return false;
  }

  attempts = 0;
  while(arrows.length < numArrows && attempts < 5000) {
     attempts++;
     const r = Math.floor(Math.random() * gridSize);
     const c = Math.floor(Math.random() * gridSize);
     if (grid[r][c] !== null) continue;
     
     const dirs: Dir[] = ["up", "down", "left", "right"];
     dirs.sort(() => Math.random() - 0.5);
     
     for (const d of dirs) {
        if (isPathClearInGrid(r, c, d)) {
           grid[r][c] = { type: "arrow", dir: d };
           arrows.push({ row: r, col: c, dir: d });
           break;
        }
     }
  }
  
  return { gridSize, arrows, obstacles };
}

// ─── Game Logic ─────────────────────────────────────────────────────────────
type Blocker = { type: "wall" | "bomb" | "arrow"; row: number; col: number; id: number | string };
type PathPoint = { r: number, c: number };

function tracePathFast(
  arrow: Arrow, arrowMap: Map<string, Arrow>, obsMap: Map<string, Obstacle>, gridSize: number
): { blocker: Blocker | null, path: PathPoint[] } {
  let r = arrow.row;
  let c = arrow.col;
  let d = arrow.dir;
  
  const path: PathPoint[] = [];
  let steps = 0;
  
  while (steps < 100) {
    if (d === "up") r--;
    else if (d === "down") r++;
    else if (d === "left") c--;
    else if (d === "right") c++;
    
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
      if (d === "up") path.push({r: r - 1, c});
      else if (d === "down") path.push({r: r + 1, c});
      else if (d === "left") path.push({r, c: c - 1});
      else if (d === "right") path.push({r, c: c + 1});
      return { blocker: null, path };
    }
    
    path.push({r, c});
    
    const key = `${r},${c}`;
    const a = arrowMap.get(key);
    if (a && a.id !== arrow.id) return { blocker: { type: "arrow", row: r, col: c, id: a.id }, path };
    
    const o = obsMap.get(key);
    if (o) {
      if (o.type === "mirror-slash") {
        if (d === "up") d = "right";
        else if (d === "down") d = "left";
        else if (d === "right") d = "up";
        else if (d === "left") d = "down";
      } else if (o.type === "mirror-backslash") {
        if (d === "up") d = "left";
        else if (d === "down") d = "right";
        else if (d === "right") d = "down";
        else if (d === "left") d = "up";
      } else {
        return { blocker: { type: o.type, row: r, col: c, id: `obs-${o.id}` }, path };
      }
    }
    steps++;
  }
  return { blocker: { type: "wall", row: r, col: c, id: "loop" }, path };
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function ArrowPuzzleGame() {
  const [isMounted, setIsMounted] = useState(false);
  const [levelIdx, setLevelIdx] = useState(0);
  const [highestUnlocked, setHighestUnlocked] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedLevel = parseInt(localStorage.getItem("cx_arrow_level") || "0", 10);
      if (!isNaN(savedLevel)) {
        setLevelIdx(savedLevel);
        setHighestUnlocked(savedLevel);
      }
    } catch (e) {
      console.warn("localStorage error", e);
    }
  }, []);
  
  const [levelData, setLevelData] = useState<{ gridSize: number, arrows: Arrow[], obstacles: Obstacle[] } | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [moves, setMoves] = useState(0);
  const [lives, setLives] = useState(5);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hintedArrowId, setHintedArrowId] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [shakeId, setShakeId] = useState<number | string | null>(null);
  const [exitingArrow, setExitingArrow] = useState<{ arrow: Arrow; path: PathPoint[] } | null>(null);
  const [bouncingArrow, setBouncingArrow] = useState<{ id: number; anim: { x?: number[], y?: number[] } } | null>(null);
  const [collisionAnim, setCollisionAnim] = useState<{ id: string, row: number, col: number, type: "wall"|"bomb"|"arrow" } | null>(null);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Initialize level
  const initLevel = useCallback((idx: number) => {
    const data = generateLevel(idx);
    const arrowsWithIds = data.arrows.map((a, i) => ({ ...a, id: i }));
    const obsWithIds = data.obstacles.map((o, i) => ({ ...o, id: i }));
    const fullData = { ...data, arrows: arrowsWithIds, obstacles: obsWithIds };
    
    setLevelData(fullData);
    setArrows(arrowsWithIds);
    setMoves(0);
    setLives(5);
    setHintsLeft(3);
    setHintedArrowId(null);
    setWon(false);
    setGameOver(false);
    setExitingArrow(null);
    setBouncingArrow(null);
    setCollisionAnim(null);
    setShakeId(null);
  }, []);

  useEffect(() => { initLevel(levelIdx); }, [levelIdx, initLevel]);

  const handleTap = useCallback((arrow: Arrow) => {
    if (won || gameOver || exitingArrow || bouncingArrow || !levelData) return;

    if (hintedArrowId === arrow.id) setHintedArrowId(null);

    const arrowMap = new Map<string, Arrow>();
    for (const a of arrows) arrowMap.set(`${a.row},${a.col}`, a);
    
    const obsMap = new Map<string, Obstacle>();
    for (const o of levelData.obstacles) obsMap.set(`${o.row},${o.col}`, o);

    const { blocker, path } = tracePathFast(arrow, arrowMap, obsMap, levelData.gridSize);

    if (!blocker) {
      setExitingArrow({ arrow, path });
      setMoves(m => m + 1);

      const duration = Math.max(0.2, path.length * 0.08) * 1000;
      setTimeout(() => {
        setArrows(prev => {
          const next = prev.filter(a => a.id !== arrow.id);
          if (next.length === 0) {
            setWon(true);
            const nextLevel = levelIdx + 1;
            setHighestUnlocked(prev => {
              const max = Math.max(prev, nextLevel);
              try {
                localStorage.setItem("cx_arrow_level", String(max));
              } catch (e) {
                console.warn("localStorage error", e);
              }
              return max;
            });
          }
          return next;
        });
        setExitingArrow(null);
      }, duration);
    } else {
      const offset = 30;
      const bounce = {
         up: { y: [0, -offset, 0] },
         down: { y: [0, offset, 0] },
         left: { x: [0, -offset, 0] },
         right: { x: [0, offset, 0] }
      }[arrow.dir];

      setBouncingArrow({ id: arrow.id, anim: bounce });
      
      setTimeout(() => {
        setCollisionAnim({ ...blocker, id: Date.now().toString() });
        setBouncingArrow(null);
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) setGameOver(true);
          return next;
        });
        setTimeout(() => setCollisionAnim(null), 500);
      }, 150);
    }
  }, [arrows, levelData, won, gameOver, exitingArrow, bouncingArrow, levelIdx]);

  const handleObstacleTap = useCallback((obs: Obstacle) => {
     if (won || gameOver || bouncingArrow) return;
     if (obs.type === "wall") {
        setShakeId(`obs-${obs.id}`);
        setTimeout(() => setShakeId(null), 500);
     } else if (obs.type === "bomb") {
        setShakeId(`obs-${obs.id}`);
        setTimeout(() => setShakeId(null), 500);
        setCollisionAnim({ type: "bomb", row: obs.row, col: obs.col, id: Date.now().toString() });
        setTimeout(() => setCollisionAnim(null), 500);
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) setGameOver(true);
          return next;
        });
     }
  }, [won, gameOver, bouncingArrow]);

  const nextLevel = () => setLevelIdx(i => i + 1);
  const resetLevel = () => initLevel(levelIdx);

  const tappableIds = React.useMemo(() => {
    if (!levelData) return new Set<number>();
    
    const arrowMap = new Map<string, Arrow>();
    for (const a of arrows) arrowMap.set(`${a.row},${a.col}`, a);
    
    const obsMap = new Map<string, Obstacle>();
    for (const o of levelData.obstacles) obsMap.set(`${o.row},${o.col}`, o);

    return new Set(
      arrows.filter(a => !exitingArrow && !tracePathFast(a, arrowMap, obsMap, levelData.gridSize).blocker).map(a => a.id)
    );
  }, [arrows, levelData, exitingArrow]);

  if (!isMounted || !levelData) return <div className="min-h-screen bg-background" />;

  const handleHint = () => {
    if (hintsLeft > 0 && !won && !gameOver && tappableIds.size > 0) {
      setHintsLeft(h => h - 1);
      const ids = Array.from(tappableIds);
      const randomId = ids[Math.floor(Math.random() * ids.length)];
      setHintedArrowId(randomId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-2 border-dashed border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight">Arrow Puzzle</h1>
          <div className="w-14" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">

        {/* Level & Stats Dashboard */}
        <div className="space-y-4">
          {/* Top Row: Level & Lives */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowLevels(true)} 
              className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_3px_3px_6px_rgba(255,255,255,1),inset_-3px_-3px_6px_rgba(0,0,0,0.03)] hover:scale-[1.02] active:scale-95 transition-transform outline-none"
            >
              <span className="font-display text-xl font-bold text-[#60a5fa] tracking-tight leading-none">Level {levelIdx + 1}</span>
              <span className="text-[11px] font-bold text-[#94a3b8] flex items-center bg-[#f1f5f9] px-2.5 py-1 rounded-full shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1),inset_-1px_-1px_3px_rgba(255,255,255,0.9)]">
                / 100 <ChevronDown className="h-3 w-3 ml-1" strokeWidth={3} />
              </span>
            </button>
            <div className="flex items-center gap-1.5 bg-white px-4 py-2.5 rounded-full shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_3px_3px_6px_rgba(255,255,255,1),inset_-3px_-3px_6px_rgba(0,0,0,0.03)] border-2 border-white">
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={i < lives ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0.3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="relative"
                >
                  <Heart
                    className={`h-5 w-5 ${i < lives ? "text-[#fb7185] fill-[#fb7185]" : "text-muted-foreground/30"}`}
                  />
                  {i < lives && (
                    <div className="absolute top-[3px] left-[3px] w-[5px] h-[5px] bg-white/70 rounded-full blur-[0.5px]" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom Row: Moves, Left, Reset */}
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-[24px] bg-white border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_3px_3px_6px_rgba(255,255,255,1),inset_-3px_-3px_6px_rgba(0,0,0,0.03)] p-3 flex flex-col items-center justify-center">
              <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Moves</div>
              <div className="font-display text-2xl font-bold text-[#475569] leading-none">{moves}</div>
            </div>
            <div className="flex-1 rounded-[24px] bg-white border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_3px_3px_6px_rgba(255,255,255,1),inset_-3px_-3px_6px_rgba(0,0,0,0.03)] p-3 flex flex-col items-center justify-center">
              <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Left</div>
              <div className="font-display text-2xl font-bold text-[#475569] leading-none">{arrows.length}</div>
            </div>
            <Button
              onClick={handleHint}
              disabled={hintsLeft === 0 || won || gameOver}
              variant="outline"
              size="icon"
              className={`h-[68px] w-[68px] rounded-[24px] border-2 border-white bg-white hover:bg-[#fffbeb] shrink-0 shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_3px_3px_6px_rgba(255,255,255,1),inset_-3px_-3px_6px_rgba(0,0,0,0.03)] transition-all hover:scale-105 active:scale-95 ${hintsLeft > 0 ? "text-[#fbbf24]" : "text-muted-foreground/30 opacity-60"}`}
            >
              <div className="flex flex-col items-center justify-center">
                <Lightbulb className="h-6 w-6 mb-1" strokeWidth={2.5} />
                <span className="text-[11px] font-bold leading-none bg-[#fef3c7] text-[#b45309] px-2 py-0.5 rounded-full">{hintsLeft}</span>
              </div>
            </Button>
            <Button
              onClick={resetLevel}
              variant="outline"
              size="icon"
              className="h-[68px] w-[68px] rounded-[24px] border-2 border-white bg-white hover:bg-[#f8fafc] shrink-0 shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_3px_3px_6px_rgba(255,255,255,1),inset_-3px_-3px_6px_rgba(0,0,0,0.03)] text-[#94a3b8] hover:text-[#475569] transition-all hover:scale-105 active:scale-95"
            >
              <RotateCcw className="h-6 w-6" strokeWidth={2.5} />
            </Button>
          </div>
        </div>

        {/* Game board */}
        <div className="relative w-full bg-[#e2e8f0] p-3 sm:p-4 select-none shadow-[inset_6px_6px_12px_rgba(0,0,0,0.1),inset_-6px_-6px_12px_rgba(255,255,255,0.7)] rounded-[32px]">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${levelData.gridSize}, 1fr)`,
              gridTemplateRows: `repeat(${levelData.gridSize}, 1fr)`,
              aspectRatio: "1 / 1",
            }}
          >
            {/* Empty cells */}
            {Array.from({ length: levelData.gridSize * levelData.gridSize }).map((_, i) => (
              <div
                key={`cell-${i}`}
                className="rounded-[18px] bg-[#cbd5e1] opacity-40 shadow-inner"
                style={{
                  gridRow: Math.floor(i / levelData.gridSize) + 1,
                  gridColumn: (i % levelData.gridSize) + 1,
                }}
              />
            ))}

            {/* Obstacles */}
            {levelData.obstacles.map(obs => {
              const isShaking = shakeId === `obs-${obs.id}`;
              return (
                <motion.button
                  key={`obs-${obs.id}`}
                  onClick={() => handleObstacleTap(obs)}
                  className={`absolute rounded-[18px] flex items-center justify-center ${obs.type === "wall" ? "bg-[#d6d3d1] shadow-[4px_4px_10px_rgba(0,0,0,0.15),inset_3px_3px_6px_rgba(255,255,255,0.6),inset_-3px_-3px_6px_rgba(68,64,60,0.4)] overflow-hidden" : obs.type === "bomb" ? "bg-[#3f3f46] shadow-[4px_4px_10px_rgba(0,0,0,0.2),inset_3px_3px_6px_rgba(255,255,255,0.2),inset_-3px_-3px_6px_rgba(0,0,0,0.7)]" : "bg-[#bae6fd] shadow-[4px_4px_10px_rgba(0,0,0,0.15),inset_3px_3px_6px_rgba(255,255,255,0.9),inset_-3px_-3px_6px_rgba(2,132,199,0.3)]"}`}
                  style={{
                    gridRow: obs.row + 1,
                    gridColumn: obs.col + 1,
                    position: "relative",
                  }}
                  animate={
                    isShaking
                      ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4 } }
                      : { x: 0 }
                  }
                  whileTap={{ scale: 0.95 }}
                >
                  {obs.type === "wall" && (
                     <div className="absolute inset-0 flex flex-col justify-between opacity-30">
                        <div className="h-[2px] w-full bg-stone-700" />
                        <div className="h-[2px] w-full bg-stone-700" />
                        <div className="h-[2px] w-full bg-stone-700" />
                     </div>
                  )}
                  {obs.type === "bomb" && (
                     <Bomb className="h-6 w-6 text-rose-500 animate-pulse" strokeWidth={2.5} />
                  )}
                  {obs.type === "mirror-slash" && (
                     <div className="absolute w-[120%] h-[4px] bg-sky-400 rounded-full shadow-[0_0_10px_2px_rgba(56,189,248,0.5)]" style={{ transform: "rotate(-45deg)" }} />
                  )}
                  {obs.type === "mirror-backslash" && (
                     <div className="absolute w-[120%] h-[4px] bg-sky-400 rounded-full shadow-[0_0_10px_2px_rgba(56,189,248,0.5)]" style={{ transform: "rotate(45deg)" }} />
                  )}
                </motion.button>
              );
            })}

            {/* Collision Animations */}
            <AnimatePresence>
              {collisionAnim && (
                <motion.div
                  key={`col-${collisionAnim.id}`}
                  className="absolute z-10 rounded-xl flex items-center justify-center"
                  style={{ gridRow: collisionAnim.row + 1, gridColumn: collisionAnim.col + 1, position: "relative" }}
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  {collisionAnim.type === "bomb" && (
                     <div className="absolute bg-rose-500 rounded-full w-full h-full opacity-60 shadow-[0_0_20px_10px_rgba(244,63,94,0.6)] flex items-center justify-center">
                        <Flame className="h-10 w-10 text-yellow-300" />
                     </div>
                  )}
                  {collisionAnim.type === "wall" && (
                     <div className="absolute w-full h-full border-4 border-stone-400 rounded-xl" />
                  )}
                  {collisionAnim.type === "arrow" && (
                     <div className="absolute w-full h-full flex items-center justify-center">
                        <X className="h-12 w-12 text-black/40" strokeWidth={4} />
                     </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Arrow tiles */}
            <AnimatePresence>
              {arrows.map(arrow => {
                const Icon = DIR_ICON[arrow.dir];
                const isTappable = tappableIds.has(arrow.id);
                const isShaking = shakeId === arrow.id;
                const isHinted = hintedArrowId === arrow.id;
                const isExiting = exitingArrow?.arrow.id === arrow.id;
                const bounceAnim = bouncingArrow?.id === arrow.id ? bouncingArrow.anim : null;

                return (
                  <motion.button
                    key={arrow.id}
                    onClick={() => handleTap(arrow)}
                    className={`absolute rounded-[18px] flex items-center justify-center cursor-pointer ${DIR_COLORS[arrow.dir]} transition-shadow ${
                      isTappable ? "ring-2 ring-white/50" : "opacity-80"
                    } ${isHinted ? "ring-4 ring-yellow-400 !shadow-[0_0_15px_rgba(250,204,21,1)] z-10" : ""}`}
                    style={{
                      gridRow: arrow.row + 1,
                      gridColumn: arrow.col + 1,
                      position: "relative",
                    }}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={
                      isExiting
                        ? {
                            x: exitingArrow!.path.map(p => `calc(${(p.c - exitingArrow!.arrow.col) * 100}% + ${(p.c - exitingArrow!.arrow.col) * 8}px)`),
                            y: exitingArrow!.path.map(p => `calc(${(p.r - exitingArrow!.arrow.row) * 100}% + ${(p.r - exitingArrow!.arrow.row) * 8}px)`),
                            opacity: exitingArrow!.path.map((_, i, arr) => i === arr.length - 1 ? 0 : 1),
                            scale: exitingArrow!.path.map((_, i, arr) => i === arr.length - 1 ? 0.5 : 1),
                            transition: { duration: Math.max(0.2, exitingArrow!.path.length * 0.08), ease: "linear" },
                          }
                        : bounceAnim
                        ? {
                            ...bounceAnim,
                            transition: { duration: 0.3, ease: "easeInOut" }
                          }
                        : isShaking
                        ? {
                            x: [0, -6, 6, -4, 4, 0],
                            scale: 1,
                            rotate: 0,
                            opacity: 1,
                            transition: { duration: 0.4 },
                          }
                        : { scale: 1, rotate: 0, opacity: 1, x: 0, y: 0 }
                    }
                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    whileHover={isTappable ? { scale: 1.08 } : {}}
                    whileTap={isTappable ? { scale: 0.92 } : {}}
                  >
                    <Icon className="h-6 w-6 sm:h-8 sm:w-8" strokeWidth={3} />
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Win overlay */}
          <AnimatePresence>
            {won && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/40 z-20"
                style={{ borderRadius: "32px" }}
              >
                <motion.div
                  initial={{ scale: 0.6, y: 24 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-white border-2 border-border p-8 text-center space-y-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-[90%] max-w-sm"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-6xl drop-shadow-md"
                  >
                    🎉
                  </motion.div>
                  <h2 className="font-display text-3xl font-bold text-foreground">
                    {levelIdx < 99 ? "Cleared!" : "All Done!"}
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium">
                    Solved in <strong className="text-[#60a5fa]">{moves}</strong> moves
                  </p>
                  <div className="flex flex-col gap-3 justify-center mt-2">
                    {levelIdx < 99 && (
                      <Button onClick={nextLevel} className="w-full h-12 bg-accent text-white hover:bg-accent/90 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg font-bold" style={{ borderRadius: WOBBLY_MD }}>
                        Next Level <Zap className="h-5 w-5 ml-2 fill-white" />
                      </Button>
                    )}
                    <Button onClick={resetLevel} variant="outline" className="w-full h-12 bg-white text-foreground hover:bg-muted border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg font-bold" style={{ borderRadius: WOBBLY_MD }}>
                      <RotateCcw className="h-5 w-5 mr-2" /> Retry
                    </Button>
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
                className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/40 z-20"
                style={{ borderRadius: "32px" }}
              >
                <motion.div
                  initial={{ scale: 0.6, y: 24 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-white border-2 border-border p-8 text-center space-y-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-[90%] max-w-sm"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <div className="text-6xl drop-shadow-md">💔</div>
                  <h2 className="font-display text-3xl font-bold text-foreground">Out of Lives!</h2>
                  <p className="text-muted-foreground text-sm font-medium">
                    You made <strong className="text-[#fb7185]">{moves}</strong> moves
                  </p>
                  <Button onClick={resetLevel} className="h-12 w-full mt-2 bg-rose-500 text-white hover:bg-rose-600 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg font-bold" style={{ borderRadius: WOBBLY_MD }}>
                    <RotateCcw className="h-5 w-5 mr-2" /> Try Again
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* How to play button */}
        <button 
          onClick={() => setShowHelp(true)}
          className="w-full bg-[#f8fafc] border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_2px_2px_4px_rgba(255,255,255,0.9),inset_-2px_-2px_4px_rgba(0,0,0,0.02)] p-4 font-display font-bold text-sm text-foreground hover:opacity-90 transition-opacity rounded-[20px] flex items-center justify-center gap-2"
        >
          <Lightbulb className="h-5 w-5 text-yellow-500" /> How to Play
        </button>

      </div>

      {/* How to Play Modal Overlay */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-[#f8fafc] border-2 border-white p-6 shadow-[8px_8px_20px_rgba(0,0,0,0.1),inset_4px_4px_8px_rgba(255,255,255,1),inset_-4px_-4px_8px_rgba(0,0,0,0.05)] flex flex-col relative rounded-[32px]"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowHelp(false)} 
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>

              <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-yellow-500" /> How to Play
              </h2>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Tap an arrow to send it flying off the board! An arrow can only move 
                  if the path in its direction is <strong>completely clear</strong> to the edge.
                  Clear <strong className="text-accent">all arrows</strong> to win! 🏆
                </p>
                <div className="p-3 bg-muted/40 rounded-xl space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    <strong>🧱 Walls:</strong> Cannot be moved. Arrows must go around them.
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    <strong>💣 Bombs:</strong> Explode and cost you 1 life if tapped! Don't touch them!
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center gap-3 text-sm font-medium text-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="h-5 w-5 rounded-md bg-[#60a5fa] shadow-sm inline-block" /> Up</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-5 w-5 rounded-md bg-[#fb7185] shadow-sm inline-block" /> Down</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-5 w-5 rounded-md bg-[#34d399] shadow-sm inline-block" /> Left</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-5 w-5 rounded-md bg-[#fbbf24] shadow-sm inline-block" /> Right</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Selector Modal Overlay */}
      <AnimatePresence>
        {showLevels && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowLevels(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-[#f8fafc] border-2 border-white p-6 shadow-[8px_8px_16px_rgba(0,0,0,0.1),inset_4px_4px_8px_rgba(255,255,255,1),inset_-4px_-4px_8px_rgba(0,0,0,0.02)] flex flex-col max-h-[80vh] rounded-[32px] relative"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowLevels(false)} 
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white shadow-[2px_2px_5px_rgba(0,0,0,0.05)] hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-foreground">Select Level</h2>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 pb-2 custom-scrollbar">
                <div className="flex flex-wrap gap-3 justify-center">
                  {Array.from({ length: 100 }).map((_, i) => {
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
                        className={`h-12 w-12 shrink-0 rounded-[16px] border-2 border-white font-display font-bold text-sm transition-all outline-none ${
                          i === levelIdx
                            ? "bg-[#60a5fa] text-white shadow-[4px_4px_8px_rgba(0,0,0,0.1),inset_2px_2px_4px_rgba(255,255,255,0.6),inset_-2px_-2px_4px_rgba(30,58,138,0.3)] scale-110 z-10"
                            : unlocked
                            ? "bg-white text-foreground hover:bg-[#f8fafc] shadow-[4px_4px_8px_rgba(0,0,0,0.05),inset_2px_2px_4px_rgba(255,255,255,1),inset_-2px_-2px_4px_rgba(0,0,0,0.03)] hover:scale-105 active:scale-95"
                            : "bg-[#e2e8f0] text-muted-foreground/40 cursor-not-allowed shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]"
                        }`}
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
