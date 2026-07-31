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
  2:    { bg: "#f5f0e8", text: "#6b5f50" },
  4:    { bg: "#ece0c8", text: "#6b5f50" },
  8:    { bg: "#f2b179", text: "#fff" },
  16:   { bg: "#f59563", text: "#fff" },
  32:   { bg: "#f67c5f", text: "#fff" },
  64:   { bg: "#f65e3b", text: "#fff" },
  128:  { bg: "#edcf72", text: "#fff", scale: 0.85 },
  256:  { bg: "#edcc61", text: "#fff", scale: 0.85 },
  512:  { bg: "#edc850", text: "#fff", scale: 0.8 },
  1024: { bg: "#edc53f", text: "#fff", scale: 0.7 },
  2048: { bg: "#edc22e", text: "#fff", scale: 0.7 },
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-2 border-dashed border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight">2048</h1>
          <div className="w-14" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">

        {/* Score bar */}
        <div className="flex items-center gap-3">
          <div
            className="flex-1 border-2 border-border bg-white p-3 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Score</div>
            <div className="font-display text-2xl font-bold text-foreground">{score}</div>
          </div>
          <div
            className="flex-1 border-2 border-border bg-white p-3 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Best</div>
            <div className="font-display text-2xl font-bold text-accent">{best}</div>
          </div>
          <Button
            onClick={restart}
            variant="outline"
            size="icon"
            className="h-14 w-14 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-muted"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        {/* Game board */}
        <div
          ref={boardRef}
          className="relative aspect-square w-full border-2 border-border bg-[#bbada0] p-2 sm:p-3 select-none touch-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          style={{ borderRadius: WOBBLY_MD }}
        >
          {/* Background cells */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 h-full">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-[#cdc1b4]" />
            ))}
          </div>

          {/* Tiles overlay */}
          <div className="absolute inset-2 sm:inset-3 grid grid-cols-4 gap-2 sm:gap-3">
            <AnimatePresence mode="popLayout">
              {grid.flatMap((row, r) =>
                row.map((val, c) => {
                  if (val === null) return null;
                  const style = TILE_STYLES[val] || { bg: "#3c3a32", text: "#fff", scale: 0.65 };
                  const fontSize = (style.scale ?? 1);
                  return (
                    <motion.div
                      key={`${r}-${c}`}
                      layout
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.6 }}
                      className="flex items-center justify-center rounded-lg font-display font-black"
                      style={{
                        gridRow: r + 1,
                        gridColumn: c + 1,
                        backgroundColor: style.bg,
                        color: style.text,
                        fontSize: `clamp(${1.2 * fontSize}rem, ${5 * fontSize}vw, ${2.2 * fontSize}rem)`,
                        textShadow: val >= 8 ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
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
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-20"
                style={{ borderRadius: "20px" }}
              >
                <motion.div
                  initial={{ scale: 0.7, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white border-2 border-border p-6 text-center space-y-4 shadow-xl"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <div className="text-4xl">😵</div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Game Over!</h2>
                  <p className="text-muted-foreground text-sm font-medium">Final Score: <strong className="text-accent">{score}</strong></p>
                  <Button onClick={restart} className="shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-border" style={{ borderRadius: WOBBLY_MD }}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Play Again
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
                className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-400/60 backdrop-blur-sm z-20"
                style={{ borderRadius: "20px" }}
              >
                <motion.div
                  initial={{ scale: 0.7, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white border-2 border-border p-6 text-center space-y-4 shadow-xl"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <div className="text-4xl">🎉</div>
                  <h2 className="font-display text-2xl font-bold text-foreground">You Win!</h2>
                  <p className="text-muted-foreground text-sm font-medium">Score: <strong className="text-accent">{score}</strong></p>
                  <div className="flex gap-2">
                    <Button onClick={() => setKeepPlaying(true)} variant="outline" className="border-2 border-border" style={{ borderRadius: WOBBLY_MD }}>
                      Keep Playing
                    </Button>
                    <Button onClick={restart} className="shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-border" style={{ borderRadius: WOBBLY_MD }}>
                      <RotateCcw className="h-4 w-4 mr-2" /> New Game
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* How to play */}
        <div className="border-2 border-border bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
          <h3 className="font-display font-bold text-sm mb-2">How to Play</h3>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            Use <strong>arrow keys</strong> or <strong>swipe</strong> to move tiles. 
            When two tiles with the same number touch, they <strong>merge</strong>. 
            Reach <strong className="text-accent">2048</strong> to win! 🏆
          </p>
        </div>

      </div>
    </div>
  );
}
