import React, { useCallback, useEffect, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Trophy, Zap, Heart, Flame, Bomb, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";
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
import { getStaticLevel, LevelData, ArrowData as Arrow, ObstacleData as Obstacle } from "../data/arrow-puzzle-levels";
type Dir = "up" | "down" | "left" | "right";

const DIR_ICON: Record<Dir, typeof ChevronUp> = {
  up: ChevronUp, down: ChevronDown, left: ChevronLeft, right: ChevronRight,
};

const DIR_COLORS: Record<Dir, string> = {
  up: "bg-[#bfdbfe] text-black",
  down: "bg-[#fbcfe8] text-black",
  left: "bg-[#bbf7d0] text-black",
  right: "bg-[#fef08a] text-black",
};

const DIR_EXIT: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -120 },
  down: { x: 0, y: 120 },
  left: { x: -120, y: 0 },
  right: { x: 120, y: 0 },
};

// ─── Procedural Level Generator ───────────────────────────────────────────────
// Generator imported from static levels

// ─── Game Logic ─────────────────────────────────────────────────────────────
type Blocker = { type: "wall" | "bomb" | "arrow"; row: number; col: number; id: number | string };
type PathPoint = { r: number, c: number };

function tracePathFast(
  arrow: Arrow, arrowMap: Map<string, Arrow>, obsMap: Map<string, Obstacle>, gridSize: number
): { blocker: Blocker | null, path: PathPoint[], hitRotators: string[] } {
  let r = arrow.row;
  let c = arrow.col;
  let d = arrow.dir;
  
  const path: PathPoint[] = [];
  const hitRotators: string[] = [];
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
      return { blocker: null, path, hitRotators };
    }
    
    path.push({r, c});
    
    const key = `${r},${c}`;
    const a = arrowMap.get(key);
    if (a && a.id !== arrow.id) return { blocker: { type: "arrow", row: r, col: c, id: a.id }, path, hitRotators };
    
    const o = obsMap.get(key);
    if (o) {
      if (o.type === "mirror-slash" || (o.type === "rotator" && !hitRotators.includes(key))) {
        if (o.type === "rotator") hitRotators.push(key);
        if (d === "up") d = "right";
        else if (d === "down") d = "left";
        else if (d === "right") d = "up";
        else if (d === "left") d = "down";
      } else if (o.type === "mirror-backslash" || (o.type === "rotator" && hitRotators.includes(key))) {
        if (o.type === "rotator") hitRotators.push(key);
        if (d === "up") d = "left";
        else if (d === "down") d = "right";
        else if (d === "right") d = "down";
        else if (d === "left") d = "up";
      } else if (o.type === "gate-up" && d !== "up") {
        return { blocker: { type: "wall", row: r, col: c, id: `obs-${o.id}` }, path, hitRotators };
      } else if (o.type === "gate-down" && d !== "down") {
        return { blocker: { type: "wall", row: r, col: c, id: `obs-${o.id}` }, path, hitRotators };
      } else if (o.type === "gate-left" && d !== "left") {
        return { blocker: { type: "wall", row: r, col: c, id: `obs-${o.id}` }, path, hitRotators };
      } else if (o.type === "gate-right" && d !== "right") {
        return { blocker: { type: "wall", row: r, col: c, id: `obs-${o.id}` }, path, hitRotators };
      } else if (o.type === "ice" || o.type.startsWith("gate-")) {
        // pass through
      } else {
        return { blocker: { type: o.type as any, row: r, col: c, id: `obs-${o.id}` }, path, hitRotators };
      }
    }
    steps++;
  }
  return { blocker: { type: "wall", row: r, col: c, id: "loop" }, path, hitRotators };
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
    const data = getStaticLevel(idx);
    
    setLevelData(data);
    setArrows(data.arrows);
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

    const { blocker, path, hitRotators } = tracePathFast(arrow, arrowMap, obsMap, levelData.gridSize);

    if (!blocker) {
      setExitingArrow({ arrow, path });
      setMoves(m => m + 1);
      
      // Update rotators if any were hit
      if (hitRotators.length > 0) {
         setLevelData(prev => {
            if (!prev) return prev;
            // For simple rotators, we just visually leave them as they are or toggle state?
            // "Rotate 90 degrees". They acted as slash, now they act as backslash.
            // We can just keep them as 'rotator' type and let tracePathFast handle their toggle?
            // Actually tracePathFast toggles them mid-path, but we need persistent toggle.
            return prev;
         });
      }

      const duration = 200;
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
    <div className="min-h-screen bg-[#f4f4f5]">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-4 border-black bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-black text-black hover:scale-105 transition-transform">
            <ArrowLeft className="h-5 w-5" strokeWidth={3} /> Back
          </Link>
          <h1 className="font-display text-2xl font-black tracking-tight uppercase">Arrow Puzzle</h1>
          <div className="w-14" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-8 space-y-8">

        {/* Level & Stats Dashboard */}
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
                / 100 <ChevronDown className="h-3 w-3 ml-1" strokeWidth={4} />
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
              <div className="font-display text-3xl font-black text-black leading-none">{arrows.length}</div>
            </div>
            <Button
              onClick={handleHint}
              disabled={hintsLeft === 0 || won || gameOver}
              className={`w-[60px] sm:w-[70px] h-auto flex-shrink-0 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center p-0 transition-all hover:translate-y-1 hover:shadow-none ${hintsLeft > 0 ? "bg-[#fef08a] text-black" : "bg-gray-200 text-gray-400 opacity-60"}`}
              style={{ borderRadius: WOBBLY_SM }}
            >
              <div className="flex flex-col items-center justify-center">
                <Lightbulb className="h-6 w-6 sm:h-7 sm:w-7 mb-1" strokeWidth={3} />
                <span className="text-[11px] font-black leading-none bg-white border-2 border-black text-black px-2 py-0.5 rounded-full">{hintsLeft}</span>
              </div>
            </Button>
            <Button
              onClick={resetLevel}
              className="w-[60px] sm:w-[70px] h-auto flex-shrink-0 border-4 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 transition-all hover:translate-y-1 hover:shadow-none p-0 flex items-center justify-center"
              style={{ borderRadius: WOBBLY_SM }}
            >
              <RotateCcw className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={3} />
            </Button>
          </div>
        </div>

        {/* Game board */}
        <div className="relative w-full border-4 border-black bg-white p-3 sm:p-4 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
          <div
            className="grid gap-2 sm:gap-3"
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
                className="bg-black/5 border-2 border-dashed border-black/20"
                style={{
                  gridRow: Math.floor(i / levelData.gridSize) + 1,
                  gridColumn: (i % levelData.gridSize) + 1,
                  borderRadius: WOBBLY_SM
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
                  className={`absolute flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${obs.type === "wall" ? "bg-[#d6d3d1] overflow-hidden" : obs.type === "bomb" ? "bg-[#f87171]" : "bg-[#bfdbfe]"}`}
                  style={{
                    gridRow: obs.row + 1,
                    gridColumn: obs.col + 1,
                    position: "relative",
                    borderRadius: WOBBLY_SM
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
                  {obs.type === "ice" && (
                     <div className="absolute inset-0 bg-white/60 rounded-[18px] border-2 border-white/60" />
                  )}
                  {obs.type === "rotator" && (
                     <div className="absolute w-[80%] h-[80%] border-4 border-dashed border-sky-400 rounded-full animate-[spin_6s_linear_infinite]" />
                  )}
                  {obs.type.startsWith("gate-") && (
                     <div className="absolute inset-0 flex items-center justify-center opacity-70">
                        {obs.type === "gate-up" && <ChevronUp className="h-8 w-8 text-stone-600" />}
                        {obs.type === "gate-down" && <ChevronDown className="h-8 w-8 text-stone-600" />}
                        {obs.type === "gate-left" && <ChevronLeft className="h-8 w-8 text-stone-600" />}
                        {obs.type === "gate-right" && <ChevronRight className="h-8 w-8 text-stone-600" />}
                     </div>
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
                     <div className="absolute bg-rose-500 rounded-full w-full h-full opacity-60 flex items-center justify-center">
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
                    className={`absolute flex items-center justify-center cursor-pointer ${DIR_COLORS[arrow.dir]} transition-shadow border-2 border-black z-10 ${
                      isTappable ? "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105" : "opacity-70 shadow-none border-2 scale-95"
                    } ${isHinted ? "ring-4 ring-[#fef08a] !shadow-[0_0_15px_rgba(254,240,138,1)] z-20" : ""}`}
                    style={{
                      gridRow: arrow.row + 1,
                      gridColumn: arrow.col + 1,
                      position: "relative",
                      borderRadius: WOBBLY_SM
                    }}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={
                      isExiting
                        ? { 
                            x: DIR_EXIT[arrow.dir].x, 
                            y: DIR_EXIT[arrow.dir].y,
                            opacity: 0, 
                            scale: 0.8,
                            transition: { duration: 0.2, ease: "easeIn" } 
                          }
                        : bounceAnim
                        ? {
                            ...bounceAnim,
                            transition: { duration: 0.2, ease: "linear" }
                          }
                        : isShaking
                        ? {
                            x: [0, -4, 4, 0],
                            scale: 1,
                            rotate: 0,
                            opacity: 1,
                            transition: { duration: 0.2 },
                          }
                        : { scale: 1, rotate: 0, opacity: 1, x: 0, y: 0 }
                    }
                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.2 }}
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
                    {levelIdx < 99 ? "Cleared!" : "All Done!"}
                  </h2>
                  <p className="text-black/70 text-lg font-bold">
                    Solved in <strong className="text-black">{moves}</strong> moves
                  </p>
                  <div className="flex flex-col gap-3 justify-center mt-2">
                    {levelIdx < 99 && (
                      <Button onClick={nextLevel} className="w-full h-12 bg-[#fef08a] text-black hover:bg-[#fde047] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-lg font-black" style={{ borderRadius: WOBBLY_SM }}>
                        Next Level <Zap className="h-5 w-5 ml-2 fill-black text-black" />
                      </Button>
                    )}
                    <Button onClick={resetLevel} variant="outline" className="w-full h-12 bg-white text-black hover:bg-gray-100 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-lg font-black" style={{ borderRadius: WOBBLY_SM }}>
                      <RotateCcw className="h-5 w-5 mr-2" strokeWidth={3} /> Retry
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
                  <h2 className="font-display text-3xl font-black text-black uppercase">Out of Lives!</h2>
                  <p className="text-black/70 text-lg font-bold">
                    You made <strong className="text-black">{moves}</strong> moves
                  </p>
                  <Button onClick={resetLevel} className="h-12 w-full mt-2 bg-[#fbcfe8] text-black hover:bg-[#f9a8d4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-lg font-black" style={{ borderRadius: WOBBLY_SM }}>
                    <RotateCcw className="h-5 w-5 mr-2" strokeWidth={3} /> Try Again
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* How to play button */}
        <button 
          onClick={() => setShowHelp(true)}
          className="w-full bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 font-display font-black uppercase tracking-wide text-black hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <Lightbulb className="h-6 w-6 text-black" strokeWidth={3} /> How to Play
        </button>

      </div>

      {/* How to Play Modal Overlay */}
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
              className="w-full max-w-sm bg-white border-4 border-black p-6 flex flex-col relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowHelp(false)} 
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-black border-2 border-black"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </Button>

              <h2 className="font-display text-2xl font-black mb-4 flex items-center gap-2 uppercase">
                <Lightbulb className="h-6 w-6 text-black" strokeWidth={3} /> How to Play
              </h2>
              
              <div className="space-y-4">
                <p className="text-sm text-black/80 font-bold leading-relaxed">
                  Tap an arrow to send it flying off the board! An arrow can only move 
                  if the path in its direction is <span className="bg-black/10 px-1 rounded border border-black/20">completely clear</span> to the edge.
                  Clear <span className="text-black font-black underline decoration-2">all arrows</span> to win! 🚀
                </p>
                <div className="p-4 bg-[#fef08a] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2" style={{ borderRadius: WOBBLY_SM }}>
                  <p className="text-sm text-black font-bold">
                    <strong>🧱 Walls:</strong> Cannot be moved. Arrows must go around them.
                  </p>
                  <p className="text-sm text-black font-bold">
                    <strong>💣 Bombs:</strong> Explode and cost you 1 life if tapped! Don't touch them!
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center gap-3 text-sm font-black text-black">
                  <span className="inline-flex items-center gap-1.5"><span className="h-5 w-5 border-2 border-black bg-[#bfdbfe] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-block rounded" /> Up</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-5 w-5 border-2 border-black bg-[#fbcfe8] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-block rounded" /> Down</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-5 w-5 border-2 border-black bg-[#bbf7d0] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-block rounded" /> Left</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-5 w-5 border-2 border-black bg-[#fef08a] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-block rounded" /> Right</span>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowLevels(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-white border-4 border-black p-6 flex flex-col max-h-[80vh] relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowLevels(false)} 
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 border-2 border-black text-black z-10"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </Button>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-black text-black uppercase">Select Level</h2>
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
