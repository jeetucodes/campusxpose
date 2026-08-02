import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Lightbulb, Zap, X, ChevronDown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/games/memory-match")({
  head: () => ({
    meta: [
      { title: "Memory Match — CampusXpose Games" },
      { name: "description", content: "Test your memory with this campus-themed card matching game!" },
    ],
  }),
  component: MemoryMatchGame,
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";

const DEFAULT_EMOJIS = ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑", "🎯", "🏆"];

const STATIC_MEMORY_LEVELS = [
  { title: "Easy Emoji Match", pairsCount: 4, timeLimit: 60, emojis: ["🚀", "💻", "🤖", "⚡"] },
  { title: "Medium Campus Match", pairsCount: 6, timeLimit: 50, emojis: ["🚀", "💻", "🤖", "⚡", "🎮", "🧠"] },
  { title: "Hard Speed Match", pairsCount: 8, timeLimit: 40, emojis: ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑"] },
  { title: "Expert Cyber Match", pairsCount: 10, timeLimit: 30, emojis: ["🚀", "💻", "🤖", "⚡", "🎮", "🧠", "🔥", "👑", "🎯", "🏆"] },
];

type Card = {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
};

export default function MemoryMatchGame() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [showLevels, setShowLevels] = useState(false);
  const [customCount, setCustomCount] = useState(0);

  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync custom level count
  useEffect(() => {
    const syncLevels = () => {
      try {
        const raw = localStorage.getItem("cx_memory_custom_levels");
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
      const overridesRaw = localStorage.getItem("cx_memory_level_overrides");
      if (overridesRaw) {
        const overrides = JSON.parse(overridesRaw);
        if (overrides[levelIdx]) return overrides[levelIdx];
      }

      if (levelIdx >= 4) {
        const customRaw = localStorage.getItem("cx_memory_custom_levels");
        if (customRaw) {
          const list = JSON.parse(customRaw);
          if (list[levelIdx - 4]) return list[levelIdx - 4];
        }
      }
    } catch (e) {}

    return STATIC_MEMORY_LEVELS[levelIdx] || STATIC_MEMORY_LEVELS[0];
  }, [levelIdx]);

  const targetPairs = currentLevelData.pairsCount || 4;
  const timeLimit = currentLevelData.timeLimit || 60;
  const emojiPool = currentLevelData.emojis || DEFAULT_EMOJIS;

  // Generate Deck
  const generateDeck = useCallback((): Card[] => {
    const chosenEmojis = emojiPool.slice(0, targetPairs);
    const deck = [...chosenEmojis, ...chosenEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    return deck;
  }, [targetPairs, emojiPool]);

  // Init Level
  const initGame = useCallback(() => {
    setCards(generateDeck());
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
    setWon(false);
    setGameOver(false);
    setTimeLeft(timeLimit);
    setIsProcessing(false);
  }, [generateDeck, timeLimit]);

  useEffect(() => {
    initGame();
  }, [levelIdx, initGame]);

  // Countdown timer
  useEffect(() => {
    if (won || gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [won, gameOver]);

  const handleCardClick = (index: number) => {
    if (isProcessing || won || gameOver || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setIsProcessing(true);

      const [firstIndex, secondIndex] = newFlipped;
      if (cards[firstIndex].emoji === cards[secondIndex].emoji) {
        setTimeout(() => {
          newCards[firstIndex].isMatched = true;
          newCards[secondIndex].isMatched = true;
          setCards([...newCards]);
          setFlippedIndices([]);
          setIsProcessing(false);

          const newMatches = matches + 1;
          setMatches(newMatches);

          if (newMatches === targetPairs) {
            setWon(true);
            const timeSpent = timeLimit - timeLeft;
            try {
              const prevBest = parseInt(localStorage.getItem("cx_memory_best") || "999", 10);
              if (timeSpent < prevBest) {
                localStorage.setItem("cx_memory_best", String(timeSpent));
              }
            } catch (e) {}
          }
        }, 300);
      } else {
        setTimeout(() => {
          newCards[firstIndex].isFlipped = false;
          newCards[secondIndex].isFlipped = false;
          setCards([...newCards]);
          setFlippedIndices([]);
          setIsProcessing(false);
        }, 800);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5] pb-16 text-black font-sans select-none">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-4 border-black bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/games" className="flex items-center gap-2 text-sm font-black text-black hover:scale-105 transition-transform">
            <ArrowLeft className="h-5 w-5" strokeWidth={3} /> Back
          </Link>
          <h1 className="font-display text-2xl font-black tracking-tight uppercase">Memory Match</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">

        {/* Dashboard Bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            {/* Level Select Button */}
            <button
              onClick={() => setShowLevels(true)}
              className="flex items-center gap-2 bg-[#bbf7d0] px-4 py-2.5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-none transition-all outline-none cursor-pointer"
              style={{ borderRadius: WOBBLY_SM }}
            >
              <span className="font-display text-lg font-black text-black uppercase">Lvl {levelIdx + 1}</span>
              <span className="text-[11px] font-black text-black/80 flex items-center bg-white px-2 py-0.5 rounded-full border-2 border-black">
                / {totalLevelsCount} <ChevronDown className="h-3 w-3 ml-1" strokeWidth={4} />
              </span>
            </button>

            {/* Timer & Pairs Matched */}
            <div className="flex items-center gap-2">
              <div className="bg-[#fef08a] border-3 border-black px-3.5 py-1.5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center">
                <div className="text-[9px] font-black uppercase text-black/70">TIMER</div>
                <div className="font-display text-lg font-black leading-none">{timeLeft}s</div>
              </div>
              <div className="bg-[#bfdbfe] border-3 border-black px-3.5 py-1.5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center">
                <div className="text-[9px] font-black uppercase text-black/70">PAIRS</div>
                <div className="font-display text-lg font-black leading-none">{matches}/{targetPairs}</div>
              </div>
            </div>
          </div>

          {/* Restart Row */}
          <div className="p-3 bg-white border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-2xl flex items-center justify-between text-xs font-black">
            <span>{currentLevelData.title || `Level ${levelIdx + 1}`}</span>
            <button
              onClick={initGame}
              className="flex items-center gap-1 bg-[#fef08a] hover:bg-yellow-200 border-2 border-black px-3 py-1 rounded-xl text-xs font-black cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="relative border-4 border-black bg-[#18181b] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
          <div className={`grid gap-3 ${cards.length <= 8 ? "grid-cols-4" : cards.length <= 12 ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-5"}`}>
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCardClick(index)}
                className="h-20 sm:h-24 relative cursor-pointer"
              >
                <div
                  className={`w-full h-full border-3 border-black rounded-2xl flex items-center justify-center text-3xl sm:text-4xl transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    card.isFlipped || card.isMatched
                      ? "bg-[#bbf7d0] text-black"
                      : "bg-white hover:bg-yellow-100"
                  }`}
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  {card.isFlipped || card.isMatched ? card.emoji : "❓"}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Win Overlay */}
          <AnimatePresence>
            {won && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#bbf7d0]/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-black space-y-4 rounded-3xl border-4 border-black"
              >
                <div className="text-5xl">🎉</div>
                <h2 className="font-display text-3xl font-black uppercase text-black">Level Cleared!</h2>
                <p className="text-xs font-black text-black/80">Matched all {targetPairs} pairs in {timeLimit - timeLeft} seconds!</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={initGame}
                    className="bg-white hover:bg-gray-100 border-2 border-black px-4 py-2 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => {
                      if (levelIdx + 1 < totalLevelsCount) setLevelIdx(l => l + 1);
                      else initGame();
                    }}
                    className="bg-black text-white border-2 border-black px-5 py-2.5 rounded-xl font-display font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(254,240,138,1)] cursor-pointer"
                  >
                    Next Level →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Over Overlay */}
          <AnimatePresence>
            {gameOver && !won && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-4 rounded-3xl"
              >
                <div className="text-5xl">⏰</div>
                <h2 className="font-display text-3xl font-black uppercase text-[#fca5a5]">Time's Up!</h2>
                <p className="text-xs font-bold text-gray-300">You ran out of time before matching all card pairs.</p>
                <button
                  onClick={initGame}
                  className="bg-[#fef08a] hover:bg-yellow-200 text-black border-2 border-black px-6 py-2.5 rounded-2xl font-display font-black text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  Try Again
                </button>
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
              onClick={e => e.stopPropagation()}
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
                <h2 className="font-display text-2xl font-black uppercase text-black">Select Memory Level</h2>
                <span className="text-xs font-black bg-[#bbf7d0] text-black border-2 border-black px-2.5 py-1 rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  {totalLevelsCount} Levels
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                {Array.from({ length: totalLevelsCount }).map((_, i) => {
                  let lvlData = STATIC_MEMORY_LEVELS[i];
                  try {
                    const overridesRaw = localStorage.getItem("cx_memory_level_overrides");
                    if (overridesRaw && JSON.parse(overridesRaw)[i]) lvlData = JSON.parse(overridesRaw)[i];
                    else if (i >= 4) {
                      const customRaw = localStorage.getItem("cx_memory_custom_levels");
                      if (customRaw && JSON.parse(customRaw)[i - 4]) lvlData = JSON.parse(customRaw)[i - 4];
                    }
                  } catch (e) {}

                  const title = lvlData?.title || `Match Level #${i + 1}`;
                  const pairs = lvlData?.pairsCount || 4;
                  const time = lvlData?.timeLimit || 60;

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setLevelIdx(i);
                        setShowLevels(false);
                      }}
                      className={`w-full p-3 border-2 border-black rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        i === levelIdx
                          ? "bg-[#bbf7d0] border-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] scale-[1.02]"
                          : "bg-white hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-black text-white border border-black flex items-center justify-center font-display font-black text-xs">
                          #{i + 1}
                        </div>
                        <div>
                          <div className="font-display font-black text-xs uppercase text-black leading-snug">{title}</div>
                          <div className="text-[10px] font-bold text-black/70">{pairs} Pairs • {time}s Limit</div>
                        </div>
                      </div>

                      {i === levelIdx && (
                        <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-full">ACTIVE</span>
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
