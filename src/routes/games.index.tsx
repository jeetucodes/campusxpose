import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Gamepad2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "Games — CampusXpose" },
      { name: "description", content: "Play fun mini-games to kill time on CampusXpose!" },
    ],
  }),
  component: GamesHub,
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

function GamesHub() {
  return (
    <div className="min-h-screen bg-[#f4f4f5] pb-24 text-black font-sans">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-2 border-black bg-[#fef08a] py-3">
        <div className="mx-auto max-w-2xl px-4 flex items-center gap-3">
          <div className="rounded-lg border-2 border-black bg-white p-1.5 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Gamepad2 className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-black tracking-wide uppercase text-black">Mini Games</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-black text-black uppercase tracking-tight">Bored in class?</h2>
          <p className="text-black/70 font-bold text-sm">Kill some time with these casual games. Progress is saved!</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Arrow Puzzle Item */}
          <Link to="/games/arrow-puzzle" className="block outline-none">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-3 overflow-hidden border-[3px] border-black bg-[#fca5a5] p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-white text-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                🏹
              </div>
              <div className="flex-1 space-y-0.5 text-left">
                <h3 className="font-display text-lg font-black text-black uppercase tracking-tight">Arrow Puzzle</h3>
                <p className="text-xs font-bold text-black/80">Clear the board using logic!</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border-[3px] border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-110 group-hover:bg-black group-hover:text-white">
                <ArrowRight className="h-5 w-5" strokeWidth={3} />
              </div>
            </motion.div>
          </Link>

          {/* Pipe Connect Item */}
          <Link to="/games/pipe-connect" className="block outline-none">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-3 overflow-hidden border-[3px] border-black bg-[#bfdbfe] p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-white text-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                ⚡
              </div>
              <div className="flex-1 space-y-0.5 text-left">
                <h3 className="font-display text-lg font-black text-black uppercase tracking-tight">Pipe Connect</h3>
                <p className="text-xs font-bold text-black/80">Wire up the circuit!</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border-[3px] border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-110 group-hover:bg-black group-hover:text-white">
                <ArrowRight className="h-5 w-5" strokeWidth={3} />
              </div>
            </motion.div>
          </Link>

          {/* 2048 Item */}
          <Link to="/games/2048" className="block outline-none">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-3 overflow-hidden border-[3px] border-black bg-[#fbcfe8] p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-white text-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                🧩
              </div>
              <div className="flex-1 space-y-0.5 text-left">
                <h3 className="font-display text-lg font-black text-black uppercase tracking-tight">2048</h3>
                <p className="text-xs font-bold text-black/80">Merge tiles and beat your score!</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border-[3px] border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-110 group-hover:bg-black group-hover:text-white">
                <ArrowRight className="h-5 w-5" strokeWidth={3} />
              </div>
            </motion.div>
          </Link>

          {/* Memory Match Item */}
          <Link to="/games/memory-match" className="block outline-none">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-3 overflow-hidden border-[3px] border-black bg-[#bbf7d0] p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-white text-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                🃏
              </div>
              <div className="flex-1 space-y-0.5 text-left">
                <h3 className="font-display text-lg font-black text-black uppercase tracking-tight">Memory Match</h3>
                <p className="text-xs font-bold text-black/80">Match the campus emojis!</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border-[3px] border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-110 group-hover:bg-black group-hover:text-white">
                <ArrowRight className="h-5 w-5" strokeWidth={3} />
              </div>
            </motion.div>
          </Link>

        </div>
      </div>
    </div>
  );
}
