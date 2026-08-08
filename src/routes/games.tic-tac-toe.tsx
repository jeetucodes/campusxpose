import { useState, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, User, Bot, Trophy } from "lucide-react";
import { recordGameSession } from "../lib/gameAnalytics";

export const Route = createFileRoute("/games/tic-tac-toe")({
  head: () => ({
    meta: [
      { title: "Tic Tac Toe — CampusXpose Games" },
      {
        name: "description",
        content: "Play Tic Tac Toe on CampusXpose. Challenge a friend or beat the bot!",
      },
    ],
  }),
  component: TicTacToeGame,
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";

type Player = "X" | "O" | null;
type GameMode = "friend" | "bot";

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export default function TicTacToeGame() {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState<boolean>(true);
  const [mode, setMode] = useState<GameMode>("bot");
  const [gameState, setGameState] = useState<"menu" | "playing">("menu");
  const [scores, setScores] = useState({ X: 0, O: 0, Draws: 0 });
  const [winnerInfo, setWinnerInfo] = useState<{ winner: Player | "Draw", line: number[] | null } | null>(null);

  // Sync game session analytics on load
  useEffect(() => {
    recordGameSession("tic-tac-toe", 0, 1);
  }, []);

  const checkWinner = (squares: Player[]) => {
    for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
      const [a, b, c] = WINNING_COMBINATIONS[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: WINNING_COMBINATIONS[i] };
      }
    }
    if (!squares.includes(null)) {
      return { winner: "Draw" as const, line: null };
    }
    return null;
  };

  const minimax = (squares: Player[], depth: number, isMaximizing: boolean): number => {
    const result = checkWinner(squares);
    if (result) {
      if (result.winner === "O") return 10 - depth;
      if (result.winner === "X") return depth - 10;
      return 0; // Draw
    }

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < squares.length; i++) {
        if (squares[i] === null) {
          squares[i] = "O";
          const score = minimax(squares, depth + 1, false);
          squares[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < squares.length; i++) {
        if (squares[i] === null) {
          squares[i] = "X";
          const score = minimax(squares, depth + 1, true);
          squares[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const getBestMove = (squares: Player[]) => {
    // 20% chance to make a random move to make the bot beatable/more fun
    if (Math.random() < 0.2) {
      const availableSpots = squares.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
      if (availableSpots.length > 0) {
        return availableSpots[Math.floor(Math.random() * availableSpots.length)];
      }
    }

    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < squares.length; i++) {
      if (squares[i] === null) {
        squares[i] = "O";
        const score = minimax(squares, 0, false);
        squares[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  };

  const handleClick = useCallback((i: number) => {
    if (board[i] || winnerInfo) return;

    // Player move
    const newBoard = [...board];
    newBoard[i] = xIsNext ? "X" : "O";
    setBoard(newBoard);
    
    const winResult = checkWinner(newBoard);
    if (winResult) {
      handleGameEnd(winResult);
      return;
    }

    setXIsNext(!xIsNext);
  }, [board, xIsNext, winnerInfo, mode]);

  // Bot move effect
  useEffect(() => {
    if (mode === "bot" && !xIsNext && !winnerInfo) {
      const botMoveTimeout = setTimeout(() => {
        const move = getBestMove([...board]);
        if (move !== -1) {
          const newBoard = [...board];
          newBoard[move] = "O";
          setBoard(newBoard);
          
          const winResult = checkWinner(newBoard);
          if (winResult) {
            handleGameEnd(winResult);
          } else {
            setXIsNext(true);
          }
        }
      }, 500); // Small delay for realism
      return () => clearTimeout(botMoveTimeout);
    }
  }, [xIsNext, mode, winnerInfo, board]);

  const handleGameEnd = (result: { winner: Player | "Draw", line: number[] | null }) => {
    setWinnerInfo(result);
    setScores(prev => {
      const key = result.winner === "Draw" ? "Draws" : result.winner as "X" | "O";
      return {
        ...prev,
        [key]: prev[key] + 1
      };
    });
    
    // Save points conceptually (optional)
    if (result.winner === "X") {
        let savedScore = parseInt(localStorage.getItem("cx_tictactoe_score") || "0", 10);
        localStorage.setItem("cx_tictactoe_score", (savedScore + 10).toString());
        window.dispatchEvent(new Event("cx_game_played_event"));
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setWinnerInfo(null);
  };

  const switchMode = (newMode: GameMode) => {
    setMode(newMode);
    setScores({ X: 0, O: 0, Draws: 0 });
    resetGame();
  };

  const startGame = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setGameState("playing");
    setScores({ X: 0, O: 0, Draws: 0 });
    resetGame();
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-black font-sans select-none pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-4 border-black bg-[#fef08a] py-3 shadow-sm">
        <div className="mx-auto max-w-2xl px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/games"
              className="flex items-center justify-center h-10 w-10 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all mr-2"
            >
              <ArrowLeft className="h-5 w-5 text-black" strokeWidth={3} />
            </Link>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight uppercase text-black leading-none">
                Tic Tac Toe
              </h1>
              <span className="text-[11px] font-black text-black/70 uppercase tracking-wider">
                Classic X's & O's
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-6 flex flex-col items-center">
        {gameState === "menu" ? (
          <div className="flex flex-col gap-6 w-full max-w-[300px] mt-10">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => startGame("bot")}
              className="bg-[#93c5fd] border-4 border-black p-5 text-xl font-black font-display uppercase tracking-wide shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-3 transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderRadius: WOBBLY_SM }}
            >
              <Bot className="h-7 w-7" /> Play vs Bot
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => startGame("friend")}
              className="bg-[#fca5a5] border-4 border-black p-5 text-xl font-black font-display uppercase tracking-wide shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-3 transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderRadius: WOBBLY_SM }}
            >
              <User className="h-7 w-7" /> Play vs Friend
            </motion.button>
          </div>
        ) : (
          <>
            {/* Mode Selector */}
            <div className="flex bg-white border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 w-full max-w-[300px]" style={{ borderRadius: WOBBLY_SM }}>
              <button
                onClick={() => switchMode("bot")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 font-display font-black text-xs uppercase tracking-wide transition-all ${
                  mode === "bot" ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(254,240,138,1)]" : "bg-transparent text-black"
                }`}
                style={{ borderRadius: WOBBLY_SM }}
              >
                <Bot className="h-4 w-4" /> Vs Bot
              </button>
              <button
                onClick={() => switchMode("friend")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 font-display font-black text-xs uppercase tracking-wide transition-all ${
                  mode === "friend" ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(254,240,138,1)]" : "bg-transparent text-black"
                }`}
                style={{ borderRadius: WOBBLY_SM }}
              >
                <User className="h-4 w-4" /> Vs Friend
              </button>
            </div>

        {/* Scoreboard */}
        <div className="flex items-center justify-between w-full max-w-[300px] mb-8">
          <div className="flex flex-col items-center bg-[#fca5a5] border-4 border-black p-2 w-20 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_SM }}>
            <span className="text-xs font-black uppercase">Player X</span>
            <span className="text-2xl font-black">{scores.X}</span>
          </div>
          <div className="flex flex-col items-center bg-white border-4 border-black p-2 w-16 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_SM }}>
            <span className="text-[10px] font-black uppercase">Draws</span>
            <span className="text-lg font-black">{scores.Draws}</span>
          </div>
          <div className="flex flex-col items-center bg-[#93c5fd] border-4 border-black p-2 w-20 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_SM }}>
            <span className="text-xs font-black uppercase">Player O</span>
            <span className="text-2xl font-black">{scores.O}</span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mb-6 h-8 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {winnerInfo ? (
                <motion.div
                  key="winner"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="bg-black text-white px-4 py-1.5 border-2 border-black font-display font-black uppercase tracking-wider text-sm shadow-[3px_3px_0px_0px_rgba(254,240,138,1)]"
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  {winnerInfo.winner === "Draw" ? "It's a Draw! 🤝" : `Player ${winnerInfo.winner} Wins! 🏆`}
                </motion.div>
              ) : (
                <motion.div
                  key="turn"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  className={`px-4 py-1.5 border-2 border-black font-display font-black uppercase tracking-wider text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    xIsNext ? "bg-[#fca5a5]" : "bg-[#93c5fd]"
                  }`}
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  {mode === "bot" && !xIsNext ? "Bot is thinking..." : `Player ${xIsNext ? "X" : "O"}'s Turn`}
                </motion.div>
              )}
            </AnimatePresence>
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-3 gap-3 bg-black p-3 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative" style={{ borderRadius: WOBBLY_MD }}>
          {board.map((cell, index) => {
            const isWinningCell = winnerInfo?.line?.includes(index);
            return (
              <motion.button
                key={index}
                whileHover={{ scale: cell || winnerInfo ? 1 : 1.05 }}
                whileTap={{ scale: cell || winnerInfo ? 1 : 0.95 }}
                onClick={() => handleClick(index)}
                disabled={cell !== null || winnerInfo !== null || (mode === "bot" && !xIsNext)}
                className={`w-24 h-24 flex items-center justify-center border-4 border-black text-6xl font-black font-display transition-colors ${
                  cell === "X" ? "text-red-500 bg-white" : cell === "O" ? "text-blue-500 bg-white" : "bg-[#f4f4f5] hover:bg-white"
                } ${isWinningCell ? "bg-[#fef08a] shadow-[inset_0px_0px_15px_rgba(251,191,36,0.8)]" : ""}`}
                style={{ borderRadius: WOBBLY_SM }}
              >
                <AnimatePresence>
                  {cell && (
                    <motion.span
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {cell}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetGame}
            className="bg-white border-4 border-black px-6 py-3 font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            style={{ borderRadius: WOBBLY_SM }}
          >
            <RotateCcw className="h-5 w-5" strokeWidth={3} />
            {winnerInfo ? "Play Again" : "Restart Game"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setGameState("menu")}
            className="bg-[#fef08a] text-black border-4 border-black px-6 py-3 font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            style={{ borderRadius: WOBBLY_SM }}
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={3} />
            Back to Menu
          </motion.button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
