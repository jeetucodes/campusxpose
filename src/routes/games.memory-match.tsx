import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  RotateCcw,
  Trophy,
  Timer,
  MousePointerClick,
  ChevronDown,
  X,
  Flame,
  Sparkles,
  SkullIcon,
} from "lucide-react";
import { recordGameSession } from "../lib/gameAnalytics";
import { useGameSync } from "@/hooks/useGameSync";

export const Route = createFileRoute("/games/memory-match")({
  head: () => ({
    meta: [
      { title: "Memory Match — CampusXpose Games" },
      {
        name: "description",
        content:
          "Test your focus & memory speed! Match all campus emoji card pairs before time runs out on CampusXpose.",
      },
    ],
  }),
  component: MemoryMatchGame,
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";

const EMOJI_POOL = [
  "📚",
  "🎓",
  "☕",
  "✏️",
  "🎒",
  "💻",
  "🍕",
  "⚡",
  "🎯",
  "🏆",
  "🎮",
  "🚲",
  "🔬",
  "🎧",
  "📝",
  "🧠",
  "🌙",
  "🔥",
];

type Difficulty = "easy" | "medium" | "hard";

// Time limits per difficulty (seconds): Easy 2:00, Medium 1:30, Hard 1:00
const DIFFICULTIES: Record<
  Difficulty,
  { label: string; pairs: number; cols: string; timeLimit: number; accent: string }
> = {
  easy: { label: "Easy", pairs: 6, cols: "grid-cols-3", timeLimit: 120, accent: "bg-green-200" },
  medium: { label: "Medium", pairs: 8, cols: "grid-cols-4", timeLimit: 90, accent: "bg-yellow-200" },
  hard: { label: "Hard", pairs: 12, cols: "grid-cols-4", timeLimit: 60, accent: "bg-red-200" },
};

interface CardData {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs: number): CardData[] {
  const chosen = shuffle(EMOJI_POOL).slice(0, pairs);
  const deck = shuffle([...chosen, ...chosen]).map((emoji, idx) => ({
    id: idx,
    emoji,
    flipped: false,
    matched: false,
  }));
  return deck;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MemoryMatchGame() {
  useGameSync("memory-match", "cx_memory_custom_levels");

  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [showDiffPicker, setShowDiffPicker] = useState(false);
  const [deck, setDeck] = useState<CardData[]>(() => buildDeck(DIFFICULTIES.easy.pairs));
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DIFFICULTIES.easy.timeLimit);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [locked, setLocked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [shake, setShake] = useState(false);

  const [best, setBest] = useState<Record<Difficulty, number>>(() => {
    if (typeof window === "undefined") return { easy: 0, medium: 0, hard: 0 };
    try {
      const raw = localStorage.getItem("cx_memory_best_by_diff");
      if (raw) return { easy: 0, medium: 0, hard: 0, ...JSON.parse(raw) };
    } catch (e) {}
    return { easy: 0, medium: 0, hard: 0 };
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLimit = DIFFICULTIES[difficulty].timeLimit;
  const totalPairs = DIFFICULTIES[difficulty].pairs;

  const startNew = useCallback((diff: Difficulty) => {
    setDeck(buildDeck(DIFFICULTIES[diff].pairs));
    setSelected([]);
    setMoves(0);
    setTimeLeft(DIFFICULTIES[diff].timeLimit);
    setRunning(false);
    setWon(false);
    setLost(false);
    setLocked(false);
    setStreak(0);
    setBestStreak(0);
    setShake(false);
  }, []);

  useEffect(() => {
    startNew(difficulty);
  }, [difficulty, startNew]);

  // Countdown timer
  useEffect(() => {
    if (running && !won && !lost) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, won, lost]);

  const matchedCount = useMemo(() => deck.filter((c) => c.matched).length, [deck]);

  // Time up -> lose (only if not already won)
  useEffect(() => {
    if (timeLeft === 0 && running && !won) {
      setLost(true);
      setRunning(false);
      setLocked(true);
    }
  }, [timeLeft, running, won]);

  const handleFlip = (idx: number) => {
    if (locked || won || lost) return;
    const card = deck[idx];
    if (card.flipped || card.matched) return;
    if (selected.length === 2) return;

    if (!running) setRunning(true);

    const nextDeck = deck.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    setDeck(nextDeck);
    const nextSelected = [...selected, idx];
    setSelected(nextSelected);

    if (nextSelected.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nextSelected;
      if (nextDeck[a].emoji === nextDeck[b].emoji) {
        setTimeout(() => {
          setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
          setSelected([]);
          setStreak((s) => {
            const ns = s + 1;
            setBestStreak((bs) => Math.max(bs, ns));
            return ns;
          });
        }, 350);
      } else {
        setLocked(true);
        setStreak(0);
        setShake(true);
        setTimeout(() => {
          setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
          setSelected([]);
          setLocked(false);
          setShake(false);
        }, 700);
      }
    }
  };

  // Win check
  useEffect(() => {
    if (deck.length > 0 && matchedCount === totalPairs && !won && !lost) {
      setWon(true);
      setRunning(false);
      setLocked(true);

      const elapsed = timeLimit - timeLeft;
      const prevBest = best[difficulty];
      const isNewBest = prevBest === 0 || elapsed < prevBest;
      if (isNewBest) {
        const updated = { ...best, [difficulty]: elapsed };
        setBest(updated);
        localStorage.setItem("cx_memory_best_by_diff", JSON.stringify(updated));
        const overallBest = parseInt(localStorage.getItem("cx_memory_best") || "0", 10);
        if (overallBest === 0 || elapsed < overallBest) {
          localStorage.setItem("cx_memory_best", String(elapsed));
        }
      }

      const score = Math.max(0, totalPairs * 100 + timeLeft * 5 - moves * 3 + bestStreak * 10);
      recordGameSession("memory-match", score, totalPairs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedCount, totalPairs, deck.length, lost]);

  const currentBest = best[difficulty];
  const elapsedIfWon = timeLimit - timeLeft;
  const timePct = Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100));
  const timeCritical = timeLeft <= Math.max(10, Math.round(timeLimit * 0.2)) && timeLeft > 0;

  return (
    <div
      className="min-h-[100dvh] pb-16 text-ink font-sans select-none overflow-x-hidden relative"
      style={{
        backgroundColor: "#f4f1ea",
        backgroundImage: `url('https://www.transparenttextures.com/patterns/handmade-paper.png')`,
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
          <h1 className="font-display text-2xl font-black tracking-tight uppercase rotate-1">Memory Match</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Difficulty & Stats bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setShowDiffPicker(true)}
              className={`flex items-center gap-2 px-4 py-2 border-4 border-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none cursor-pointer -rotate-2 ${DIFFICULTIES[difficulty].accent}`}
              style={{ borderRadius: WOBBLY_SM }}
            >
              <span className="font-display text-xl font-black text-ink uppercase">
                {DIFFICULTIES[difficulty].label}
              </span>
              <span className="text-[11px] font-black text-ink/80 flex items-center bg-white px-2 py-0.5 rounded-full border-2 border-ink">
                <ChevronDown className="h-3 w-3" strokeWidth={4} />
              </span>
            </button>

            <div className="flex items-center gap-2 rotate-1">
              <div
                className={`bg-white border-4 border-ink px-4 py-1.5 rounded-wobbly-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center relative mt-2 ${
                  timeCritical ? "animate-pulse" : ""
                }`}
              >
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-ink/70 px-2 rounded-full border-2 border-ink flex items-center gap-0.5 ${
                    timeCritical ? "bg-red-300" : "bg-blue-100"
                  }`}
                >
                  <Timer className="h-2.5 w-2.5" /> TIME
                </div>
                <div
                  className={`font-display text-2xl font-black leading-none mt-1 ${
                    timeCritical ? "text-red-600" : ""
                  }`}
                >
                  {formatTime(timeLeft)}
                </div>
              </div>
              <div className="bg-postit border-4 border-ink px-4 py-1.5 rounded-wobbly-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center relative mt-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-ink/70 bg-white px-2 rounded-full border-2 border-ink flex items-center gap-0.5">
                  <Trophy className="h-2.5 w-2.5 text-amber-600" /> BEST
                </div>
                <div className="font-display text-2xl font-black leading-none mt-1">
                  {currentBest > 0 ? formatTime(currentBest) : "--"}
                </div>
              </div>
            </div>
          </div>

          {/* Time progress bar */}
          <div className="h-3 w-full bg-white border-2 border-ink rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${timeCritical ? "bg-red-500" : "bg-green-400"}`}
              animate={{ width: `${timePct}%` }}
              transition={{ duration: 0.4, ease: "linear" }}
            />
          </div>

          <div className="p-3 bg-white border-4 border-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-sm flex items-center justify-between text-sm font-black -rotate-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-400" />
            <span className="pl-3 text-ink flex items-center gap-2 flex-wrap">
              <MousePointerClick className="h-4 w-4" /> Moves: <span className="text-red-500">{moves}</span>
              <span className="text-ink/50">|</span>
              Pairs: {matchedCount}/{totalPairs}
              <AnimatePresence>
                {streak >= 2 && !won && !lost && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex items-center gap-1 bg-orange-200 border-2 border-ink px-2 py-0.5 rounded-full text-[11px]"
                  >
                    <Flame className="h-3 w-3 text-orange-600" /> {streak}x streak
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <button
              onClick={() => startNew(difficulty)}
              className="flex items-center gap-1 bg-white hover:bg-gray-100 border-2 border-ink px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer shadow-ink-soft transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <RotateCcw className="h-4 w-4" /> Restart
            </button>
          </div>
        </div>

        {/* Card Grid */}
        <motion.div
          className={`grid ${DIFFICULTIES[difficulty].cols} gap-3`}
          animate={shake ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {deck.map((card, idx) => {
            const isSelectedWrong =
              shake && selected.includes(idx) && !card.matched;
            return (
              <button
                key={card.id}
                onClick={() => handleFlip(idx)}
                className="aspect-square [perspective:600px] outline-none"
                disabled={card.matched}
              >
                <motion.div
                  className="relative w-full h-full [transform-style:preserve-3d]"
                  animate={{
                    rotateY: card.flipped || card.matched ? 180 : 0,
                    scale: card.matched ? [1, 1.08, 1] : 1,
                  }}
                  transition={{ duration: 0.35 }}
                >
                  {/* Back face (face-down) */}
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-ink border-4 border-ink shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] [backface-visibility:hidden]"
                    style={{ borderRadius: WOBBLY_SM }}
                  >
                    <span className="text-white text-xl font-display font-black">?</span>
                  </div>
                  {/* Front face (emoji) */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center border-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-3xl [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                      card.matched
                        ? "bg-green-200 border-green-700"
                        : isSelectedWrong
                          ? "bg-red-100 border-red-500"
                          : "bg-white border-ink"
                    }`}
                    style={{ borderRadius: WOBBLY_SM }}
                  >
                    {card.emoji}
                  </div>
                </motion.div>
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* Difficulty Picker Modal */}
      <AnimatePresence>
        {showDiffPicker && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDiffPicker(false)}
          >
            <motion.div
              className="w-full max-w-sm bg-paper border-4 border-ink p-5 space-y-3"
              style={{ borderRadius: WOBBLY_MD }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-black uppercase">Pick Difficulty</h2>
                <button onClick={() => setShowDiffPicker(false)}>
                  <X className="h-5 w-5" strokeWidth={3} />
                </button>
              </div>
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDifficulty(d);
                    setShowDiffPicker(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 border-4 border-ink font-black uppercase transition-all ${
                    d === difficulty ? DIFFICULTIES[d].accent : "bg-white hover:bg-gray-50"
                  }`}
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  <span>{DIFFICULTIES[d].label}</span>
                  <span className="text-xs text-ink/70 flex items-center gap-1">
                    {DIFFICULTIES[d].pairs} pairs · <Timer className="h-3 w-3" /> {formatTime(DIFFICULTIES[d].timeLimit)}
                    {best[d] > 0 ? ` · best ${formatTime(best[d])}` : ""}
                  </span>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win Modal */}
      <AnimatePresence>
        {won && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm bg-paper border-4 border-ink p-6 text-center space-y-4"
              style={{ borderRadius: WOBBLY_MD }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="text-5xl">🎉</div>
              <h2 className="font-display text-2xl font-black uppercase">All Matched!</h2>
              <p className="font-bold text-ink/70">
                {moves} moves · {formatTime(elapsedIfWon)} taken · {formatTime(timeLeft)} left
              </p>
              {bestStreak >= 3 && (
                <p className="flex items-center justify-center gap-1 text-orange-600 font-black text-sm">
                  <Flame className="h-4 w-4" /> Best streak: {bestStreak}x
                </p>
              )}
              {currentBest === elapsedIfWon && (
                <span className="flex items-center justify-center gap-1 text-amber-600 font-black">
                  <Trophy className="h-4 w-4" /> New Best Time!
                </span>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => startNew(difficulty)}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-200 border-4 border-ink py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  <RotateCcw className="h-4 w-4" /> Play Again
                </button>
                <Link
                  to="/games"
                  className="flex-1 flex items-center justify-center gap-2 bg-white border-4 border-ink py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  Games Hub
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lose Modal (time's up) */}
      <AnimatePresence>
        {lost && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm bg-paper border-4 border-ink p-6 text-center space-y-4"
              style={{ borderRadius: WOBBLY_MD }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <SkullIcon className="h-12 w-12 mx-auto text-red-500" />
              <h2 className="font-display text-2xl font-black uppercase">Time's Up!</h2>
              <p className="font-bold text-ink/70">
                Matched {matchedCount}/{totalPairs} pairs in {moves} moves.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => startNew(difficulty)}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-200 border-4 border-ink py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  <RotateCcw className="h-4 w-4" /> Try Again
                </button>
                <Link
                  to="/games"
                  className="flex-1 flex items-center justify-center gap-2 bg-white border-4 border-ink py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  Games Hub
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}