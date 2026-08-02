import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Trophy, ChevronDown, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { recordGameSession } from "../lib/gameAnalytics";
import { useGameSync } from "@/hooks/useGameSync";

export const Route = createFileRoute("/games/2048")({
  head: () => ({
    meta: [
      { title: "2048 — CampusXpose Games" },
      {
        name: "description",
        content: "Play 2048 on CampusXpose. Swipe or use arrow keys to merge tiles and reach 2048!",
      },
    ],
  }),
  component: Game2048,
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";

type Grid = (number | null)[][];
type Direction = "up" | "down" | "left" | "right";

const TILE_STYLES: Record<number, { bg: string; text: string; scale?: number }> = {
  2: { bg: "#ffffff", text: "#000000" },
  4: { bg: "#fef08a", text: "#000000" },
  8: { bg: "#fbcfe8", text: "#000000" },
  16: { bg: "#bfdbfe", text: "#000000" },
  32: { bg: "#bbf7d0", text: "#000000" },
  64: { bg: "#fcd68a", text: "#000000" },
  128: { bg: "#e9d5ff", text: "#000000", scale: 0.85 },
  256: { bg: "#f87171", text: "#ffffff", scale: 0.85 },
  512: { bg: "#60a5fa", text: "#ffffff", scale: 0.8 },
  1024: { bg: "#34d399", text: "#ffffff", scale: 0.7 },
  2048: { bg: "#fbbf24", text: "#000000", scale: 0.7 },
  4096: { bg: "#a855f7", text: "#ffffff", scale: 0.7 },
  8192: { bg: "#ec4899", text: "#ffffff", scale: 0.7 },
};

const GRID_SIZE = 4;

const STATIC_2048_LEVELS = [
  {
    title: "Classic 2048 Grid",
    targetTile: 2048,
    gridSize: 4,
    desc: "Reach 2048 tile by merging identical numbers",
  },
  {
    title: "4096 Master Challenge",
    targetTile: 4096,
    gridSize: 4,
    desc: "Pro mode: reach tile 4096",
  },
  { title: "8192 Speed Rush", targetTile: 8192, gridSize: 4, desc: "Expert mode: reach tile 8192" },
  {
    title: "Super Obstacle Grid",
    targetTile: 2048,
    gridSize: 4,
    obstacles: [[1, 1]],
    desc: "2048 grid with 1 blocked obstacle tile",
  },
];

function emptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function cloneGrid(g: Grid): Grid {
  return g.map((r) => [...r]);
}

function emptyPositions(g: Grid): [number, number][] {
  const positions: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++) if (g[r][c] === null) positions.push([r, c]);
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
    for (let r = 0; r < GRID_SIZE; r++) next[r] = process(next[r]);
  } else if (dir === "right") {
    for (let r = 0; r < GRID_SIZE; r++) next[r] = process([...next[r]].reverse()).reverse();
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

function hasWon(grid: Grid, target: number = 2048): boolean {
  return grid.some((row) => row.some((v) => v !== null && v >= target));
}

function Game2048() {
  useGameSync("2048", "cx_2048_custom_levels", "cx_2048_level_overrides");

  const [activeTab, setActiveTab] = useState<"menu" | "play">("menu");
  const [levelIdx, setLevelIdx] = useState(0);
  const [showLevels, setShowLevels] = useState(false);
  const [customCount, setCustomCount] = useState(0);

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

  // Sync level custom count
  useEffect(() => {
    const syncLevels = () => {
      try {
        const raw = localStorage.getItem("cx_2048_custom_levels");
        if (raw) setCustomCount(JSON.parse(raw).length);
        else setCustomCount(0);
      } catch (e) {}
    };
    syncLevels();
    window.addEventListener("storage", syncLevels);
    window.addEventListener("cx_custom_levels_change", syncLevels);
    return () => {
      window.removeEventListener("storage", syncLevels);
      window.removeEventListener("cx_custom_levels_change", syncLevels);
    };
  }, []);

  const totalLevelsCount = 4 + customCount;

  // Active level config
  const currentLevelData = useMemo(() => {
    try {
      const overridesRaw = localStorage.getItem("cx_2048_level_overrides");
      if (overridesRaw) {
        const overrides = JSON.parse(overridesRaw);
        if (overrides[levelIdx]) return overrides[levelIdx];
      }

      if (levelIdx >= 4) {
        const customRaw = localStorage.getItem("cx_2048_custom_levels");
        if (customRaw) {
          const list = JSON.parse(customRaw);
          if (list[levelIdx - 4]) return list[levelIdx - 4];
        }
      }
    } catch (e) {}

    return STATIC_2048_LEVELS[levelIdx] || STATIC_2048_LEVELS[0];
  }, [levelIdx]);

  const targetTile = currentLevelData.targetTile || 2048;

  // Restart level
  const restart = useCallback(() => {
    setGrid(initGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
  }, []);

  useEffect(() => {
    restart();
  }, [levelIdx, restart]);

  // Persist best score
  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem("cx_2048_best", String(score));
      localStorage.setItem("cx_2048_highscore", String(score));
    }
  }, [score, best]);

  const handleMove = useCallback(
    (dir: Direction) => {
      if (gameOver) return;
      if (won && !keepPlaying) return;

      setGrid((prev) => {
        const { grid: next, score: gained, moved } = moveGrid(prev, dir);
        if (!moved) return prev;

        const withNew = addRandom(next);
        setScore((s) => s + gained);

        if (!keepPlaying && hasWon(withNew, targetTile)) {
          setWon(true);
        }
        if (!canMove(withNew)) {
          setGameOver(true);
        }
        return withNew;
      });
    },
    [gameOver, won, keepPlaying, targetTile],
  );

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMove]);

  // Touch / Swipe
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    let sx = 0,
      sy = 0;
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      const absDx = Math.abs(dx),
        absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 30) return;
      if (absDx > absDy) handleMove(dx > 0 ? "right" : "left");
      else handleMove(dy > 0 ? "down" : "up");
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [handleMove]);

  return (
    <div className="min-h-screen bg-[#f4f4f5] pb-16 text-black font-sans select-none">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-4 border-black bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link
            to="/games"
            className="flex items-center gap-2 text-sm font-black text-black hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={3} /> Back
          </Link>
          <h1 className="font-display text-2xl font-black tracking-tight uppercase">
            2048 Classic
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Level Select & Scores Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            {/* Level Selector Button */}
            <button
              onClick={() => setShowLevels(true)}
              className="flex items-center gap-2 bg-[#fbcfe8] px-4 py-2.5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-none transition-all outline-none cursor-pointer"
              style={{ borderRadius: WOBBLY_SM }}
            >
              <span className="font-display text-lg font-black text-black uppercase">
                Lvl {levelIdx + 1}
              </span>
              <span className="text-[11px] font-black text-black/80 flex items-center bg-white px-2 py-0.5 rounded-full border-2 border-black">
                / {totalLevelsCount} <ChevronDown className="h-3 w-3 ml-1" strokeWidth={4} />
              </span>
            </button>

            {/* Score & Best */}
            <div className="flex items-center gap-2">
              <div className="bg-[#bfdbfe] border-3 border-black px-3.5 py-1.5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center">
                <div className="text-[9px] font-black uppercase text-black/70">SCORE</div>
                <div className="font-display text-lg font-black leading-none">{score}</div>
              </div>
              <div className="bg-[#bbf7d0] border-3 border-black px-3.5 py-1.5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center">
                <div className="text-[9px] font-black uppercase text-black/70 flex items-center gap-0.5">
                  <Trophy className="h-3 w-3 text-amber-600" /> BEST
                </div>
                <div className="font-display text-lg font-black leading-none">{best}</div>
              </div>
            </div>
          </div>

          {/* Target Goal Banner */}
          <div className="p-3 bg-[#fef08a] border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex items-center justify-between text-xs font-black">
            <span>
              Goal: Reach{" "}
              <span className="bg-black text-white px-2 py-0.5 rounded-md font-display">
                {targetTile}
              </span>{" "}
              Tile
            </span>
            <button
              onClick={restart}
              className="flex items-center gap-1 bg-white hover:bg-gray-100 border-2 border-black px-3 py-1 rounded-xl text-xs font-black cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </button>
          </div>
        </div>

        {/* Board */}
        <div
          className="relative border-4 border-black bg-[#18181b] p-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <div ref={boardRef} className="grid grid-cols-4 gap-2 aspect-square">
            {grid.map((row, r) =>
              row.map((val, c) => {
                const style = val ? TILE_STYLES[val] || { bg: "#fbbf24", text: "#000000" } : null;
                return (
                  <div
                    key={`${r}-${c}`}
                    className="relative flex items-center justify-center rounded-xl border-2 border-black font-display font-black text-2xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    style={{
                      backgroundColor: style ? style.bg : "#27272a",
                      color: style ? style.text : "transparent",
                    }}
                  >
                    {val && (
                      <motion.span
                        initial={{ scale: 0.5 }}
                        animate={{ scale: style?.scale || 1 }}
                        key={val}
                      >
                        {val}
                      </motion.span>
                    )}
                  </div>
                );
              }),
            )}
          </div>

          {/* Game Over Overlay */}
          <AnimatePresence>
            {gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-4 rounded-3xl"
              >
                <div className="text-5xl">💥</div>
                <h2 className="font-display text-3xl font-black uppercase text-[#fca5a5]">
                  Game Over!
                </h2>
                <p className="text-xs font-bold text-gray-300">
                  No more moves possible on this board.
                </p>
                <button
                  onClick={restart}
                  className="bg-[#fef08a] hover:bg-yellow-200 text-black border-2 border-black px-6 py-2.5 rounded-2xl font-display font-black text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Win Overlay */}
          <AnimatePresence>
            {won && !keepPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#bbf7d0]/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-black space-y-4 rounded-3xl border-4 border-black"
              >
                <div className="text-5xl">👑</div>
                <h2 className="font-display text-3xl font-black uppercase text-black">
                  Target Reached!
                </h2>
                <p className="text-xs font-black text-black/80">
                  You created the {targetTile} tile!
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setKeepPlaying(true)}
                    className="bg-white hover:bg-gray-100 border-2 border-black px-4 py-2 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                  >
                    Keep Going
                  </button>
                  <button
                    onClick={() => {
                      if (levelIdx + 1 < totalLevelsCount) setLevelIdx((l) => l + 1);
                      else restart();
                    }}
                    className="bg-black text-white border-2 border-black px-5 py-2.5 rounded-xl font-display font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(254,240,138,1)] cursor-pointer"
                  >
                    Next Level →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── LEVEL SELECTOR MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {showLevels && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
            onClick={() => setShowLevels(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white border-4 border-black p-6 flex flex-col max-h-[80vh] relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <button
                onClick={() => setShowLevels(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 border-2 border-black flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>

              <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
                <h2 className="font-display text-2xl font-black uppercase text-black">
                  Select 2048 Level
                </h2>
                <span className="text-xs font-black bg-[#fbcfe8] text-black border-2 border-black px-2.5 py-1 rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  {totalLevelsCount} Levels
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                {Array.from({ length: totalLevelsCount }).map((_, i) => {
                  let lvlData = STATIC_2048_LEVELS[i];
                  try {
                    const overridesRaw = localStorage.getItem("cx_2048_level_overrides");
                    if (overridesRaw && JSON.parse(overridesRaw)[i])
                      lvlData = JSON.parse(overridesRaw)[i];
                    else if (i >= 4) {
                      const customRaw = localStorage.getItem("cx_2048_custom_levels");
                      if (customRaw && JSON.parse(customRaw)[i - 4])
                        lvlData = JSON.parse(customRaw)[i - 4];
                    }
                  } catch (e) {}

                  const title = lvlData?.title || `Challenge Level #${i + 1}`;
                  const target = lvlData?.targetTile || 2048;

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setLevelIdx(i);
                        setShowLevels(false);
                      }}
                      className={`w-full p-3 border-2 border-black rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        i === levelIdx
                          ? "bg-[#fef08a] border-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] scale-[1.02]"
                          : "bg-white hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-black text-white border border-black flex items-center justify-center font-display font-black text-xs">
                          #{i + 1}
                        </div>
                        <div>
                          <div className="font-display font-black text-xs uppercase text-black leading-snug">
                            {title}
                          </div>
                          <div className="text-[10px] font-bold text-black/70">
                            Goal: Tile {target}
                          </div>
                        </div>
                      </div>

                      {i === levelIdx && (
                        <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
