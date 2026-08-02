import React, { useCallback, useEffect, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Trophy, Zap, Heart, Flame, Bomb, X, Lightbulb, Volume2, VolumeX } from "lucide-react";
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

// ─── Web Audio Sound Effects Synthesizer ──────────────────────────────────────
function playGameSound(type: "launch" | "deflect" | "clear" | "hit" | "win", isMuted: boolean) {
  if (isMuted || typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "launch") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "deflect") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "hit") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.2);
      });
    }
  } catch (e) {}
}

// ─── Web Haptics Vibration Helper ─────────────────────────────────────────────
function triggerVibration(pattern: number | number[]) {
  if (typeof window !== "undefined" && "navigator" in window && typeof (navigator as any).vibrate === "function") {
    try {
      (navigator as any).vibrate(pattern);
    } catch (e) {}
  }
}

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
type PathStep = { r: number; c: number; dir: Dir };

function tracePathFast(
  arrow: Arrow, arrowMap: Map<string, Arrow>, obsMap: Map<string, Obstacle>, gridSize: number
): { blocker: Blocker | null, path: PathStep[], hitRotators: string[] } {
  let r = arrow.row;
  let c = arrow.col;
  let d = arrow.dir;

  const path: PathStep[] = [{ r, c, dir: d }];
  const hitRotators: string[] = [];
  let steps = 0;

  while (steps < 100) {
    if (d === "up") r--;
    else if (d === "down") r++;
    else if (d === "left") c--;
    else if (d === "right") c++;

    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
      path.push({ r, c, dir: d });
      return { blocker: null, path, hitRotators };
    }

    path.push({ r, c, dir: d });

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

type MovingArrowAnim = {
  arrowId: number;
  xKeyframes: number[];
  yKeyframes: number[];
  duration: number;
  isExit: boolean;
  blocker: Blocker | null;
};

// ─── Visual Deflector Indicators ──────────────────────────────────────────────
function MirrorSlashIndicator() {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-0.5 overflow-hidden rounded-[8px] bg-gradient-to-br from-sky-100 via-sky-200 to-sky-300 border border-black/40 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
      {/* Central Mirror Line */}
      <div 
        className="absolute w-[140%] h-[3.5px] bg-sky-500 border border-black shadow-[0_0_6px_rgba(56,189,248,1)] z-10" 
        style={{ transform: "rotate(-45deg)" }} 
      />
      {/* Curved Deflection Vector Graphic */}
      <svg viewBox="0 0 40 40" className="w-full h-full relative z-20 pointer-events-none">
        <defs>
          <marker id="slash-head-1" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#0284c7" stroke="#000" strokeWidth="1" />
          </marker>
          <marker id="slash-head-2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#0284c7" stroke="#000" strokeWidth="1" />
          </marker>
        </defs>
        <path
          d="M 10 32 Q 10 10 32 10"
          fill="none"
          stroke="#0284c7"
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd="url(#slash-head-1)"
        />
        <path
          d="M 30 8 Q 30 30 8 30"
          fill="none"
          stroke="#0284c7"
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd="url(#slash-head-2)"
        />
      </svg>
    </div>
  );
}

function MirrorBackslashIndicator() {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-0.5 overflow-hidden rounded-[8px] bg-gradient-to-br from-indigo-100 via-indigo-200 to-indigo-300 border border-black/40 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
      {/* Central Mirror Line */}
      <div 
        className="absolute w-[140%] h-[3.5px] bg-indigo-500 border border-black shadow-[0_0_6px_rgba(99,102,241,1)] z-10" 
        style={{ transform: "rotate(45deg)" }} 
      />
      {/* Curved Deflection Vector Graphic */}
      <svg viewBox="0 0 40 40" className="w-full h-full relative z-20 pointer-events-none">
        <defs>
          <marker id="backslash-head-1" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#4338ca" stroke="#000" strokeWidth="1" />
          </marker>
          <marker id="backslash-head-2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#4338ca" stroke="#000" strokeWidth="1" />
          </marker>
        </defs>
        <path
          d="M 30 32 Q 30 10 8 10"
          fill="none"
          stroke="#4338ca"
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd="url(#backslash-head-1)"
        />
        <path
          d="M 10 8 Q 10 30 32 30"
          fill="none"
          stroke="#4338ca"
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd="url(#backslash-head-2)"
        />
      </svg>
    </div>
  );
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
  const [hoveredArrowId, setHoveredArrowId] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [shakeId, setShakeId] = useState<number | string | null>(null);
  const [movingArrow, setMovingArrow] = useState<MovingArrowAnim | null>(null);
  const [collisionAnim, setCollisionAnim] = useState<{ id: string, row: number, col: number, type: "wall" | "bomb" | "arrow" } | null>(null);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Active trajectory path info
  const activePathInfo = React.useMemo(() => {
    const activeId = hoveredArrowId ?? hintedArrowId;
    if (!activeId || !levelData || movingArrow) return null;
    const targetArrow = arrows.find(a => a.id === activeId);
    if (!targetArrow) return null;

    const arrowMap = new Map<string, Arrow>();
    for (const a of arrows) arrowMap.set(`${a.row},${a.col}`, a);

    const obsMap = new Map<string, Obstacle>();
    for (const o of levelData.obstacles) obsMap.set(`${o.row},${o.col}`, o);

    const { blocker, path } = tracePathFast(targetArrow, arrowMap, obsMap, levelData.gridSize);
    
    const keyMap = new Map<string, { isExitPoint?: boolean; isBlockerPoint?: boolean; dir?: Dir }>();
    path.forEach((p, idx) => {
      if (p.r >= 0 && p.r < levelData.gridSize && p.c >= 0 && p.c < levelData.gridSize) {
        const isBlocker = !!blocker && idx === path.length - 1;
        keyMap.set(`${p.r},${p.c}`, { isBlockerPoint: isBlocker, dir: p.dir });
      }
    });

    // Check exit edge
    const last = path[path.length - 1];
    const exitEdge = !blocker && (last.r < 0 || last.r >= levelData.gridSize || last.c < 0 || last.c >= levelData.gridSize);

    return { keyMap, isClear: !blocker, exitEdge };
  }, [hoveredArrowId, hintedArrowId, arrows, levelData, movingArrow]);

  // Check if game disabled by Admin
  const isGameDisabled = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("cx_games_status");
      if (raw) {
        const map = JSON.parse(raw);
        return map["arrow-puzzle"] === false;
      }
    } catch (e) {}
    return false;
  }, []);

  // Initialize level
  const initLevel = useCallback((idx: number) => {
    let data = getStaticLevel(idx);

    // Read custom AI imported levels by Admin
    try {
      const customRaw = localStorage.getItem("cx_arrow_custom_levels");
      if (customRaw) {
        const customLevels = JSON.parse(customRaw);
        if (Array.isArray(customLevels) && customLevels.length > 0) {
          if (idx >= 100 && idx - 100 < customLevels.length) {
            data = customLevels[idx - 100];
          }
        }
      }
    } catch (e) {}

    setLevelData(data);
    setArrows(data.arrows);
    setMoves(0);
    setLives(5);
    setHintsLeft(3);
    setHintedArrowId(null);
    setHoveredArrowId(null);
    setWon(false);
    setGameOver(false);
    setMovingArrow(null);
    setCollisionAnim(null);
    setShakeId(null);
  }, []);

  useEffect(() => { initLevel(levelIdx); }, [levelIdx, initLevel]);

  const handleTap = useCallback((arrow: Arrow) => {
    if (won || gameOver || movingArrow || !levelData) return;

    if (hintedArrowId === arrow.id) setHintedArrowId(null);

    const arrowMap = new Map<string, Arrow>();
    for (const a of arrows) arrowMap.set(`${a.row},${a.col}`, a);

    const obsMap = new Map<string, Obstacle>();
    for (const o of levelData.obstacles) obsMap.set(`${o.row},${o.col}`, o);

    const { blocker, path } = tracePathFast(arrow, arrowMap, obsMap, levelData.gridSize);

    const cellStep = gridRef.current ? gridRef.current.clientWidth / levelData.gridSize : 60;
    const xKeyframes = path.map(p => (p.c - arrow.col) * cellStep);
    const yKeyframes = path.map(p => (p.r - arrow.row) * cellStep);

    const stepsCount = Math.max(1, path.length - 1);
    const duration = Math.min(0.45, Math.max(0.18, stepsCount * 0.08));

    playGameSound("launch", isMuted);
    triggerVibration(15);

    setMovingArrow({
      arrowId: arrow.id,
      xKeyframes,
      yKeyframes,
      duration,
      isExit: !blocker,
      blocker,
    });

    if (!blocker) {
      setMoves(m => m + 1);
      setTimeout(() => {
        playGameSound("deflect", isMuted);
        triggerVibration(25);
        setArrows(prev => {
          const next = prev.filter(a => a.id !== arrow.id);
          if (next.length === 0) {
            setWon(true);
            playGameSound("win", isMuted);
            triggerVibration([30, 30, 60, 30, 90]);
            const nextLevel = levelIdx + 1;
            setHighestUnlocked(prevMax => {
              const max = Math.max(prevMax, nextLevel);
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
        setMovingArrow(null);
      }, duration * 1000);
    } else {
      setTimeout(() => {
        playGameSound("hit", isMuted);
        if (blocker.type === "bomb") {
          triggerVibration([90, 40, 110, 40, 140]);
        } else {
          triggerVibration([40, 30, 40]);
        }
        setCollisionAnim({ ...blocker, id: Date.now().toString() });
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) setGameOver(true);
          return next;
        });
        setMovingArrow(null);
        setTimeout(() => setCollisionAnim(null), 500);
      }, duration * 1000);
    }
  }, [arrows, levelData, won, gameOver, movingArrow, levelIdx, hintedArrowId, isMuted]);

  const handleObstacleTap = useCallback((obs: Obstacle) => {
    if (won || gameOver || movingArrow) return;
    if (obs.type === "wall") {
      playGameSound("hit", isMuted);
      triggerVibration([40, 30, 40]);
      setShakeId(`obs-${obs.id}`);
      setTimeout(() => setShakeId(null), 500);
    } else if (obs.type === "bomb") {
      playGameSound("hit", isMuted);
      triggerVibration([90, 40, 110, 40, 140]);
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
  }, [won, gameOver, movingArrow, isMuted]);

  const nextLevel = () => setLevelIdx(i => i + 1);
  const resetLevel = () => initLevel(levelIdx);

  const tappableIds = React.useMemo(() => {
    if (!levelData) return new Set<number>();

    const arrowMap = new Map<string, Arrow>();
    for (const a of arrows) arrowMap.set(`${a.row},${a.col}`, a);

    const obsMap = new Map<string, Obstacle>();
    for (const o of levelData.obstacles) obsMap.set(`${o.row},${o.col}`, o);

    return new Set(
      arrows.filter(a => !movingArrow && !tracePathFast(a, arrowMap, obsMap, levelData.gridSize).blocker).map(a => a.id)
    );
  }, [arrows, levelData, movingArrow]);

  if (isGameDisabled) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md space-y-4" style={{ borderRadius: WOBBLY_MD }}>
          <div className="text-6xl animate-bounce">🛠️</div>
          <h2 className="font-display text-2xl font-black text-black uppercase">Under Maintenance</h2>
          <p className="text-sm font-bold text-black/70">
            Arrow Puzzle has been temporarily turned OFF by Campus Admin for level upgrades. Please check back soon!
          </p>
          <Link to="/games">
            <Button className="w-full h-12 bg-black text-white border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(254,240,138,1)]" style={{ borderRadius: WOBBLY_SM }}>
              Back to Games Hub
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
          <button
            onClick={() => setIsMuted(m => !m)}
            className="p-2 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors"
            title={isMuted ? "Unmute sound" : "Mute sound"}
          >
            {isMuted ? <VolumeX className="h-5 w-5 text-gray-500" strokeWidth={2.5} /> : <Volume2 className="h-5 w-5 text-black" strokeWidth={2.5} />}
          </button>
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
            {Array.from({ length: levelData.gridSize * levelData.gridSize }).map((_, i) => {
              const r = Math.floor(i / levelData.gridSize);
              const c = i % levelData.gridSize;
              const cellKey = `${r},${c}`;
              const pathPoint = activePathInfo?.keyMap.get(cellKey);
              const isPathCell = !!pathPoint;
              const isBlockerPoint = pathPoint?.isBlockerPoint;

              return (
                <div
                  key={`cell-${i}`}
                  className={`border-2 border-dashed transition-all flex items-center justify-center ${
                    isBlockerPoint
                      ? "bg-rose-100 border-rose-500 shadow-[inset_0_0_8px_rgba(244,63,94,0.4)]"
                      : isPathCell
                      ? "bg-amber-100/70 border-amber-400/80 shadow-[inset_0_0_8px_rgba(251,191,36,0.3)]"
                      : "bg-black/5 border-black/20"
                  }`}
                  style={{
                    gridRow: r + 1,
                    gridColumn: c + 1,
                    borderRadius: WOBBLY_SM
                  }}
                >
                  {isBlockerPoint ? (
                    <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-black flex items-center justify-center animate-ping text-[8px] font-black text-white">
                      ✕
                    </div>
                  ) : isPathCell ? (
                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse border border-black shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                  ) : null}
                </div>
              );
            })}

            {/* Obstacles */}
            {levelData.obstacles.map(obs => {
              const isShaking = shakeId === `obs-${obs.id}`;
              const isMirror = obs.type === "mirror-slash" || obs.type === "mirror-backslash";
              return (
                <motion.button
                  key={`obs-${obs.id}`}
                  onClick={() => handleObstacleTap(obs)}
                  className={`absolute flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    obs.type === "wall"
                      ? "bg-[#d6d3d1] overflow-hidden"
                      : obs.type === "bomb"
                      ? "bg-[#f87171]"
                      : isMirror
                      ? "bg-[#e0f2fe]"
                      : "bg-[#bfdbfe]"
                  }`}
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
<<<<<<< HEAD
                    <MirrorSlashIndicator />
                  )}
                  {obs.type === "mirror-backslash" && (
                    <MirrorBackslashIndicator />
=======
                     <>
                       <div className="absolute w-[120%] h-[4px] bg-sky-400 rounded-full shadow-[0_0_10px_2px_rgba(56,189,248,0.5)]" style={{ transform: "rotate(-45deg)" }} />
                       <span className="absolute text-lg leading-none select-none" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>↗️</span>
                     </>
                  )}
                  {obs.type === "mirror-backslash" && (
                     <>
                       <div className="absolute w-[120%] h-[4px] bg-sky-400 rounded-full shadow-[0_0_10px_2px_rgba(56,189,248,0.5)]" style={{ transform: "rotate(45deg)" }} />
                       <span className="absolute text-lg leading-none select-none" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>↖️</span>
                     </>
>>>>>>> f0aa1beb8df715067818396d66114a6345dcc469
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
                  className="absolute z-30 rounded-xl flex items-center justify-center pointer-events-none"
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
                    <div className="absolute w-full h-full border-4 border-stone-400 rounded-xl bg-stone-400/30" />
                  )}
                  {collisionAnim.type === "arrow" && (
                    <div className="absolute w-full h-full flex items-center justify-center">
                      <X className="h-12 w-12 text-black/60" strokeWidth={4} />
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
                const isMoving = movingArrow?.arrowId === arrow.id;

                let animTarget: any = { scale: 1, rotate: 0, opacity: 1, x: 0, y: 0 };
                let transitionConfig: any = { duration: 0.2 };

                if (isMoving && movingArrow) {
                  animTarget = {
                    x: movingArrow.xKeyframes,
                    y: movingArrow.yKeyframes,
                    opacity: movingArrow.isExit ? [1, 1, 0] : [1, 1, 0.8, 0],
                    scale: 1,
                  };
                  transitionConfig = {
                    duration: movingArrow.duration,
                    ease: "linear",
                  };
                } else if (isShaking) {
                  animTarget = { x: [0, -4, 4, 0], scale: 1, rotate: 0, opacity: 1, y: 0 };
                  transitionConfig = { duration: 0.2 };
                }

                return (
                  <motion.button
                    key={arrow.id}
                    onClick={() => handleTap(arrow)}
                    onMouseEnter={() => setHoveredArrowId(arrow.id)}
                    onMouseLeave={() => setHoveredArrowId(null)}
                    onTouchStart={() => setHoveredArrowId(arrow.id)}
                    onTouchEnd={() => setHoveredArrowId(null)}
                    className={`absolute flex items-center justify-center cursor-pointer ${DIR_COLORS[arrow.dir]} transition-shadow border-2 border-black z-10 ${
                      isTappable ? "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105" : "opacity-70 shadow-none border-2 scale-95"
                    } ${isHinted ? "ring-4 ring-[#fef08a] !shadow-[0_0_15px_rgba(254,240,138,1)] z-20" : ""} ${isMoving ? "z-30 pointer-events-none" : ""}`}
                    style={{
                      gridRow: arrow.row + 1,
                      gridColumn: arrow.col + 1,
                      position: "relative",
                      borderRadius: WOBBLY_SM
                    }}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={animTarget}
                    transition={transitionConfig}
                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                    whileHover={isTappable && !isMoving ? { scale: 1.08 } : {}}
                    whileTap={isTappable && !isMoving ? { scale: 0.92 } : {}}
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
              className="w-full max-w-md bg-white border-4 border-black p-6 flex flex-col max-h-[85vh] relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-black border-2 border-black z-10"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </Button>

              <h2 className="font-display text-2xl font-black mb-3 flex items-center gap-2 uppercase text-black">
                <Lightbulb className="h-6 w-6 text-black" strokeWidth={3} /> How to Play
              </h2>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-black custom-scrollbar">
                
                {/* Objective */}
                <div className="p-3 bg-[#bfdbfe] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl">
                  <p className="text-xs sm:text-sm font-black leading-snug">
                    🎯 <strong>Goal:</strong> Tap arrows to send them flying off the board! Clear <span className="underline decoration-2">all arrows</span> to complete the level.
                  </p>
                  <p className="text-sm text-black font-bold">
                    <strong>🔷 Mirrors:</strong> The diagonal tiles bounce an arrow 90°.
                    The little symbol on the tile (↗️ or ↖️) shows the two directions it connects —
                    e.g. a ↗️ mirror turns an <span className="underline decoration-2">↑</span> arrow
                    so it exits to the right.
                  </p>
                </div>
                </div>

                {/* Live Path Trajectory Feature */}
                <div className="p-3 bg-[#fef08a] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl space-y-1.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                    ✨ Touch & Preview Path
                  </h3>
                  <p className="text-xs font-bold text-black/90 leading-relaxed">
                    Hover or touch any arrow to preview its exact flight trajectory:
                  </p>
                  <div className="flex items-center gap-3 text-xs font-black pt-1">
                    <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-black" /> Amber Trail</span>
                    <span className="inline-flex items-center gap-1 text-rose-600"><span className="w-3 h-3 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center font-black">✕</span> Red Warning</span>
                  </div>
                </div>

                {/* Deflectors & Mirrors */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    🪞 Deflector Mirrors
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl flex flex-col items-center text-center">
                      <div className="w-10 h-10 mb-1">
                        <MirrorSlashIndicator />
                      </div>
                      <span className="text-[11px] font-black uppercase text-sky-900">Slash ( / )</span>
                      <span className="text-[10px] font-bold text-black/70">Turns ↑ → Right<br />Turns ↓ → Left</span>
                    </div>
                    <div className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl flex flex-col items-center text-center">
                      <div className="w-10 h-10 mb-1">
                        <MirrorBackslashIndicator />
                      </div>
                      <span className="text-[11px] font-black uppercase text-indigo-900">Backslash ( \ )</span>
                      <span className="text-[10px] font-bold text-black/70">Turns ↑ → Left<br />Turns ↓ → Right</span>
                    </div>
                  </div>
                </div>

                {/* Special Obstacles */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    🧩 Board Elements
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <div className="p-2.5 bg-stone-100 border-2 border-black rounded-xl flex items-center gap-2">
                      <span className="text-lg">🧱</span>
                      <div>
                        <div className="font-black text-black">Walls</div>
                        <div className="text-[10px] text-black/70">Block arrows</div>
                      </div>
                    </div>
                    <div className="p-2.5 bg-rose-100 border-2 border-black rounded-xl flex items-center gap-2">
                      <Bomb className="h-5 w-5 text-rose-500 shrink-0 animate-pulse" />
                      <div>
                        <div className="font-black text-rose-900">Bombs</div>
                        <div className="text-[10px] text-rose-800">-1 Life if hit</div>
                      </div>
                    </div>
                    <div className="p-2.5 bg-sky-100 border-2 border-black rounded-xl flex items-center gap-2">
                      <span className="text-lg">🧊</span>
                      <div>
                        <div className="font-black text-sky-900">Ice</div>
                        <div className="text-[10px] text-sky-800">Slides through</div>
                      </div>
                    </div>
                    <div className="p-2.5 bg-purple-100 border-2 border-black rounded-xl flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-dashed border-purple-500 rounded-full animate-spin shrink-0" />
                      <div>
                        <div className="font-black text-purple-900">Rotators</div>
                        <div className="text-[10px] text-purple-800">Spins 90° on hit</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow Colors */}
                <div className="pt-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black mb-1.5">
                    🧭 Arrow Directions
                  </h3>
                  <div className="grid grid-cols-4 gap-1.5 text-[11px] font-black text-center">
                    <div className="bg-[#bfdbfe] border-2 border-black py-1 rounded-lg">Up ↑</div>
                    <div className="bg-[#fbcfe8] border-2 border-black py-1 rounded-lg">Down ↓</div>
                    <div className="bg-[#bbf7d0] border-2 border-black py-1 rounded-lg">Left ←</div>
                    <div className="bg-[#fef08a] border-2 border-black py-1 rounded-lg">Right →</div>
                  </div>
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
                        className={`h-12 w-12 shrink-0 border-2 border-black font-display font-black text-sm transition-all outline-none flex items-center justify-center ${i === levelIdx
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
