import { useEffect, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Lightbulb, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const EMOJIS = ["🍕", "🍻", "📚", "🎓", "💻", "💔", "🎸", "☕"];

type Card = {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
};

function generateDeck(): Card[] {
  const deck = [...EMOJIS, ...EMOJIS]
    .sort(() => Math.random() - 0.5)
    .map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));
  return deck;
}

export default function MemoryMatchGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [won, setWon] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    setCards(generateDeck());
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
    setWon(false);
    setIsProcessing(false);
  };

  const handleCardClick = (index: number) => {
    // Prevent clicking if processing, card is already flipped, or matched
    if (isProcessing || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setIsProcessing(true);
      setMoves((m) => m + 1);

      const [firstIdx, secondIdx] = newFlipped;
      if (newCards[firstIdx].emoji === newCards[secondIdx].emoji) {
        // Match found
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstIdx].isMatched = true;
          matchedCards[secondIdx].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          setIsProcessing(false);
          
          const newMatches = matches + 1;
          setMatches(newMatches);
          if (newMatches === EMOJIS.length) {
            setWon(true);
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstIdx].isFlipped = false;
          resetCards[secondIdx].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
          setIsProcessing(false);
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-4 border-black bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/games" className="flex items-center gap-2 text-sm font-black text-black hover:scale-105 transition-transform">
            <ArrowLeft className="h-5 w-5" strokeWidth={3} /> Back
          </Link>
          <h1 className="font-display text-2xl font-black tracking-tight uppercase">Memory Match</h1>
          <div className="w-14" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-8 space-y-8">
        
        {/* Stats Dashboard */}
        <div className="flex items-stretch gap-4">
          <div className="flex-1 bg-[#bfdbfe] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex flex-col items-center justify-center transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
            <div className="text-[12px] font-black text-black/70 uppercase tracking-widest mb-1">Moves</div>
            <div className="font-display text-3xl font-black text-black leading-none">{moves}</div>
          </div>
          <div className="flex-1 bg-[#bbf7d0] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex flex-col items-center justify-center transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
            <div className="text-[12px] font-black text-black/70 uppercase tracking-widest mb-1">Matches</div>
            <div className="font-display text-3xl font-black text-black leading-none">{matches}/{EMOJIS.length}</div>
          </div>
          <Button
            onClick={initGame}
            className="w-[80px] sm:w-[90px] h-auto flex-shrink-0 border-4 border-black bg-[#fbcfe8] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#f9a8d4] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center p-0"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <RotateCcw className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={3} />
          </Button>
        </div>

        {/* Game Board */}
        <div className="relative w-full bg-white border-4 border-black p-3 sm:p-4 select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
          <div className="grid grid-cols-4 gap-3 sm:gap-4 aspect-square">
            {cards.map((card, index) => (
              <div 
                key={card.id} 
                className="relative perspective-1000 w-full h-full cursor-pointer"
                onClick={() => handleCardClick(index)}
              >
                <motion.div
                  className="w-full h-full relative preserve-3d"
                  initial={false}
                  animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  style={{ transformStyle: "preserve-3d" }}
                  whileHover={!(card.isFlipped || card.isMatched || isProcessing) ? { scale: 1.05 } : {}}
                  whileTap={!(card.isFlipped || card.isMatched || isProcessing) ? { scale: 0.95 } : {}}
                >
                  {/* Card Back (Hidden when flipped) */}
                  <div 
                    className="absolute inset-0 backface-hidden bg-[#bfdbfe] border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    style={{ backfaceVisibility: "hidden", borderRadius: WOBBLY_SM }}
                  >
                    <span className="text-black/40 font-display font-black text-2xl sm:text-3xl">CX</span>
                  </div>
                  
                  {/* Card Front (Shows Emoji) */}
                  <div 
                    className={`absolute inset-0 backface-hidden border-4 border-black flex items-center justify-center text-4xl sm:text-5xl ${card.isMatched ? 'bg-[#bbf7d0] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                    style={{ 
                      backfaceVisibility: "hidden", 
                      transform: "rotateY(180deg)",
                      borderRadius: WOBBLY_SM
                    }}
                  >
                    <motion.div
                      animate={card.isMatched ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      {card.emoji}
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

          {/* Win Overlay */}
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
                  className="bg-white border-4 border-black p-8 text-center space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-[90%] max-w-sm"
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
                    Sharp Memory!
                  </h2>
                  <p className="text-black/70 text-lg font-bold">
                    You found all pairs in <strong className="text-black">{moves}</strong> moves
                  </p>
                  <div className="flex flex-col gap-3 justify-center mt-2">
                    <Button onClick={initGame} className="w-full h-12 bg-[#fef08a] text-black hover:bg-[#fde047] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-lg font-black" style={{ borderRadius: WOBBLY_SM }}>
                      <RotateCcw className="h-5 w-5 mr-2" strokeWidth={3} /> Play Again
                    </Button>
                    <Button asChild className="w-full h-12 bg-white text-black hover:bg-gray-100 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-lg font-black" style={{ borderRadius: WOBBLY_SM }}>
                      <Link to="/games">More Games</Link>
                    </Button>
                  </div>
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
              className="w-full max-w-sm bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative"
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
                  Test your memory! Tap any card to flip it over and reveal a campus emoji.
                </p>
                <ul className="text-sm text-black font-bold space-y-2 list-disc pl-5">
                  <li>Flip two cards at a time.</li>
                  <li>If they match, they stay face up!</li>
                  <li>If they don't, they flip back over.</li>
                  <li>Try to find all pairs in the fewest moves possible.</li>
                </ul>
                <div className="pt-2 text-center text-xl">
                  🍕 🍻 📚 🎓 💻 💔 🎸 ☕
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
