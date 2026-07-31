import { useCallback, useEffect, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Trophy, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  up: "bg-blue-500 text-white",
  down: "bg-rose-500 text-white",
  left: "bg-emerald-500 text-white",
  right: "bg-amber-500 text-white",
};

const DIR_EXIT: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -120 },
  down: { x: 0, y: 120 },
  left: { x: -120, y: 0 },
  right: { x: 120, y: 0 },
};

// ─── Procedural Level Generator ───────────────────────────────────────────────
export interface Obstacle { id: number; row: number; col: number; type: "wall" | "bomb"; }

export function generateLevel(levelIdx: number): { gridSize: number; arrows: Omit<Arrow, "id">[]; obstacles: Omit<Obstacle, "id">[] } {
  let gridSize = 3;
  if (levelIdx >= 5) gridSize = 4;
  if (levelIdx >= 15) gridSize = 5;
  if (levelIdx >= 30) gridSize = 6;
  if (levelIdx >= 45) gridSize = 7;
  
  // Density scaling
  const maxArrows = gridSize * gridSize - 2;
  const targetArrows = 4 + Math.floor(levelIdx * 1.5);
  const numArrows = Math.min(maxArrows, targetArrows);
  
  // Obstacle scaling
  const numWalls = Math.floor(levelIdx / 6);
  const numBombs = Math.floor(levelIdx / 12);
  
  const grid: ({ type: "arrow" | "wall" | "bomb", dir?: Dir } | null)[][] = 
    Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  
  const obstacles: Omit<Obstacle, "id">[] = [];
  
  // 1. Place Walls and Bombs
  let placedObs = 0;
  let attempts = 0;
  while(placedObs < numWalls + numBombs && attempts < 200) {
     attempts++;
     const r = Math.floor(Math.random() * gridSize);
     const c = Math.floor(Math.random() * gridSize);
     if (grid[r][c] === null) {
       const type = placedObs < numWalls ? "wall" : "bomb";
       grid[r][c] = { type };
       obstacles.push({row: r, col: c, type});
       placedObs++;
     }
  }
  
  // 2. Place Arrows (Backwards generation to guarantee solvability)
  const arrows: Omit<Arrow, "id">[] = [];
  
  function isPathClearInGrid(r: number, c: number, d: Dir): boolean {
    if (d === "up") {
      for (let i = r - 1; i >= 0; i--) if (grid[i][c] !== null) return false;
    }
    if (d === "down") {
      for (let i = r + 1; i < gridSize; i++) if (grid[i][c] !== null) return false;
    }
    if (d === "left") {
      for (let i = c - 1; i >= 0; i--) if (grid[r][i] !== null) return false;
    }
    if (d === "right") {
      for (let i = c + 1; i < gridSize; i++) if (grid[r][i] !== null) return false;
    }
    return true;
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
function isPathClear(arrow: Arrow, arrows: Arrow[], obstacles: Obstacle[], gridSize: number): boolean {
  const { row, col, dir } = arrow;

  const checkBlocker = (r: number, c: number) => {
    return arrows.some(a => a.row === r && a.col === c) || obstacles.some(o => o.row === r && o.col === c);
  };

  switch (dir) {
    case "up":
      for (let r = row - 1; r >= 0; r--) if (checkBlocker(r, col)) return false;
      return true;
    case "down":
      for (let r = row + 1; r < gridSize; r++) if (checkBlocker(r, col)) return false;
      return true;
    case "left":
      for (let c = col - 1; c >= 0; c--) if (checkBlocker(row, c)) return false;
      return true;
    case "right":
      for (let c = col + 1; c < gridSize; c++) if (checkBlocker(row, c)) return false;
      return true;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function ArrowPuzzleGame() {
  const [levelIdx, setLevelIdx] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("cx_arrow_level") || "0", 10);
  });
  
  const [levelData, setLevelData] = useState<{ gridSize: number, arrows: Arrow[], obstacles: Obstacle[] } | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [moves, setMoves] = useState(0);
  const [lives, setLives] = useState(5);
  const [showHelp, setShowHelp] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [shakeId, setShakeId] = useState<number | string | null>(null);
  const [exitingArrow, setExitingArrow] = useState<{ arrow: Arrow; exitAnim: { x: number; y: number } } | null>(null);
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
    setWon(false);
    setGameOver(false);
    setExitingArrow(null);
    setShakeId(null);
  }, []);

  useEffect(() => { initLevel(levelIdx); }, [levelIdx, initLevel]);

  const handleTap = useCallback((arrow: Arrow) => {
    if (won || gameOver || exitingArrow || !levelData) return;

    if (isPathClear(arrow, arrows, levelData.obstacles, levelData.gridSize)) {
      const exit = DIR_EXIT[arrow.dir];
      setExitingArrow({ arrow, exitAnim: exit });
      setMoves(m => m + 1);

      setTimeout(() => {
        setArrows(prev => {
          const next = prev.filter(a => a.id !== arrow.id);
          if (next.length === 0) {
            setWon(true);
            const nextLevel = levelIdx + 1;
            const savedLevel = parseInt(localStorage.getItem("cx_arrow_level") || "0", 10);
            if (nextLevel > savedLevel) {
              localStorage.setItem("cx_arrow_level", String(nextLevel));
            }
          }
          return next;
        });
        setExitingArrow(null);
      }, 300);
    } else {
      setShakeId(arrow.id);
      setTimeout(() => setShakeId(null), 500);
      setLives(prev => {
        const next = prev - 1;
        if (next <= 0) setGameOver(true);
        return next;
      });
    }
  }, [arrows, levelData, won, gameOver, exitingArrow, levelIdx]);

  const handleObstacleTap = useCallback((obs: Obstacle) => {
     if (won || gameOver) return;
     if (obs.type === "wall") {
        setShakeId(`obs-${obs.id}`);
        setTimeout(() => setShakeId(null), 500);
     } else if (obs.type === "bomb") {
        setShakeId(`obs-${obs.id}`);
        setTimeout(() => setShakeId(null), 500);
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) setGameOver(true);
          return next;
        });
     }
  }, [won, gameOver]);

  const nextLevel = () => setLevelIdx(i => i + 1);
  const resetLevel = () => initLevel(levelIdx);

  const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

  if (!levelData) return null;

  const tappableIds = new Set(
    arrows.filter(a => !exitingArrow && isPathClear(a, arrows, levelData.obstacles, levelData.gridSize)).map(a => a.id)
  );

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
        <div 
          className="border-2 border-border bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3"
          style={{ borderRadius: WOBBLY_MD }}
        >
          {/* Top Row: Level & Lives */}
          <div className="flex items-center justify-between px-1">
            <button 
              onClick={() => setShowLevels(true)} 
              className="flex items-baseline gap-1.5 hover:opacity-80 transition-opacity outline-none"
            >
              <span className="font-display text-2xl font-bold text-accent tracking-tight">Level {levelIdx + 1}</span>
              <span className="text-sm font-medium text-muted-foreground flex items-center">/ 100 <ChevronDown className="h-4 w-4 ml-1 opacity-50" /></span>
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={i < lives ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0.2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Heart
                    className={`h-5 w-5 ${i < lives ? "text-rose-500 fill-rose-500" : "text-muted-foreground/30"}`}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom Row: Moves, Left, Reset */}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-muted/40 border border-border/30 p-2 text-center">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Moves</div>
              <div className="font-display text-xl font-bold text-foreground leading-none">{moves}</div>
            </div>
            <div className="flex-1 rounded-xl bg-muted/40 border border-border/30 p-2 text-center">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Left</div>
              <div className="font-display text-xl font-bold text-foreground leading-none">{arrows.length}</div>
            </div>
            <Button
              onClick={resetLevel}
              variant="outline"
              size="icon"
              className="h-[52px] w-[52px] rounded-xl border-border/50 hover:bg-muted/80 shrink-0 bg-transparent text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Game board */}
        <div
          className="relative w-full border-2 border-border bg-[#f8f5f0] p-3 sm:p-4 select-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <div
            className="grid gap-2 sm:gap-2.5"
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
                className="rounded-xl bg-[#ebe5dc] border border-[#d8d0c4]"
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
                  className={`absolute rounded-xl flex items-center justify-center border-2 shadow-sm ${obs.type === "wall" ? "bg-stone-400 border-stone-500" : "bg-rose-200 border-rose-300"}`}
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
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="text-xl sm:text-2xl drop-shadow-sm">{obs.type === "wall" ? "🧱" : "💣"}</span>
                </motion.button>
              );
            })}

            {/* Arrow tiles */}
            <AnimatePresence>
              {arrows.map(arrow => {
                const Icon = DIR_ICON[arrow.dir];
                const isTappable = tappableIds.has(arrow.id);
                const isShaking = shakeId === arrow.id;
                const isExiting = exitingArrow?.arrow.id === arrow.id;

                return (
                  <motion.button
                    key={arrow.id}
                    onClick={() => handleTap(arrow)}
                    className={`absolute rounded-xl flex items-center justify-center cursor-pointer ${DIR_COLORS[arrow.dir]} border-2 border-black/10 shadow-md transition-shadow ${
                      isTappable ? "ring-2 ring-white/50 shadow-lg" : "opacity-80"
                    }`}
                    style={{
                      gridRow: arrow.row + 1,
                      gridColumn: arrow.col + 1,
                      position: "relative",
                    }}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={
                      isExiting
                        ? {
                            x: exitingArrow!.exitAnim.x,
                            y: exitingArrow!.exitAnim.y,
                            opacity: 0,
                            scale: 0.7,
                            transition: { duration: 0.3, ease: "easeIn" },
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
                    {/* Glow pulse for tappable arrows */}
                    {isTappable && (
                      <motion.div
                        className="absolute inset-0 rounded-xl border-2 border-white/40"
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
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
                className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/40 backdrop-blur-sm z-20"
                style={{ borderRadius: "20px" }}
              >
                <motion.div
                  initial={{ scale: 0.6, y: 24 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-white border-2 border-border p-6 text-center space-y-4 shadow-xl"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-5xl"
                  >
                    🎉
                  </motion.div>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {levelIdx < 99 ? "Level Cleared!" : "All Levels Done!"}
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium">
                    Solved in <strong className="text-accent">{moves}</strong> moves
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={resetLevel} variant="outline" className="border-2 border-border" style={{ borderRadius: WOBBLY_MD }}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Retry
                    </Button>
                    {levelIdx < 99 && (
                      <Button onClick={nextLevel} className="shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-border" style={{ borderRadius: WOBBLY_MD }}>
                        Next Level <Zap className="h-4 w-4 ml-1" />
                      </Button>
                    )}
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
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-20"
                style={{ borderRadius: "20px" }}
              >
                <motion.div
                  initial={{ scale: 0.6, y: 24 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-white border-2 border-border p-6 text-center space-y-4 shadow-xl"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <div className="text-5xl">💔</div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Out of Lives!</h2>
                  <p className="text-muted-foreground text-sm font-medium">
                    You made <strong className="text-accent">{moves}</strong> moves
                  </p>
                  <Button onClick={resetLevel} className="shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-border" style={{ borderRadius: WOBBLY_MD }}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Try Again
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* How to play */}
        <div className="border-2 border-border bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden" style={{ borderRadius: WOBBLY_MD }}>
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="flex w-full items-center justify-between p-4 font-display font-bold text-sm hover:bg-muted/50 transition-colors"
          >
            How to Play
            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showHelp ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {showHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4"
              >
                <div className="h-px w-full bg-border/50 mb-3" />
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Tap an arrow to send it flying off the board! An arrow can only move 
                  if the path in its direction is <strong>completely clear</strong> to the edge.
                  Clear <strong className="text-accent">all arrows</strong> to win! 🏆
                </p>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-2">
                  <strong>🧱 Walls:</strong> Cannot be moved. Arrows must go around them.<br/>
                  <strong>💣 Bombs:</strong> Explode and cost you 1 life if tapped! Don't touch them!
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="h-4 w-4 rounded bg-blue-500 inline-block" /> Up</span>
                  <span className="inline-flex items-center gap-1"><span className="h-4 w-4 rounded bg-rose-500 inline-block" /> Down</span>
                  <span className="inline-flex items-center gap-1"><span className="h-4 w-4 rounded bg-emerald-500 inline-block" /> Left</span>
                  <span className="inline-flex items-center gap-1"><span className="h-4 w-4 rounded bg-amber-500 inline-block" /> Right</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Level Selector Modal Overlay */}
      <AnimatePresence>
        {showLevels && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowLevels(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-white border-2 border-border p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[80vh]"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">Select Level</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowLevels(false)} className="h-8 w-8 rounded-full">
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 pb-2 custom-scrollbar">
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: 100 }).map((_, i) => {
                    const unlocked = i <= parseInt(typeof window !== "undefined" ? localStorage.getItem("cx_arrow_level") || "0" : "0", 10);
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
                        className={`h-10 w-10 shrink-0 rounded-xl border-2 border-border font-display font-bold text-sm transition-all ${
                          i === levelIdx
                            ? "bg-accent text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            : unlocked
                            ? "bg-white text-foreground hover:bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[2px]"
                            : "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
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
