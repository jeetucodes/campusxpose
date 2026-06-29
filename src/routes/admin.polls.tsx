import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminListPolls, adminDeletePoll } from "@/lib/admin.functions";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Globe, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/polls")({
  head: () => ({ meta: [{ title: "Admin · Polls" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><PollsAdmin /></AdminShell>,
});

function PollsAdmin() {
  const { token } = useAdmin();
  const list = useServerFn(adminListPolls);
  const del = useServerFn(adminDeletePoll);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  const q = useQuery({
    queryKey: ["admin-polls", term],
    enabled: !!token,
    queryFn: () => list({ data: { token: token!, search: term || undefined } }),
  });

  const doDelete = async (id: string) => {
    if (!window.confirm("Delete this poll and all its votes?")) return;
    try {
      await del({ data: { token: token!, pollId: id } });
      toast.success("Poll deleted");
      q.refetch();
    } catch {
      toast.error("Could not delete poll");
    }
  };

  const rows = q.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Polls</h1>
        <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
          <span className="font-semibold">{rows.length}</span>{" "}
          <span className="text-muted-foreground">active</span>
        </div>
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); setTerm(search.trim()); }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search question or username…"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">Search</Button>
        {term && <Button type="button" variant="ghost" onClick={() => { setSearch(""); setTerm(""); }}>Clear</Button>}
      </form>

      <div className="mt-4 space-y-2">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading polls…</p>}
        {q.isError && <p className="text-sm text-destructive">Couldn't load polls. <button className="underline" onClick={() => q.refetch()}>Retry</button></p>}
        {!q.isLoading && !q.isError && rows.length === 0 && <p className="text-sm text-muted-foreground">No active polls.</p>}

        {rows.map((p: any) => (
          <div key={p.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-primary">
                  {p.scope === "global" ? <Globe className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                  {p.scope}
                </span>
                <span className="font-medium text-foreground">{p.username}</span>
                <span>· {timeAgo(p.created_at)}</span>
                <span>· {p.vote_count} votes</span>
              </div>
              <p className="mt-1 break-words text-sm font-semibold">{p.question}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(p.options ?? []).map((o: string, i: number) => (
                  <span key={i} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">{o}</span>
                ))}
              </div>
            </div>
            <Button size="sm" variant="ghost" className="shrink-0 text-destructive" onClick={() => doDelete(p.id)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
