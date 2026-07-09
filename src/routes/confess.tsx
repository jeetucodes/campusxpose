import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Ghost, Send, ExternalLink, PenLine, Lock } from "lucide-react";
import { addConfession } from "@/lib/confessions.functions";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WOBBLY = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "16px 5px 14px 5px / 5px 14px 5px 16px";
const MAX = 1000;

const MOOD_OPTIONS = [
  { label: "😅 Awkward",    value: "awkward" },
  { label: "💔 Heartbreak", value: "heartbreak" },
  { label: "😂 Funny",      value: "funny" },
  { label: "😤 Frustrated", value: "frustrated" },
  { label: "🥺 Vulnerable", value: "vulnerable" },
  { label: "🔥 Spicy",      value: "spicy" },
];

/** Encode mood as a hidden prefix so no DB column is needed */
function encodeContent(content: string, mood: string | null) {
  return mood ? `[mood:${mood}]${content}` : content;
}

export const Route = createFileRoute("/confess")({
  head: () => ({
    meta: [
      { title: "Confess Anonymously | CampusXpose" },
      { name: "description", content: "Submit your anonymous confession on CampusXpose." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfessFormPage,
});

// ── Radial progress ring for the character counter ────────────────────────
function ProgressRing({ value, max }: { value: number; max: number }) {
  const r = 10;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const stroke = pct > 0.9 ? "#ef4444" : pct > 0.7 ? "#f97316" : "#6366f1";
  return (
    <svg width={28} height={28} className="rotate-[-90deg]">
      <circle cx={14} cy={14} r={r} fill="none" stroke="#e5e7eb" strokeWidth={2.5} />
      <circle
        cx={14} cy={14} r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.2s, stroke 0.3s" }}
      />
    </svg>
  );
}

function ConfessFormPage() {
  const [content, setContent]       = useState("");
  const [customName, setCustomName] = useState("");
  const [mood, setMood]             = useState<string | null>(null);
  const [submitted, setSubmitted]   = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  const postConfession = useMutation({
    mutationFn: () =>
      addConfession({
        data: {
          content:  encodeContent(content.trim(), mood),
          username: customName.trim() || "Anonymous",
        },
      }),
    onSuccess: () => setSubmitted(true),
    onError:   (error) => toast.error("Failed to post: " + (error as any).message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || postConfession.isPending) return;
    postConfession.mutate();
  };

  const remaining = MAX - content.length;
  const activeMoodObj = MOOD_OPTIONS.find(m => m.value === mood);

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-10">

      {/* ── Brand header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-7 flex flex-col items-center gap-2"
      >
        <div
          className="flex items-center justify-center w-16 h-16 bg-white border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          style={{ borderRadius: WOBBLY }}
        >
          <Ghost className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">CampusXpose</h1>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Lock className="w-3 h-3" />
          100% Anonymous · No account needed
        </div>
      </motion.div>

      {/* ── Main card ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!submitted ? (

          /* ── FORM ─────────────────────────────────────────────────────── */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md"
          >
            <div
              className="bg-white border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col gap-5"
              style={{ borderRadius: WOBBLY }}
            >
              {/* Card headline */}
              <div>
                <h2 className="font-display text-xl font-bold leading-snug">
                  Apni baat kaho 🤫
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Koi judge nahi karega. Sab anonymous hai.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                {/* ── Mood picker ────────────────────────────────────────── */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">
                    Mood <span className="font-normal normal-case text-muted-foreground/60">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMood(mood === m.value ? null : m.value)}
                        className={`text-xs font-bold px-3 py-1.5 border-2 transition-all duration-150 active:scale-95 ${
                          mood === m.value
                            ? "border-foreground bg-foreground text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)]"
                            : "border-border bg-white text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                        }`}
                        style={{ borderRadius: WOBBLY_SM }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Name ───────────────────────────────────────────────── */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Naam <span className="font-normal normal-case text-muted-foreground/60">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-muted/10 border-2 border-border px-3 py-2.5 text-base focus:outline-none focus:border-accent focus:bg-accent/5 transition-colors"
                    style={{ borderRadius: WOBBLY_SM }}
                    placeholder="Khali chodo to Anonymous"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    disabled={postConfession.isPending}
                    maxLength={40}
                  />
                </div>

                {/* ── Confession textarea ─────────────────────────────────── */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Confession <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      autoFocus
                      className="w-full bg-muted/10 border-2 border-border px-3 py-2.5 pb-8 text-base focus:outline-none focus:border-accent focus:bg-accent/5 transition-colors resize-none min-h-[160px] overflow-hidden"
                      style={{ borderRadius: WOBBLY_SM }}
                      placeholder="Dil khol ke likh do… yahan sab anonymous hai 🤫"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      disabled={postConfession.isPending}
                      maxLength={MAX}
                    />
                    {/* Character counter floated inside textarea */}
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none">
                      <span className={`text-[11px] font-bold tabular-nums ${remaining < 100 ? "text-orange-500" : remaining < 50 ? "text-red-500" : "text-muted-foreground/50"}`}>
                        {remaining}
                      </span>
                      <ProgressRing value={content.length} max={MAX} />
                    </div>
                  </div>
                </div>

                {/* ── "Posting as" preview pill ──────────────────────────── */}
                <motion.div
                  layout
                  className="flex items-center gap-2 bg-muted/20 border-2 border-dashed border-border px-3 py-2 text-sm"
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  <Ghost className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Posting as</span>
                  <span className="font-bold text-foreground">{customName.trim() || "Anonymous"}</span>
                  {activeMoodObj && (
                    <>
                      <span className="text-muted-foreground/40 mx-0.5">·</span>
                      <span className="font-medium text-muted-foreground">{activeMoodObj.label}</span>
                    </>
                  )}
                </motion.div>

                {/* ── Submit ─────────────────────────────────────────────── */}
                <button
                  type="submit"
                  disabled={!content.trim() || postConfession.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 active:translate-y-px text-white font-bold py-3.5 text-base border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  style={{ borderRadius: WOBBLY }}
                >
                  {postConfession.isPending ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Confess Karo
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Powered by{" "}
              <Link to="/" className="font-bold hover:underline">
                CampusXpose
              </Link>
            </p>
          </motion.div>

        ) : (

          /* ── SUCCESS ──────────────────────────────────────────────────── */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 280 }}
            className="w-full max-w-md"
          >
            <div
              className="bg-white border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 text-center flex flex-col items-center gap-4"
              style={{ borderRadius: WOBBLY }}
            >
              {/* Bouncy ghost icon */}
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 300, delay: 0.1 }}
                className="w-20 h-20 flex items-center justify-center bg-accent/10 border-2 border-accent/30"
                style={{ borderRadius: WOBBLY }}
              >
                <Ghost className="w-10 h-10 text-accent" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h2 className="font-display text-2xl font-bold mb-1">Confession Posted! 👻</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Teri confession submit ho gayi.<br />
                  Ab tu isse Confession Box mein dekh sakta hai!
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
                className="w-full flex flex-col gap-3 mt-1"
              >
                <Link
                  to="/confessions"
                  className="inline-flex items-center justify-center gap-2 w-full bg-accent hover:bg-accent/90 active:translate-y-px text-white font-bold py-3 px-5 border-2 border-border shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                  style={{ borderRadius: WOBBLY }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Confession Box Dekho
                </Link>

                <button
                  onClick={() => {
                    setContent("");
                    setCustomName("");
                    setMood(null);
                    setSubmitted(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground border-2 border-dashed border-border py-2.5 hover:border-foreground/40 transition-colors"
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Ek aur confess karo?
                </button>
              </motion.div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Powered by{" "}
              <Link to="/" className="font-bold hover:underline">
                CampusXpose
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
