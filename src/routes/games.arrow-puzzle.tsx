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

// ─── Puzzle Levels ──────────────────────────────────────────────────────────
// Each level is a list of arrows. Grid size is inferred from positions.
// Puzzles are hand-crafted so there's always a valid solution.

function makeLevels(): { gridSize: number; arrows: Omit<Arrow, "id">[] }[] {
  return [
    // Level 1: 3x3 easy intro
    {
      gridSize: 3,
      arrows: [
        { row: 0, col: 2, dir: "right" },
        { row: 1, col: 0, dir: "left" },
        { row: 2, col: 1, dir: "down" },
      ],
    },
    // Level 2: 3x3
    {
      gridSize: 3,
      arrows: [
        { row: 0, col: 0, dir: "up" },
        { row: 0, col: 2, dir: "right" },
        { row: 1, col: 1, dir: "left" },
        { row: 2, col: 0, dir: "down" },
        { row: 2, col: 2, dir: "down" },
      ],
    },
    // Level 3: 4x4
    {
      gridSize: 4,
      arrows: [
        { row: 0, col: 0, dir: "left" },
        { row: 0, col: 3, dir: "up" },
        { row: 1, col: 1, dir: "right" },
        { row: 1, col: 2, dir: "up" },
        { row: 2, col: 0, dir: "down" },
        { row: 3, col: 3, dir: "right" },
      ],
    },
    // Level 4: 4x4
    {
      gridSize: 4,
      arrows: [
        { row: 0, col: 1, dir: "up" },
        { row: 0, col: 3, dir: "right" },
        { row: 1, col: 0, dir: "left" },
        { row: 1, col: 2, dir: "down" },
        { row: 2, col: 1, dir: "right" },
        { row: 2, col: 3, dir: "down" },
        { row: 3, col: 0, dir: "down" },
        { row: 3, col: 2, dir: "left" },
      ],
    },
    // Level 5: 5x5
    {
      gridSize: 5,
      arrows: [
        { row: 0, col: 0, dir: "up" },
        { row: 0, col: 4, dir: "right" },
        { row: 1, col: 2, dir: "left" },
        { row: 2, col: 0, dir: "left" },
        { row: 2, col: 3, dir: "up" },
        { row: 3, col: 1, dir: "down" },
        { row: 3, col: 4, dir: "right" },
        { row: 4, col: 0, dir: "down" },
        { row: 4, col: 2, dir: "down" },
        { row: 4, col: 4, dir: "down" },
      ],
    },
    // Level 6: 5x5 harder
    {
      gridSize: 5,
      arrows: [
        { row: 0, col: 0, dir: "up" },
        { row: 0, col: 2, dir: "right" },
        { row: 0, col: 4, dir: "up" },
        { row: 1, col: 1, dir: "left" },
        { row: 1, col: 3, dir: "up" },
        { row: 2, col: 0, dir: "left" },
        { row: 2, col: 2, dir: "down" },
        { row: 2, col: 4, dir: "right" },
        { row: 3, col: 1, dir: "down" },
        { row: 3, col: 3, dir: "right" },
        { row: 4, col: 0, dir: "down" },
        { row: 4, col: 2, dir: "left" },
        { row: 4, col: 4, dir: "down" },
      ],
    },
    // Level 7: 5x5 
    {
      gridSize: 5,
      arrows: [
        { row: 0, col: 1, dir: "up" },
        { row: 0, col: 3, dir: "right" },
        { row: 1, col: 0, dir: "up" },
        { row: 1, col: 2, dir: "right" },
        { row: 1, col: 4, dir: "right" },
        { row: 2, col: 1, dir: "left" },
        { row: 2, col: 3, dir: "down" },
        { row: 3, col: 0, dir: "left" },
        { row: 3, col: 2, dir: "left" },
        { row: 3, col: 4, dir: "down" },
        { row: 4, col: 1, dir: "down" },
        { row: 4, col: 3, dir: "down" },
      ],
    },
    // Level 8: 6x6
    {
      gridSize: 6,
      arrows: [
        { row: 0, col: 0, dir: "up" },
        { row: 0, col: 3, dir: "up" },
        { row: 0, col: 5, dir: "right" },
        { row: 1, col: 1, dir: "left" },
        { row: 1, col: 4, dir: "right" },
        { row: 2, col: 0, dir: "left" },
        { row: 2, col: 2, dir: "up" },
        { row: 2, col: 5, dir: "right" },
        { row: 3, col: 1, dir: "down" },
        { row: 3, col: 3, dir: "left" },
        { row: 4, col: 0, dir: "down" },
        { row: 4, col: 4, dir: "down" },
        { row: 5, col: 2, dir: "down" },
        { row: 5, col: 5, dir: "down" },
      ],
    },
    // Level 9: 6x6 harder
    {
      gridSize: 6,
      arrows: [
        { row: 0, col: 0, dir: "up" },
        { row: 0, col: 2, dir: "right" },
        { row: 0, col: 5, dir: "right" },
        { row: 1, col: 1, dir: "up" },
        { row: 1, col: 3, dir: "left" },
        { row: 1, col: 5, dir: "up" },
        { row: 2, col: 0, dir: "left" },
        { row: 2, col: 4, dir: "right" },
        { row: 3, col: 1, dir: "down" },
        { row: 3, col: 3, dir: "right" },
        { row: 3, col: 5, dir: "down" },
        { row: 4, col: 0, dir: "left" },
        { row: 4, col: 2, dir: "down" },
        { row: 4, col: 4, dir: "down" },
        { row: 5, col: 1, dir: "down" },
        { row: 5, col: 3, dir: "left" },
        { row: 5, col: 5, dir: "down" },
      ],
    },
    // Level 10: 6x6 final
    {
      gridSize: 6,
      arrows: [
        { row: 0, col: 0, dir: "up" },
        { row: 0, col: 2, dir: "up" },
        { row: 0, col: 4, dir: "right" },
        { row: 1, col: 1, dir: "up" },
        { row: 1, col: 3, dir: "right" },
        { row: 1, col: 5, dir: "right" },
        { row: 2, col: 0, dir: "left" },
        { row: 2, col: 2, dir: "left" },
        { row: 2, col: 4, dir: "up" },
        { row: 3, col: 1, dir: "down" },
        { row: 3, col: 3, dir: "right" },
        { row: 3, col: 5, dir: "down" },
        { row: 4, col: 0, dir: "left" },
        { row: 4, col: 2, dir: "down" },
        { row: 4, col: 4, dir: "right" },
        { row: 5, col: 1, dir: "down" },
        { row: 5, col: 3, dir: "down" },
        { row: 5, col: 5, dir: "down" },
      ],
    },
  ];
}

// ─── Game Logic ─────────────────────────────────────────────────────────────
function isPathClear(arrow: Arrow, arrows: Arrow[], gridSize: number): boolean {
  const { row, col, dir } = arrow;

  // Check if the path from this arrow to the edge (in the arrow's direction) is clear
  switch (dir) {
    case "up":
      for (let r = row - 1; r >= 0; r--) {
        if (arrows.some(a => a.row === r && a.col === col)) return false;
      }
      return true;
    case "down":
      for (let r = row + 1; r < gridSize; r++) {
        if (arrows.some(a => a.row === r && a.col === col)) return false;
      }
      return true;
    case "left":
      for (let c = col - 1; c >= 0; c--) {
        if (arrows.some(a => a.row === row && a.col === c)) return false;
      }
      return true;
    case "right":
      for (let c = col + 1; c < gridSize; c++) {
        if (arrows.some(a => a.row === row && a.col === c)) return false;
      }
      return true;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
function ArrowPuzzleGame() {
  const LEVELS = useRef(makeLevels()).current;
  const [levelIdx, setLevelIdx] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Math.min(parseInt(localStorage.getItem("cx_arrow_level") || "0", 10), LEVELS.length - 1);
  });
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [moves, setMoves] = useState(0);
  const [lives, setLives] = useState(5);
  const [showHelp, setShowHelp] = useState(false);
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [exitingArrow, setExitingArrow] = useState<{ arrow: Arrow; exitAnim: { x: number; y: number } } | null>(null);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [totalCleared, setTotalCleared] = useState(0);

  const level = LEVELS[levelIdx];

  // Initialize level
  const initLevel = useCallback((idx: number) => {
    const lvl = LEVELS[idx];
    setArrows(lvl.arrows.map((a, i) => ({ ...a, id: i })));
    setMoves(0);
    setLives(5);
    setWon(false);
    setGameOver(false);
    setExitingArrow(null);
    setShakeId(null);
  }, [LEVELS]);

  useEffect(() => { initLevel(levelIdx); }, [levelIdx, initLevel]);

  const handleTap = useCallback((arrow: Arrow) => {
    if (won || gameOver || exitingArrow) return;

    if (isPathClear(arrow, arrows, level.gridSize)) {
      // Arrow can be removed — animate it sliding off
      const exit = DIR_EXIT[arrow.dir];
      setExitingArrow({ arrow, exitAnim: exit });
      setMoves(m => m + 1);
      setTotalCleared(t => t + 1);

      // Remove after animation
      setTimeout(() => {
        setArrows(prev => {
          const next = prev.filter(a => a.id !== arrow.id);
          if (next.length === 0) {
            setWon(true);
            // Save progress
            const nextLevel = Math.min(levelIdx + 1, LEVELS.length - 1);
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
      // Path blocked — shake the arrow & lose a life
      setShakeId(arrow.id);
      setTimeout(() => setShakeId(null), 500);
      setLives(prev => {
        const next = prev - 1;
        if (next <= 0) setGameOver(true);
        return next;
      });
    }
  }, [arrows, level.gridSize, won, gameOver, exitingArrow, levelIdx, LEVELS.length]);

  const nextLevel = () => {
    if (levelIdx < LEVELS.length - 1) {
      setLevelIdx(i => i + 1);
    }
  };

  const resetLevel = () => { initLevel(levelIdx); };

  const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

  // Compute which arrows are tappable (path clear)
  const tappableIds = new Set(
    arrows.filter(a => !exitingArrow && isPathClear(a, arrows, level.gridSize)).map(a => a.id)
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
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-bold text-accent tracking-tight">Level {levelIdx + 1}</span>
              <span className="text-sm font-medium text-muted-foreground">/ {LEVELS.length}</span>
            </div>
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
              gridTemplateColumns: `repeat(${level.gridSize}, 1fr)`,
              gridTemplateRows: `repeat(${level.gridSize}, 1fr)`,
              aspectRatio: "1 / 1",
            }}
          >
            {/* Empty cells */}
            {Array.from({ length: level.gridSize * level.gridSize }).map((_, i) => (
              <div
                key={`cell-${i}`}
                className="rounded-xl bg-[#ebe5dc] border border-[#d8d0c4]"
                style={{
                  gridRow: Math.floor(i / level.gridSize) + 1,
                  gridColumn: (i % level.gridSize) + 1,
                }}
              />
            ))}

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
                    {levelIdx < LEVELS.length - 1 ? "Level Cleared!" : "All Levels Done!"}
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium">
                    Solved in <strong className="text-accent">{moves}</strong> moves
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={resetLevel} variant="outline" className="border-2 border-border" style={{ borderRadius: WOBBLY_MD }}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Retry
                    </Button>
                    {levelIdx < LEVELS.length - 1 && (
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

        {/* Level selector pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {LEVELS.map((_, i) => {
            const unlocked = i <= parseInt(typeof window !== "undefined" ? localStorage.getItem("cx_arrow_level") || "0" : "0", 10);
            return (
              <button
                key={i}
                onClick={() => unlocked && setLevelIdx(i)}
                disabled={!unlocked}
                className={`h-9 w-9 rounded-xl border-2 border-border font-display font-bold text-sm transition-all ${
                  i === levelIdx
                    ? "bg-accent text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : unlocked
                    ? "bg-white text-foreground hover:bg-muted shadow-sm"
                    : "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                {unlocked ? i + 1 : "🔒"}
              </button>
            );
          })}
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
    </div>
  );
}
