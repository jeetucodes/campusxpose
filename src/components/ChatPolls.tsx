import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Plus, Clock, X, Check, ChevronDown, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { usePolls, type Poll, type PollVote } from "@/hooks/usePolls";
import { cn } from "@/lib/utils";

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function PollItem({
  poll,
  votes,
  hashedId,
}: {
  poll: Poll;
  votes: PollVote[];
  hashedId: string | null;
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
    <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        <span className="font-semibold text-primary/80">{poll.username}</span>
        <span className="ml-auto inline-flex items-center gap-1">
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

function useSeenPolls(scope: "global" | "college", collegeId?: string) {
  const key = useMemo(
    () => `cx-seen-polls-${scope}-${collegeId ?? "none"}`,
    [scope, collegeId]
  );

  const getSeenIds = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  };

  const markSeen = (ids: string[]) => {
    if (!ids.length) return;
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {}
  };

  return { getSeenIds, markSeen };
}

export function ChatPolls({
  scope,
  collegeId,
  hashedId,
  username,
}: {
  scope: "global" | "college";
  collegeId?: string;
  hashedId: string | null;
  username: string | null;
}) {
  const { polls, votes } = usePolls(scope, collegeId);
  const createFn = useServerFn(createPoll);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  const { getSeenIds, markSeen } = useSeenPolls(scope, collegeId);
  const [seenIds, setSeenIds] = useState<string[]>(() => getSeenIds());

  const latestPoll = polls[0];
  const hasNew = useMemo(() => {
    if (!latestPoll) return false;
    return !seenIds.includes(latestPoll.id);
  }, [latestPoll, seenIds]);

  useEffect(() => {
    if (!expanded) return;
    const currentIds = polls.map((p) => p.id);
    setSeenIds(currentIds);
    markSeen(currentIds);
  }, [expanded, polls, markSeen]);

  useEffect(() => {
    setCurrentIndex((i) => (i >= polls.length ? Math.max(0, polls.length - 1) : i));
  }, [polls.length]);

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
    } catch {
      toast.error("Could not create poll");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-b border-border bg-surface-2/40">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left sm:px-4"
      >
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Polls</span>
        {!expanded && latestPoll && (
          <span className="max-w-[180px] truncate text-xs text-muted-foreground sm:max-w-[280px]">
            {latestPoll.question}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {hasNew && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {polls.length > 0 ? `${polls.length} active` : ""}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </span>
      </button>
      {expanded && (
        <>
          <div className="flex items-center gap-2 px-3 pb-2 sm:px-4">
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) reset();
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 gap-1 rounded-full"
                  disabled={!hashedId || !username}
                >
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a poll</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Poll question..."
                    maxLength={200}
                  />
                  <div className="space-y-2">
                    {options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={opt}
                          onChange={(e) =>
                            setOptions((prev) =>
                              prev.map((o, idx) =>
                                idx === i ? e.target.value : o
                              )
                            )
                          }
                          placeholder={`Option ${i + 1}`}
                          maxLength={80}
                        />
                        {options.length > 2 && (
                          <button
                            onClick={() =>
                              setOptions((prev) =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
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
                  <Button
                    className="w-full"
                    onClick={submit}
                    disabled={submitting}
                  >
                    {submitting ? "Posting..." : "Post poll"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {polls.length > 0 && (
            <div className="px-3 pb-3 sm:px-4">
              <div className="mb-2 flex items-center justify-between">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Previous poll"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {currentIndex + 1}/{polls.length}
                </span>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(polls.length - 1, i + 1))}
                  disabled={currentIndex === polls.length - 1}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Next poll"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                  {polls.map((p) => (
                    <div key={p.id} className="w-full shrink-0">
                      <PollItem
                        poll={p}
                        votes={votes.filter((v) => v.poll_id === p.id)}
                        hashedId={hashedId}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex justify-center gap-1.5">
                {polls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Go to poll ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
