import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ghost, Send, X, PenLine, Heart, Flame, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getConfessions, addConfession, toggleLikeConfession, getMyLikedConfessions } from "@/lib/confessions.functions";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserSymbol } from "@/components/UserSymbol";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "16px 5px 14px 5px / 5px 14px 5px 16px";

/** Get or create a persistent anonymous device ID stored in localStorage */
function getDeviceId(): string {
  try {
    let id = localStorage.getItem("cx_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("cx_device_id", id);
    }
    return id;
  } catch {
    return "fallback-device";
  }
}

const MOOD_OPTIONS = [
  { label: "😅 Awkward", value: "awkward" },
  { label: "💔 Heartbreak", value: "heartbreak" },
  { label: "😂 Funny", value: "funny" },
  { label: "😤 Frustrated", value: "frustrated" },
  { label: "🥺 Vulnerable", value: "vulnerable" },
  { label: "🔥 Spicy", value: "spicy" },
];

const MOOD_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  awkward:    { bg: "bg-yellow-50",  border: "border-yellow-200", text: "text-yellow-700",  accent: "bg-yellow-100" },
  heartbreak: { bg: "bg-rose-50",    border: "border-rose-200",   text: "text-rose-600",    accent: "bg-rose-100" },
  funny:      { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-600",  accent: "bg-orange-100" },
  frustrated: { bg: "bg-red-50",     border: "border-red-200",    text: "text-red-700",     accent: "bg-red-100" },
  vulnerable: { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",    accent: "bg-blue-100" },
  spicy:      { bg: "bg-pink-50",    border: "border-pink-200",   text: "text-pink-600",    accent: "bg-pink-100" },
  default:    { bg: "bg-white",      border: "border-border",     text: "text-foreground",  accent: "bg-muted/20" },
};

function getMoodColors(mood?: string) {
  return MOOD_COLORS[mood ?? ""] ?? MOOD_COLORS.default;
}

/** Encode mood into content so no DB schema change is needed */
function encodeConfessionContent(content: string, mood: string | null) {
  if (!mood) return content;
  return `[mood:${mood}]${content}`;
}

/** Extract mood tag and clean content from stored string */
function parseConfession(raw: string): { mood: string | null; content: string } {
  const match = raw.match(/^\[mood:([a-z]+)\]([\s\S]*)$/);
  if (match) return { mood: match[1], content: match[2] };
  return { mood: null, content: raw };
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const Route = createFileRoute("/confessions")({
  head: () => ({
    meta: [
      { title: "Confession Box | CampusXpose" },
      { name: "description", content: "Anonymous confession box for college students." },
    ],
  }),
  component: ConfessionsPage,
});

function ConfessionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [content, setContent] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"new" | "hot">("new");
  const [deviceId] = useState(() => getDeviceId());
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: confessions = [], isLoading } = useQuery({
    queryKey: ["confessions"],
    queryFn: () => getConfessions(),
  });

  const { data: myLikedIds = [] } = useQuery({
    queryKey: ["my_liked_confessions", deviceId],
    queryFn: () => getMyLikedConfessions({ data: { device_id: deviceId } }),
    enabled: !!deviceId && deviceId !== "fallback-device",
  });

  const likedSet = new Set<string>(myLikedIds);

  // Sorted feed
  const sortedConfessions = [...confessions].sort((a: any, b: any) => {
    if (sortBy === "hot") return (b.likes ?? 0) - (a.likes ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  useEffect(() => {
    if (formOpen) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [formOpen]);

  const postConfession = useMutation({
    mutationFn: () =>
      addConfession({
        data: {
          content: encodeConfessionContent(content, selectedMood),
          username: customName.trim() || "Anonymous",
        },
      }),
    onSuccess: (newConfession) => {
      setContent("");
      setCustomName("");
      setSelectedMood(null);
      setFormOpen(false);
      queryClient.setQueryData(["confessions"], (old: any) => [newConfession, ...(old || [])]);
      toast.success("Confession posted! 🤫");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to post confession: " + error.message);
    },
  });

  const toggleLike = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "like" | "unlike" }) =>
      toggleLikeConfession({ data: { id, device_id: deviceId, action } }),
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: ["confessions"] });
      await queryClient.cancelQueries({ queryKey: ["my_liked_confessions", deviceId] });

      const prevConfessions = queryClient.getQueryData(["confessions"]);
      const prevLiked = queryClient.getQueryData(["my_liked_confessions", deviceId]);

      queryClient.setQueryData(["my_liked_confessions", deviceId], (old: string[] = []) => {
        if (action === "like") return [...old.filter(x => x !== id), id];
        return old.filter(x => x !== id);
      });

      queryClient.setQueryData(["confessions"], (old: any) => {
        if (!old) return old;
        return old.map((c: any) =>
          c.id === id
            ? { ...c, likes: Math.max(0, (c.likes || 0) + (action === "like" ? 1 : -1)) }
            : c
        );
      });

      return { prevConfessions, prevLiked };
    },
    onSuccess: (result, { id }) => {
      if (result && typeof result.likes === "number") {
        queryClient.setQueryData(["confessions"], (old: any) => {
          if (!old) return old;
          return old.map((c: any) =>
            c.id === id ? { ...c, likes: result.likes } : c
          );
        });
      }
    },
    onError: (_err, _vars, context: any) => {
      if (context?.prevConfessions !== undefined)
        queryClient.setQueryData(["confessions"], context.prevConfessions);
      if (context?.prevLiked !== undefined)
        queryClient.setQueryData(["my_liked_confessions", deviceId], context.prevLiked);
      toast.error("Could not update like. Try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    postConfession.mutate();
  };

  return (
    <SiteShell hideFooter>
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Ghost className="h-8 w-8 md:h-10 md:w-10 text-primary" /> Confession Box
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Dil ki baat, bina darr ke. 100% anonymous.
            </p>
          </div>

          <Button
            onClick={() => setFormOpen(true)}
            className="hidden md:flex items-center gap-2 border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-accent hover:bg-accent/90 text-white font-bold px-5 py-2.5 shrink-0"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <PenLine className="w-4 h-4" />
            Confess
          </Button>
        </div>

        {/* Sort Tabs */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setSortBy("new")}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold border-2 transition-all duration-150 ${
              sortBy === "new"
                ? "bg-foreground text-white border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                : "bg-white text-muted-foreground border-border hover:text-foreground"
            }`}
            style={{ borderRadius: WOBBLY_SM }}
          >
            <Sparkles className="w-3.5 h-3.5" /> New
          </button>
          <button
            onClick={() => setSortBy("hot")}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold border-2 transition-all duration-150 ${
              sortBy === "hot"
                ? "bg-orange-500 text-white border-orange-500 shadow-[2px_2px_0px_0px_rgba(234,88,12,0.4)]"
                : "bg-white text-muted-foreground border-border hover:text-foreground"
            }`}
            style={{ borderRadius: WOBBLY_SM }}
          >
            <Flame className="w-3.5 h-3.5" /> Hot
          </button>
          {!isLoading && (
            <span className="ml-auto text-xs text-muted-foreground font-medium">
              {confessions.length} confession{confessions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 bg-white border-2 border-border animate-pulse"
                  style={{ borderRadius: WOBBLY_MD }}
                />
              ))}
            </div>
          ) : sortedConfessions.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground border-2 border-dashed border-border bg-white"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <Ghost className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">Koi confession abhi tak nahi...</p>
              <p className="text-sm mt-1">Be the first ghost here 👻</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {sortedConfessions.map((c: any, i: number) => {
                const isLiked = likedSet.has(c.id);
                const isPending = toggleLike.isPending && toggleLike.variables?.id === c.id;
                return (
                  <ConfessionCard
                    key={c.id}
                    c={c}
                    i={i}
                    isLiked={isLiked}
                    isPending={isPending}
                    onToggleLike={() =>
                      toggleLike.mutate({ id: c.id, action: isLiked ? "unlike" : "like" })
                    }
                  />
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Floating Confess Button — mobile */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-24 right-5 z-40 md:hidden flex items-center gap-2 bg-accent text-white border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-4 py-3 font-bold text-sm"
        style={{ borderRadius: WOBBLY_MD }}
      >
        <PenLine className="w-4 h-4" />
        Confess
      </button>

      {/* Slide-in Drawer */}
      <AnimatePresence>
        {formOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setFormOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 w-full max-w-md bg-white border-l-2 border-border shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)] flex flex-col bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b-2 border-dashed border-border">
                <div className="flex items-center gap-2 font-display font-bold text-xl">
                  <Ghost className="w-5 h-5 text-primary" />
                  New Confession
                </div>
                <button
                  onClick={() => setFormOpen(false)}
                  className="p-1.5 rounded-full hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-5 pb-6 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Name <span className="font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-muted/10 border-2 border-border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{ borderRadius: WOBBLY_SM }}
                    placeholder="Khali chodo to Anonymous"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    disabled={postConfession.isPending}
                    maxLength={40}
                  />
                </div>

                {/* Mood */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">
                    Mood <span className="font-normal normal-case">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setSelectedMood(selectedMood === m.value ? null : m.value)}
                        className={`text-xs font-bold px-3 py-1.5 border-2 transition-all duration-150 ${
                          selectedMood === m.value
                            ? "border-foreground bg-foreground text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                            : "border-border bg-white text-muted-foreground hover:border-foreground/40"
                        }`}
                        style={{ borderRadius: WOBBLY_SM }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confession textarea */}
                <div className="flex-1 flex flex-col">
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Your Confession <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    ref={textareaRef}
                    className="flex-1 w-full bg-muted/10 border-2 border-border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-accent resize-none min-h-[180px]"
                    style={{ borderRadius: WOBBLY_SM }}
                    placeholder="Dil khol ke likh do... yahan sab anonymous hai 🤫"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={postConfession.isPending}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5 text-right">
                    {content.length}/1000
                  </p>
                </div>

                {/* Preview */}
                <div className="bg-muted/20 border-2 border-dashed border-border px-3 py-2 text-sm" style={{ borderRadius: WOBBLY_SM }}>
                  Posting as:{" "}
                  <span className="font-bold text-foreground">{customName.trim() || "Anonymous"}</span>
                  {selectedMood && (
                    <span className="ml-2 font-medium text-muted-foreground">
                      · {MOOD_OPTIONS.find(m => m.value === selectedMood)?.label}
                    </span>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={!content.trim() || postConfession.isPending}
                  className="w-full border-2 border-border shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-accent hover:bg-accent/90 text-white font-bold py-3 text-base"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  {postConfession.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Posting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Post Confession
                    </span>
                  )}
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </SiteShell>
  );
}

// ── Confession Card ──────────────────────────────────────────────────────────

function ConfessionCard({
  c,
  i,
  isLiked,
  isPending,
  onToggleLike,
}: {
  c: any;
  i: number;
  isLiked: boolean;
  isPending: boolean;
  onToggleLike: () => void;
}) {
  const { mood, content } = parseConfession(c.content ?? "");
  const colors = getMoodColors(mood ?? c.mood);
  const [burst, setBurst] = useState(false);

  const handleLike = () => {
    if (isPending) return;
    if (!isLiked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 500);
    }
    onToggleLike();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(i * 0.05, 0.3) }}
      className={`border-2 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 ${colors.bg} ${colors.border}`}
      style={{ borderRadius: WOBBLY_MD }}
    >
      {/* Top row: avatar + name + mood badge + time */}
      <div className="flex items-center gap-2 mb-3">
        <UserSymbol username={c.username || "Anonymous"} size="sm" />
        <span className="font-bold text-sm text-foreground">{c.username || "Anonymous"}</span>

        {(mood ?? c.mood) && (
          <span
            className={`text-xs font-bold px-2 py-0.5 border ${colors.accent} ${colors.border} ${colors.text}`}
            style={{ borderRadius: WOBBLY_SM }}
          >
            {MOOD_OPTIONS.find(m => m.value === (mood ?? c.mood))?.label ?? (mood ?? c.mood)}
          </span>
        )}

        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
          {timeAgo(c.created_at)}
        </span>
      </div>

      {/* Confession text */}
      <p className="text-base font-medium whitespace-pre-wrap leading-relaxed text-foreground">
        {content}
      </p>

      {/* Like button */}
      <div className="mt-4 pt-3 border-t-2 border-dashed border-border/30 flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={isPending}
          aria-label={isLiked ? "Unlike" : "Like"}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border-2 transition-all duration-200 select-none disabled:opacity-60 ${
            isLiked
              ? "bg-rose-50 border-rose-300 text-rose-500 shadow-[2px_2px_0px_0px_rgba(244,63,94,0.3)]"
              : "bg-white border-border text-muted-foreground hover:border-rose-300 hover:text-rose-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.12)]"
          }`}
          style={{ borderRadius: WOBBLY_SM }}
        >
          {/* Burst particles */}
          <AnimatePresence>
            {burst && (
              <>
                {[...Array(6)].map((_, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                    animate={{
                      opacity: 0,
                      scale: 1.5,
                      x: Math.cos((idx / 6) * Math.PI * 2) * 18,
                      y: Math.sin((idx / 6) * Math.PI * 2) * 18,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="absolute w-1.5 h-1.5 rounded-full bg-rose-400 pointer-events-none"
                    style={{ left: "50%", top: "50%" }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          <motion.span
            animate={burst ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Heart
              className={`w-4 h-4 transition-all duration-200 ${isLiked ? "fill-current" : ""}`}
            />
          </motion.span>
          <span className="tabular-nums min-w-[1.25rem] text-center">{c.likes ?? 0}</span>
        </button>
      </div>
    </motion.div>
  );
}
