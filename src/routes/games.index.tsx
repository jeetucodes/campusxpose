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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-2 border-dashed border-border bg-background/95 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 flex items-center gap-3">
          <div className="rounded-xl border-2 border-border bg-accent p-2 text-white">
            <Gamepad2 className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Mini Games</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-bold text-foreground">Bored in class?</h2>
          <p className="text-muted-foreground font-medium">Kill some time with these casual games. Your progress is automatically saved!</p>
        </div>

        <div className="flex flex-col gap-4">

          {/* Arrow Puzzle Item */}
          <Link to="/games/arrow-puzzle" className="block outline-none">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-4 overflow-hidden border-2 border-border bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-muted"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-orange-100 text-3xl shadow-sm">
                🏹
              </div>
              <div className="flex-1 space-y-1 text-left">
                <h3 className="font-display text-lg font-bold leading-tight">Arrow Puzzle</h3>
                <p className="text-xs font-medium text-muted-foreground line-clamp-1">Clear the board using logic!</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-transform group-hover:scale-110">
                <ArrowRight className="h-5 w-5" />
              </div>
            </motion.div>
          </Link>

          {/* Pipe Connect Item */}
          <Link to="/games/pipe-connect" className="block outline-none">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-4 overflow-hidden border-2 border-border bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-muted"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-yellow-100 text-3xl shadow-sm">
                ⚡
              </div>
              <div className="flex-1 space-y-1 text-left">
                <h3 className="font-display text-lg font-bold leading-tight">Pipe Connect</h3>
                <p className="text-xs font-medium text-muted-foreground line-clamp-1">Wire up the circuit!</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-transform group-hover:scale-110">
                <ArrowRight className="h-5 w-5" />
              </div>
            </motion.div>
          </Link>

          {/* 2048 Item */}
          <Link to="/games/2048" className="block outline-none">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-4 overflow-hidden border-2 border-border bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-muted"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-blue-100 text-3xl shadow-sm">
                🧩
              </div>
              <div className="flex-1 space-y-1 text-left">
                <h3 className="font-display text-lg font-bold leading-tight">2048</h3>
                <p className="text-xs font-medium text-muted-foreground line-clamp-1">Merge tiles and beat your score!</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-transform group-hover:scale-110">
                <ArrowRight className="h-5 w-5" />
              </div>
            </motion.div>
          </Link>

          {/* Memory Match Item */}
          <Link to="/games/memory-match" className="block outline-none">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-4 overflow-hidden border-2 border-border bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-muted"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-emerald-100 text-3xl shadow-sm">
                🃏
              </div>
              <div className="flex-1 space-y-1 text-left">
                <h3 className="font-display text-lg font-bold leading-tight">Memory Match</h3>
                <p className="text-xs font-medium text-muted-foreground line-clamp-1">Match the campus emojis!</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-transform group-hover:scale-110">
                <ArrowRight className="h-5 w-5" />
              </div>
            </motion.div>
          </Link>

        </div>
      </div>
    </div>
  );
}
