import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminListFeedback, adminReplyFeedback, adminDeleteFeedback } from "@/lib/admin.functions";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Trash2, CheckCircle2, MessageSquareHeart } from "lucide-react";

export const Route = createFileRoute("/admin/feedback")({
  head: () => ({ meta: [{ title: "Admin · Feedback" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><FeedbackAdmin /></AdminShell>,
});

interface FeedbackRow {
  id: string;
  name: string | null;
  message: string;
  user_username: string | null;
  user_hash: string | null;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

function FeedbackAdmin() {
  const { token } = useAdmin();
  const list = useServerFn(adminListFeedback);
  const reply = useServerFn(adminReplyFeedback);
  const del = useServerFn(adminDeleteFeedback);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-feedback"],
    enabled: !!token,
    queryFn: () => list({ data: { token: token! } }) as Promise<FeedbackRow[]>,
  });

  const rows = q.data ?? [];
  const newCount = rows.filter((r) => r.status !== "replied").length;

  const doReply = async (r: FeedbackRow) => {
    const text = (drafts[r.id] ?? "").trim();
    if (!text) {
      toast.error("Reply likho pehle.");
      return;
    }
    setSending(r.id);
    try {
      await reply({ data: { token: token!, id: r.id, reply: text } });
      toast.success(`DM bheja gaya @${r.user_username} ko (admin ke naam se)`);
      setDrafts((d) => ({ ...d, [r.id]: "" }));
      q.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "DM nahi gaya");
    } finally {
      setSending(null);
    }
  };

  const doDelete = async (id: string) => {
    if (!window.confirm("Is feedback ko delete karein?")) return;
    try {
      await del({ data: { token: token!, id } });
      toast.success("Feedback deleted");
      q.refetch();
    } catch {
      toast.error("Delete nahi hua");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessageSquareHeart className="h-6 w-6 text-accent" /> Feedback
        </h1>
        <div className="flex gap-2 text-sm">
          <div className="rounded-lg border border-border bg-surface px-3 py-1.5">
            <span className="font-semibold">{rows.length}</span> <span className="text-muted-foreground">total</span>
          </div>
          <div className="rounded-lg border border-border bg-surface px-3 py-1.5">
            <span className="font-semibold text-accent">{newCount}</span> <span className="text-muted-foreground">naye</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading feedback…</p>}
        {q.isError && <p className="text-sm text-destructive">Couldn't load feedback. <button className="underline" onClick={() => q.refetch()}>Retry</button></p>}
        {!q.isLoading && !q.isError && rows.length === 0 && <p className="text-sm text-muted-foreground">Abhi koi feedback nahi aaya.</p>}

        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{r.name || "Anonymous"}</span>
              {r.user_username && <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary">@{r.user_username}</span>}
              <span>· {timeAgo(r.created_at)}</span>
              {r.status === "replied" ? (
                <span className="ml-auto inline-flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 font-bold text-success">
                  <CheckCircle2 className="h-3 w-3" /> Replied
                </span>
              ) : (
                <span className="ml-auto rounded bg-accent/15 px-2 py-0.5 font-bold text-accent">NEW</span>
              )}
            </div>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{r.message}</p>

            {r.admin_reply && (
              <div className="mt-2 rounded-lg border border-dashed border-border bg-background p-2 text-sm">
                <span className="text-xs font-semibold text-muted-foreground">Tumhara reply:</span>
                <p className="whitespace-pre-wrap break-words">{r.admin_reply}</p>
              </div>
            )}

            {r.user_username ? (
              <div className="mt-3">
                <Textarea
                  value={drafts[r.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                  placeholder={`@${r.user_username} ko DM me reply likho (admin ke naam se)…`}
                  rows={2}
                  maxLength={1000}
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => doDelete(r.id)}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                  </Button>
                  <Button size="sm" disabled={sending === r.id} onClick={() => doReply(r)}>
                    {sending === r.id ? "Bhej rahe…" : <>DM bhejo <Send className="ml-1 h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">No identity attached — DM reply not possible.</span>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => doDelete(r.id)}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
