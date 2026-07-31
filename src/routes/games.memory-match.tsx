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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-2 border-dashed border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/games" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight">Memory Match</h1>
          <div className="w-14" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
        
        {/* Stats Dashboard */}
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-[24px] bg-white border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_3px_3px_6px_rgba(255,255,255,1),inset_-3px_-3px_6px_rgba(0,0,0,0.03)] p-3 flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Moves</div>
            <div className="font-display text-2xl font-bold text-[#475569] leading-none">{moves}</div>
          </div>
          <div className="flex-1 rounded-[24px] bg-white border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_3px_3px_6px_rgba(255,255,255,1),inset_-3px_-3px_6px_rgba(0,0,0,0.03)] p-3 flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Matches</div>
            <div className="font-display text-2xl font-bold text-accent leading-none">{matches}/{EMOJIS.length}</div>
          </div>
          <Button
            onClick={initGame}
            variant="outline"
            size="icon"
            className="h-[68px] w-[68px] rounded-[24px] border-2 border-white bg-white hover:bg-[#f8fafc] shrink-0 shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_3px_3px_6px_rgba(255,255,255,1),inset_-3px_-3px_6px_rgba(0,0,0,0.03)] text-[#94a3b8] hover:text-[#475569] transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw className="h-6 w-6" strokeWidth={2.5} />
          </Button>
        </div>

        {/* Game Board */}
        <div className="relative w-full bg-[#e2e8f0] p-4 sm:p-5 select-none shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] rounded-[32px]">
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
                    className="absolute inset-0 backface-hidden bg-[#60a5fa] border-2 border-white flex items-center justify-center shadow-[4px_4px_10px_rgba(0,0,0,0.15),inset_3px_3px_6px_rgba(255,255,255,0.6),inset_-3px_-3px_6px_rgba(30,58,138,0.3)]"
                    style={{ backfaceVisibility: "hidden", borderRadius: "20px" }}
                  >
                    <span className="text-white opacity-40 font-display font-bold text-2xl sm:text-3xl">CX</span>
                  </div>
                  
                  {/* Card Front (Shows Emoji) */}
                  <div 
                    className={`absolute inset-0 backface-hidden border-2 border-white flex items-center justify-center text-4xl sm:text-5xl ${card.isMatched ? 'bg-[#34d399] shadow-[4px_4px_10px_rgba(0,0,0,0.15),inset_3px_3px_6px_rgba(255,255,255,0.6),inset_-3px_-3px_6px_rgba(6,78,59,0.3)]' : 'bg-white shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_3px_3px_6px_rgba(255,255,255,1),inset_-3px_-3px_6px_rgba(0,0,0,0.03)]'}`}
                    style={{ 
                      backfaceVisibility: "hidden", 
                      transform: "rotateY(180deg)",
                      borderRadius: "20px"
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
                className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/40 z-20"
                style={{ borderRadius: "32px" }}
              >
                <motion.div
                  initial={{ scale: 0.6, y: 24 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-white border-2 border-border p-8 text-center space-y-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-[90%] max-w-sm"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-6xl drop-shadow-md"
                  >
                    🎉
                  </motion.div>
                  <h2 className="font-display text-3xl font-bold text-foreground">
                    Sharp Memory!
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium">
                    You found all pairs in <strong className="text-[#60a5fa]">{moves}</strong> moves
                  </p>
                  <div className="flex flex-col gap-3 justify-center mt-2">
                    <Button onClick={initGame} className="w-full h-12 bg-accent text-white hover:bg-accent/90 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg font-bold" style={{ borderRadius: WOBBLY_MD }}>
                      <RotateCcw className="h-5 w-5 mr-2" /> Play Again
                    </Button>
                    <Button asChild variant="outline" className="w-full h-12 bg-white text-foreground hover:bg-muted border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg font-bold" style={{ borderRadius: WOBBLY_MD }}>
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
          className="w-full bg-[#f8fafc] border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.05),inset_2px_2px_4px_rgba(255,255,255,0.9),inset_-2px_-2px_4px_rgba(0,0,0,0.02)] p-4 font-display font-bold text-sm text-foreground hover:opacity-90 transition-opacity rounded-[20px] flex items-center justify-center gap-2"
        >
          <Lightbulb className="h-5 w-5 text-yellow-500" /> How to Play
        </button>

      </div>

      {/* How to Play Modal Overlay */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-[#f8fafc] border-2 border-white p-6 shadow-[8px_8px_20px_rgba(0,0,0,0.1),inset_4px_4px_8px_rgba(255,255,255,1),inset_-4px_-4px_8px_rgba(0,0,0,0.05)] flex flex-col relative rounded-[32px]"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowHelp(false)} 
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white shadow-[2px_2px_5px_rgba(0,0,0,0.05)] hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>

              <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-yellow-500" /> How to Play
              </h2>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Test your memory! Tap any card to flip it over and reveal a campus emoji.
                </p>
                <ul className="text-sm text-muted-foreground font-medium space-y-2 list-disc pl-5">
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
