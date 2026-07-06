import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Ghost, Send, ExternalLink, CheckCircle2 } from "lucide-react";
import { addConfession } from "@/lib/confessions.functions";
import { toast } from "sonner";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WOBBLY = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "16px 5px 14px 5px / 5px 14px 5px 16px";

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

function ConfessFormPage() {
  const [content, setContent] = useState("");
  const [customName, setCustomName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const postConfession = useMutation({
    mutationFn: () =>
      addConfession({
        data: {
          content,
          username: customName.trim() || "Anonymous",
        },
      }),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to post: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    postConfession.mutate();
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-10">
      {/* Brand */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div
          className="flex items-center justify-center w-16 h-16 bg-white border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          style={{ borderRadius: WOBBLY }}
        >
          <Ghost className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">CampusXpose</h1>
        <p className="text-sm text-muted-foreground">Confession Box — 100% Anonymous</p>
      </div>

      <AnimatePresence mode="wait">
        {!submitted ? (
          /* ── FORM ── */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div
              className="bg-white border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6"
              style={{ borderRadius: WOBBLY }}
            >
              <h2 className="font-display text-xl font-bold mb-1">Apni baat kaho 🤫</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Koi judge nahi karega. Sab anonymous hai.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Naam <span className="font-normal normal-case">(optional)</span>
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

                {/* Confession */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Confession <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    autoFocus
                    className="w-full bg-muted/10 border-2 border-border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-accent resize-none min-h-[160px]"
                    style={{ borderRadius: WOBBLY_SM }}
                    placeholder="Dil khol ke likh do… yahan sab anonymous hai 🤫"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={postConfession.isPending}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {content.length}/1000
                  </p>
                </div>

                {/* Preview */}
                <div
                  className="bg-muted/20 border-2 border-dashed border-border px-3 py-2 text-sm"
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  Posting as:{" "}
                  <span className="font-bold text-foreground">
                    {customName.trim() || "Anonymous"}
                  </span>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!content.trim() || postConfession.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold py-3 text-base border-2 border-border shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
          /* ── SUCCESS ── */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="w-full max-w-md"
          >
            <div
              className="bg-white border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 text-center"
              style={{ borderRadius: WOBBLY }}
            >
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Posted! 🎉</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Teri confession submit ho gayi. Ab tu isse Confession Box mein dekh sakta hai!
              </p>

              {/* Link to confession feed */}
              <Link
                to="/confessions"
                className="inline-flex items-center gap-2 w-full justify-center bg-accent hover:bg-accent/90 text-white font-bold py-3 px-5 border-2 border-border shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all mb-3"
                style={{ borderRadius: WOBBLY }}
              >
                <ExternalLink className="w-4 h-4" />
                Confession Box Dekho
              </Link>

              {/* Confess again */}
              <button
                onClick={() => {
                  setContent("");
                  setCustomName("");
                  setSubmitted(false);
                }}
                className="w-full text-sm font-medium text-muted-foreground hover:text-foreground border-2 border-dashed border-border py-2.5 transition-colors"
                style={{ borderRadius: WOBBLY_SM }}
              >
                Ek aur confess karo? 👻
              </button>
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
