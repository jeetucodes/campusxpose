import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/games/2048")({
  head: () => ({
    meta: [
      { title: "2048 — CampusXpose Games" },
      { name: "description", content: "Play 2048 on CampusXpose. Swipe or use arrow keys to merge tiles and reach 2048!" },
    ],
  }),
  component: Game2048,
});

// ─── Types ───────────────────────────────────────────────────────────────────
type Grid = (number | null)[][];
type Direction = "up" | "down" | "left" | "right";

// ─── Tile colours (matching CampusXpose sketch/postit palette) ─────────────
const TILE_STYLES: Record<number, { bg: string; text: string; scale?: number }> = {
  2:    { bg: "#ffffff", text: "#000000" },
  4:    { bg: "#fef08a", text: "#000000" }, // Yellow
  8:    { bg: "#fbcfe8", text: "#000000" }, // Pink
  16:   { bg: "#bfdbfe", text: "#000000" }, // Blue
  32:   { bg: "#bbf7d0", text: "#000000" }, // Green
  64:   { bg: "#fcd68a", text: "#000000" }, // Orange
  128:  { bg: "#e9d5ff", text: "#000000", scale: 0.85 }, // Purple
  256:  { bg: "#f87171", text: "#ffffff", scale: 0.85 }, // Red
  512:  { bg: "#60a5fa", text: "#ffffff", scale: 0.8 },  // Darker Blue
  1024: { bg: "#34d399", text: "#ffffff", scale: 0.7 },  // Emerald
  2048: { bg: "#fbbf24", text: "#000000", scale: 0.7 },  // Gold
};

const GRID_SIZE = 4;

// ─── Pure helpers ────────────────────────────────────────────────────────────
function emptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function cloneGrid(g: Grid): Grid {
  return g.map(r => [...r]);
}

function emptyPositions(g: Grid): [number, number][] {
  const positions: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (g[r][c] === null) positions.push([r, c]);
  return positions;
}

function addRandom(g: Grid): Grid {
  const next = cloneGrid(g);
  const empty = emptyPositions(next);
  if (empty.length === 0) return next;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function initGrid(): Grid {
  return addRandom(addRandom(emptyGrid()));
}

function slideRow(row: (number | null)[]): { result: (number | null)[]; score: number } {
  const filtered = row.filter((v): v is number => v !== null);
  const merged: number[] = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < GRID_SIZE) merged.push(null as any);
  return { result: merged, score };
}

function moveGrid(grid: Grid, dir: Direction): { grid: Grid; score: number; moved: boolean } {
  let totalScore = 0;
  const next = cloneGrid(grid);
  let moved = false;

  const process = (row: (number | null)[]) => {
    const { result, score } = slideRow(row);
    totalScore += score;
    if (row.some((v, i) => v !== result[i])) moved = true;
    return result;
  };

  if (dir === "left") {
    for (let r = 0; r < GRID_SIZE; r++) {
      next[r] = process(next[r]);
    }
  } else if (dir === "right") {
    for (let r = 0; r < GRID_SIZE; r++) {
      next[r] = process([...next[r]].reverse()).reverse();
    }
  } else if (dir === "up") {
    for (let c = 0; c < GRID_SIZE; c++) {
      const col = Array.from({ length: GRID_SIZE }, (_, r) => next[r][c]);
      const result = process(col);
      for (let r = 0; r < GRID_SIZE; r++) next[r][c] = result[r];
    }
  } else {
    for (let c = 0; c < GRID_SIZE; c++) {
      const col = Array.from({ length: GRID_SIZE }, (_, r) => next[r][c]).reverse();
      const result = process(col).reverse();
      for (let r = 0; r < GRID_SIZE; r++) next[r][c] = result[r];
    }
  }

  return { grid: next, score: totalScore, moved };
}

function canMove(grid: Grid): boolean {
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) return true;
      if (c + 1 < GRID_SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < GRID_SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  return false;
}

function hasWon(grid: Grid): boolean {
  return grid.some(row => row.some(v => v === 2048));
}

// ─── Component ──────────────────────────────────────────────────────────────
function Game2048() {
  const [grid, setGrid] = useState<Grid>(initGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("cx_2048_best") || "0", 10);
  });
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Persist best score
  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem("cx_2048_best", String(score));
    }
  }, [score, best]);

  const handleMove = useCallback((dir: Direction) => {
    if (gameOver) return;
    if (won && !keepPlaying) return;

    setGrid(prev => {
      const { grid: next, score: gained, moved } = moveGrid(prev, dir);
      if (!moved) return prev;

      const withNew = addRandom(next);
      setScore(s => s + gained);

      if (!keepPlaying && hasWon(withNew)) {
        setWon(true);
      }
      if (!canMove(withNew)) {
        setGameOver(true);
      }
      return withNew;
    });
  }, [gameOver, won, keepPlaying]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); handleMove(dir); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMove]);

  // Touch / Swipe
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    let sx = 0, sy = 0;
    const onStart = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 30) return;
      if (absDx > absDy) handleMove(dx > 0 ? "right" : "left");
      else handleMove(dy > 0 ? "down" : "up");
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchend", onEnd); };
  }, [handleMove]);

  const restart = () => {
    setGrid(initGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
  };

  const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
  const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-4 border-black bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-black text-black hover:scale-105 transition-transform">
            <ArrowLeft className="h-5 w-5" strokeWidth={3} /> Back
          </Link>
          <h1 className="font-display text-2xl font-black tracking-tight uppercase">2048</h1>
          <div className="w-14" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-8 space-y-8">

        {/* Score bar */}
        <div className="flex items-stretch gap-4">
          <div
            className="flex-1 border-4 border-black bg-[#bfdbfe] p-3 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <div className="text-[12px] font-black text-black/70 uppercase tracking-wider">Score</div>
            <div className="font-display text-3xl font-black text-black">{score}</div>
          </div>
          <div
            className="flex-1 border-4 border-black bg-[#bbf7d0] p-3 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <div className="text-[12px] font-black text-black/70 uppercase tracking-wider">Best</div>
            <div className="font-display text-3xl font-black text-black">{best}</div>
          </div>
          <Button
            onClick={restart}
            className="w-[80px] sm:w-[90px] h-auto flex-shrink-0 border-4 border-black bg-[#fbcfe8] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#f9a8d4] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center p-0"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <RotateCcw className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={3} />
          </Button>
        </div>

        {/* Game board */}
        <div
          ref={boardRef}
          className="relative aspect-square w-full border-4 border-black bg-white p-3 sm:p-4 select-none touch-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          style={{ borderRadius: WOBBLY_MD }}
        >
          {/* Background cells */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4 h-full">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="bg-black/5 border-2 border-dashed border-black/20" style={{ borderRadius: WOBBLY_SM }} />
            ))}
          </div>

          {/* Tiles overlay */}
          <div className="absolute inset-3 sm:inset-4 grid grid-cols-4 gap-3 sm:gap-4">
            <AnimatePresence>
              {grid.flatMap((row, r) =>
                row.map((val, c) => {
                  if (val === null) return null;
                  const style = TILE_STYLES[val] || { bg: "#000", text: "#fff", scale: 0.65 };
                  const fontSize = (style.scale ?? 1);
                  return (
                    <motion.div
                      key={`${r}-${c}-${val}`} // Unique key forces a pop animation on value change
                      layout
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, mass: 0.8 }}
                      className="flex items-center justify-center font-display font-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10"
                      style={{
                        gridRow: r + 1,
                        gridColumn: c + 1,
                        backgroundColor: style.bg,
                        color: style.text,
                        fontSize: `clamp(${1.2 * fontSize}rem, ${5 * fontSize}vw, ${2.2 * fontSize}rem)`,
                        borderRadius: WOBBLY_SM,
                      }}
                    >
                      {val}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          {/* Game Over overlay */}
          <AnimatePresence>
            {gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-30"
                style={{ borderRadius: WOBBLY_MD }}
              >
                <motion.div
                  initial={{ scale: 0.5, y: 50, rotate: -5 }}
                  animate={{ scale: 1, y: 0, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="bg-white border-4 border-black p-8 text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-[80%]"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <div className="text-6xl animate-bounce">😵</div>
                  <h2 className="font-display text-4xl font-black text-black uppercase">Game Over!</h2>
                  <p className="text-black/70 text-lg font-bold">Final Score: <span className="text-black text-2xl">{score}</span></p>
                  <Button onClick={restart} className="w-full h-14 text-lg font-black bg-[#fbcfe8] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-4 border-black hover:bg-[#f9a8d4] hover:translate-y-1 hover:shadow-none transition-all" style={{ borderRadius: WOBBLY_SM }}>
                    <RotateCcw className="h-6 w-6 mr-2" strokeWidth={3} /> Try Again
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Won overlay */}
          <AnimatePresence>
            {won && !keepPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-[#fef08a]/80 backdrop-blur-sm z-30"
                style={{ borderRadius: WOBBLY_MD }}
              >
                <motion.div
                  initial={{ scale: 0.5, y: 50, rotate: 5 }}
                  animate={{ scale: 1, y: 0, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.6 }}
                  className="bg-white border-4 border-black p-8 text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-[80%]"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <div className="text-6xl animate-bounce">🏆</div>
                  <h2 className="font-display text-4xl font-black text-black uppercase">You Win!</h2>
                  <p className="text-black/70 text-lg font-bold">Score: <span className="text-black text-2xl">{score}</span></p>
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => setKeepPlaying(true)} variant="outline" className="w-full h-12 font-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black/5 hover:translate-y-1 hover:shadow-none transition-all" style={{ borderRadius: WOBBLY_SM }}>
                      Keep Playing
                    </Button>
                    <Button onClick={restart} className="w-full h-12 font-black bg-[#bbf7d0] text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#86efac] hover:translate-y-1 hover:shadow-none transition-all" style={{ borderRadius: WOBBLY_SM }}>
                      <RotateCcw className="h-5 w-5 mr-2" strokeWidth={3} /> New Game
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* How to play */}
        <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
          <h3 className="font-display font-black text-lg mb-3 uppercase tracking-wide">How to Play</h3>
          <p className="text-sm text-black/80 font-bold leading-relaxed">
            Use <span className="bg-black/10 px-2 py-0.5 rounded border border-black/20">arrow keys</span> or <span className="bg-black/10 px-2 py-0.5 rounded border border-black/20">swipe</span> to move tiles. 
            When two tiles with the same number touch, they <span className="text-black underline decoration-2 underline-offset-2">merge</span>. 
            Reach <span className="text-black font-black text-base px-1">2048</span> to win! 🚀
          </p>
        </div>

      </div>
    </div>
  );
}
