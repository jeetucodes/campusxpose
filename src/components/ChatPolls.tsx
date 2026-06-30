import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Plus, Clock, X, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPoll, votePoll, deletePoll } from "@/lib/content.functions";
import { type Poll, type PollVote } from "@/hooks/usePolls";
import { cn } from "@/lib/utils";

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function PollItem({
  poll,
  votes,
  hashedId,
  own = false,
}: {
  poll: Poll;
  votes: PollVote[];
  hashedId: string | null;
  own?: boolean;
}) {
  const voteFn = useServerFn(votePoll);
  const deleteFn = useServerFn(deletePoll);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localChoice, setLocalChoice] = useState<number | null>(null);
  const owned = !!hashedId && poll.anonymous_user_hash === hashedId;

  const remove = async () => {
    if (!hashedId || deleting) return;
    if (!confirm("Delete this poll?")) return;
    setDeleting(true);
    try {
      const res = await deleteFn({ data: { pollId: poll.id, hashedId } });
      if (!res?.ok) toast.error("Could not delete poll");
      else toast.success("Poll deleted");
    } catch {
      toast.error("Could not delete poll");
    } finally {
      setDeleting(false);
    }
  };

  const mine = useMemo(
    () => votes.find((v) => v.anonymous_user_hash === hashedId)?.option_index ?? null,
    [votes, hashedId],
  );
  const chosen = localChoice ?? mine;
  const total = votes.length;

  const counts = useMemo(() => {
    const c = poll.options.map(() => 0);
    for (const v of votes) if (v.option_index < c.length) c[v.option_index]++;
    return c;
  }, [votes, poll.options]);

  const cast = async (idx: number) => {
    if (!hashedId || pending) return;
    setLocalChoice(idx);
    setPending(true);
    try {
      await voteFn({ data: { pollId: poll.id, optionIndex: idx, hashedId } });
    } catch {
      setLocalChoice(null);
      toast.error("Vote failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl border-2 p-3 shadow-ink-soft",
        own ? "border-accent/40 bg-accent/10" : "border-border bg-white",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
          <BarChart3 className="h-3 w-3" /> Poll
        </span>
        <span className="truncate font-semibold text-primary/80">{poll.username}</span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1">
          <Clock className="h-3 w-3" /> {timeLeft(poll.expires_at)}
        </span>
        {owned && (
          <button
            onClick={remove}
            disabled={deleting}
            aria-label="Delete poll"
            className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="mb-2 text-sm font-semibold">{poll.question}</div>
      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const pct = total ? Math.round((counts[i] / total) * 100) : 0;
          const selected = chosen === i;
          return (
            <button
              key={i}
              onClick={() => cast(i)}
              disabled={!hashedId || pending}
              className={cn(
                "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                selected ? "border-primary" : "border-border hover:border-primary/50",
              )}
            >
              <span
                className="absolute inset-y-0 left-0 bg-primary/15 transition-all"
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex items-center gap-2">
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                <span className="flex-1 break-words">{opt}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 text-[10px] text-muted-foreground">
        {total} {total === 1 ? "vote" : "votes"}
      </div>
    </div>
  );
}

/**
 * WhatsApp-style "create poll" button for the chat composer. Opens a dialog
 * and posts the poll, which then shows up inline in the chat stream.
 */
export function NewPollButton({
  scope,
  collegeId,
  hashedId,
  username,
  onCreated,
  className,
}: {
  scope: "global" | "college";
  collegeId?: string;
  hashedId: string | null;
  username: string | null;
  onCreated?: () => void;
  className?: string;
}) {
  const createFn = useServerFn(createPoll);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
  };

  const submit = async () => {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (q.length < 3) return toast.error("Add a poll question");
    if (opts.length < 2) return toast.error("Add at least 2 options");
    if (!hashedId || !username) return;
    setSubmitting(true);
    try {
      await createFn({
        data: { scope, collegeId, hashedId, username, question: q, options: opts },
      });
      toast.success("Poll posted (24h)");
      reset();
      setOpen(false);
      onCreated?.();
    } catch {
      toast.error("Could not create poll");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Create a poll"
          disabled={!hashedId || !username}
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-primary disabled:opacity-40",
            className,
          )}
        >
          <BarChart3 className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Create a poll
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            maxLength={200}
          />
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))
                  }
                  placeholder={`Option ${i + 1}`}
                  maxLength={80}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Remove option"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 4 && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              onClick={() => setOptions((prev) => [...prev, ""])}
            >
              <Plus className="h-3.5 w-3.5" /> Add option
            </Button>
          )}
          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Posting..." : "Post poll"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
