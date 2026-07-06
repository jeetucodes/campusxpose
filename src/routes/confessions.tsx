import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ghost, Send, X, PenLine, Heart } from "lucide-react";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getConfessions, addConfession, toggleLikeConfession } from "@/lib/confessions.functions";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserSymbol } from "@/components/UserSymbol";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "16px 5px 14px 5px / 5px 14px 5px 16px";

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
  const [likedItems, setLikedItems] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("liked_confessions");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: confessions = [], isLoading } = useQuery({
    queryKey: ["confessions"],
    queryFn: () => getConfessions(),
  });

  // Auto-focus textarea when drawer opens
  useEffect(() => {
    if (formOpen) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [formOpen]);

  const postConfession = useMutation({
    mutationFn: () =>
      addConfession({
        data: {
          content,
          username: customName.trim() || "Anonymous",
        },
      }),
    onSuccess: (newConfession) => {
      setContent("");
      setCustomName("");
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
      toggleLikeConfession({ data: { id, action } }),
    onMutate: async ({ id, action }) => {
      setLikedItems((prev) => {
        const next = new Set(prev);
        if (action === "like") next.add(id);
        else next.delete(id);
        try { localStorage.setItem("liked_confessions", JSON.stringify(Array.from(next))); } catch {}
        return next;
      });
      queryClient.setQueryData(["confessions"], (old: any) => {
        if (!old) return old;
        return old.map((c: any) =>
          c.id === id
            ? { ...c, likes: Math.max(0, (c.likes || 0) + (action === "like" ? 1 : -1)) }
            : c
        );
      });
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

          {/* Confess Button — desktop top-right */}
          <Button
            onClick={() => setFormOpen(true)}
            className="hidden md:flex items-center gap-2 border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-accent hover:bg-accent/90 text-white font-bold px-5 py-2.5 shrink-0"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <PenLine className="w-4 h-4" />
            Confess
          </Button>
        </div>

        {/* Confession Feed */}
        <div className="space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-white border-2 border-border animate-pulse"
                  style={{ borderRadius: WOBBLY_MD }}
                />
              ))}
            </div>
          ) : confessions.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground border-2 border-dashed border-border bg-white"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <Ghost className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">Koi confession abhi tak nahi...</p>
              <p className="text-sm mt-1">Be the first ghost here 👻</p>
            </div>
          ) : (
            confessions.map((c: any, i: number) => {
              const isLiked = likedItems.has(c.id);
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % 6) * 0.07 }}
                  className="bg-white border-2 border-border p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  style={{ borderRadius: WOBBLY_MD }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <UserSymbol username={c.username || "Anonymous"} size="sm" />
                    <span className="font-bold text-sm text-foreground">{c.username || "Anonymous"}</span>
                    <span className="text-xs text-muted-foreground ml-auto bg-accent/10 px-2 py-1 border-border border rounded-full">
                      {new Date(c.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-base font-medium whitespace-pre-wrap leading-relaxed">{c.content}</p>

                  {/* Like button */}
                  <div className="mt-4 pt-3 border-t-2 border-dashed border-border/30 flex items-center gap-2">
                    <button
                      onClick={() =>
                        toggleLike.mutate({ id: c.id, action: isLiked ? "unlike" : "like" })
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border-2 transition-all duration-150 ${
                        isLiked
                          ? "bg-rose-50 border-rose-300 text-rose-500 shadow-[2px_2px_0px_0px_rgba(244,63,94,0.4)]"
                          : "bg-white border-border text-muted-foreground hover:border-rose-300 hover:text-rose-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]"
                      }`}
                      style={{ borderRadius: WOBBLY_SM }}
                    >
                      <Heart
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isLiked ? "fill-current scale-110" : ""
                        }`}
                      />
                      <span>{c.likes || 0}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })
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

      {/* Slide-in Drawer / Modal */}
      <AnimatePresence>
        {formOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setFormOpen(false)}
            />

            {/* Drawer panel */}
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
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Name <span className="font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-muted/10 border-2 border-border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{ borderRadius: WOBBLY_SM }}
                    placeholder=""
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    disabled={postConfession.isPending}
                    maxLength={40}
                  />
                </div>

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
