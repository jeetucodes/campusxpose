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
  2: { bg: "#ffffff", text: "#2d2d2d" },
  4: { bg: "#fef08a", text: "#2d2d2d" },
  8: { bg: "#fed7aa", text: "#2d2d2d" },
  16: { bg: "#fbcfe8", text: "#2d2d2d" },
  32: { bg: "#bfdbfe", text: "#2d2d2d" },
  64: { bg: "#a7f3d0", text: "#2d2d2d" },
  128: { bg: "#fca5a5", text: "#ffffff", scale: 0.9 },
  256: { bg: "#60a5fa", text: "#ffffff", scale: 0.9 },
  512: { bg: "#34d399", text: "#ffffff", scale: 0.8 },
  1024: { bg: "#c084fc", text: "#ffffff", scale: 0.75 },
  2048: { bg: "#fbbf24", text: "#2d2d2d", scale: 0.75 },
  4096: { bg: "#f43f5e", text: "#ffffff", scale: 0.7 },
  8192: { bg: "#1e293b", text: "#ffffff", scale: 0.7 },
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
      } catch (e) { }
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
    } catch (e) { }

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
    <div
      className="min-h-[100dvh] pb-16 text-ink font-sans select-none overflow-x-hidden relative"
      style={{
        backgroundColor: "#f4f1ea",
        backgroundImage: `url('https://www.transparenttextures.com/patterns/handmade-paper.png')`
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-4 border-ink bg-paper shadow-ink-soft">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link
            to="/games"
            className="flex items-center gap-2 text-sm font-black text-ink hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={3} /> Back
          </Link>
          <h1 className="font-display text-2xl font-black tracking-tight uppercase rotate-1">
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
              className="flex items-center gap-2 bg-yellow-200 px-4 py-2 border-4 border-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none cursor-pointer -rotate-2"
              style={{ borderRadius: WOBBLY_SM }}
            >
              <span className="font-display text-xl font-black text-ink uppercase">
                STAGE <span className="text-red-500">{levelIdx + 1}</span>
              </span>
              <span className="text-[11px] font-black text-ink/80 flex items-center bg-white px-2 py-0.5 rounded-full border-2 border-ink">
                / {totalLevelsCount} <ChevronDown className="h-3 w-3 ml-1" strokeWidth={4} />
              </span>
            </button>

            {/* Score & Best */}
            <div className="flex items-center gap-3 rotate-1">
              <div className="bg-white border-4 border-ink px-4 py-1.5 rounded-wobbly-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center relative mt-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-ink/70 bg-blue-100 px-2 rounded-full border-2 border-ink">SCORE</div>
                <div className="font-display text-2xl font-black leading-none mt-1">{score}</div>
              </div>
              <div className="bg-postit border-4 border-ink px-4 py-1.5 rounded-wobbly-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center relative mt-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-ink/70 bg-white px-2 rounded-full border-2 border-ink flex items-center gap-0.5">
                  <Trophy className="h-2.5 w-2.5 text-amber-600" /> BEST
                </div>
                <div className="font-display text-2xl font-black leading-none mt-1">{best}</div>
              </div>
            </div>
          </div>

          {/* Target Goal Banner */}
          <div className="p-3 bg-white border-4 border-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-sm flex items-center justify-between text-sm font-black -rotate-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-400" />
            <span className="pl-3 text-ink">
              Goal: Reach{" "}
              <span className="bg-ink text-white px-2 py-0.5 rounded-sm font-display text-base border-2 border-ink shadow-sm">
                {targetTile}
              </span>{" "}
              Tile
            </span>
            <button
              onClick={restart}
              className="flex items-center gap-1 bg-white hover:bg-gray-100 border-2 border-ink px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer shadow-ink-soft transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <RotateCcw className="h-4 w-4" /> Restart
            </button>
          </div>
        </div>

        {/* Board */}
        <div
          className="relative border-[6px] border-ink bg-ink p-3 sm:p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-8"
          style={{ borderRadius: WOBBLY_MD }}
        >
          <div ref={boardRef} className="grid grid-cols-4 gap-2 sm:gap-3 aspect-square">
            {grid.map((row, r) =>
              row.map((val, c) => {
                const style = val ? TILE_STYLES[val] || { bg: "#fbbf24", text: "#2d2d2d" } : null;
                const isObstacle = currentLevelData.obstacles?.some((obs: [number, number]) => obs[0] === r && obs[1] === c);

                if (isObstacle) {
                  return (
                    <div
                      key={`${r}-${c}`}
                      className="relative flex items-center justify-center rounded-xl sm:rounded-2xl border-4 border-ink bg-ink/50"
                    >
                      <X className="w-8 h-8 text-ink/80 opacity-50" strokeWidth={3} />
                    </div>
                  );
                }

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`relative flex items-center justify-center rounded-xl sm:rounded-2xl border-4 font-display font-black text-2xl sm:text-4xl transition-all ${val ? 'border-ink shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'border-ink/20'}`}
                    style={{
                      backgroundColor: style ? style.bg : "rgba(255, 255, 255, 0.1)",
                      color: style ? style.text : "transparent",
                    }}
                  >
                    {val && (
                      <motion.span
                        initial={{ scale: 0.5 }}
                        animate={{ scale: style?.scale || 1 }}
                        key={`${r}-${c}-${val}`}
                        className="drop-shadow-sm"
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
                className="absolute inset-0 bg-ink/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-paper space-y-6 z-20"
                style={{ borderRadius: WOBBLY_SM }}
              >
                <div className="bg-paper text-ink p-8 border-4 border-ink shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -rotate-3 flex flex-col items-center gap-4">
                  <div className="text-5xl animate-bounce">💥</div>
                  <h2 className="font-display text-4xl font-black uppercase text-red-500 tracking-wider">
                    GAME OVER
                  </h2>
                  <p className="text-sm font-bold text-ink/70 bg-gray-200 px-4 py-2 border-2 border-ink border-dashed">
                    No more moves possible
                  </p>
                  <button
                    onClick={restart}
                    className="mt-4 bg-yellow-300 hover:bg-yellow-400 text-ink border-4 border-ink px-8 py-3 rounded-wobbly-sm font-display font-black text-xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-transform hover:-translate-y-1 active:translate-y-1 active:shadow-none"
                  >
                    Try Again
                  </button>
                </div>
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
                className="absolute inset-0 bg-ink/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4 z-20"
                style={{ borderRadius: WOBBLY_SM }}
              >
                <div className="bg-paper text-ink p-8 border-4 border-ink shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-2 flex flex-col items-center gap-4 relative">
                  <div className="absolute -top-4 -right-4 bg-green-400 text-ink font-black px-4 py-1 rotate-12 border-2 border-ink shadow-sm">SUCCESS!</div>
                  <div className="text-6xl animate-bounce">👑</div>
                  <h2 className="font-display text-3xl sm:text-4xl font-black uppercase text-ink text-center">
                    Target Reached!
                  </h2>
                  <p className="text-sm font-black text-ink/80 bg-green-100 px-4 py-2 border-2 border-ink rounded-full">
                    You created the <span className="text-green-600 text-lg">{targetTile}</span> tile!
                  </p>

                  <div className="flex items-center gap-3 mt-4 w-full">
                    <button
                      onClick={() => setKeepPlaying(true)}
                      className="flex-1 bg-white hover:bg-gray-100 border-4 border-ink py-3 rounded-xl text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      Keep Going
                    </button>
                    <button
                      onClick={() => {
                        if (levelIdx + 1 < totalLevelsCount) setLevelIdx((l) => l + 1);
                        else restart();
                      }}
                      className="flex-1 bg-green-400 hover:bg-green-500 text-ink border-4 border-ink py-3 rounded-xl font-display font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      {levelIdx + 1 < totalLevelsCount ? "Next Stage" : "Play Again"}
                    </button>
                  </div>
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
                  } catch (e) { }

                  const title = lvlData?.title || `Challenge Level #${i + 1}`;
                  const target = lvlData?.targetTile || 2048;

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setLevelIdx(i);
                        setShowLevels(false);
                      }}
                      className={`w-full p-3 border-2 border-black rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${i === levelIdx
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
