import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminListComments, adminDeleteComment } from "@/lib/admin.functions";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CornerDownRight, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/comments")({
  head: () => ({ meta: [{ title: "Admin · Comments" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><CommentsAdmin /></AdminShell>,
});

function CommentsAdmin() {
  const { token } = useAdmin();
  const list = useServerFn(adminListComments);
  const del = useServerFn(adminDeleteComment);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  const q = useQuery({
    queryKey: ["admin-comments", term],
    enabled: !!token,
    queryFn: () => list({ data: { token: token!, search: term || undefined } }),
  });

  const doDelete = async (id: string) => {
    if (!window.confirm("Delete this comment and all its replies?")) return;
    try {
      await del({ data: { token: token!, commentId: id } });
      toast.success("Comment deleted");
      q.refetch();
    } catch {
      toast.error("Could not delete comment");
    }
  };

  const rows = q.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Comments</h1>
        <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
          <span className="font-semibold">{rows.length}</span> <span className="text-muted-foreground">shown</span>
        </div>
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); setTerm(search.trim()); }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search comment text or username…"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">Search</Button>
        {term && <Button type="button" variant="ghost" onClick={() => { setSearch(""); setTerm(""); }}>Clear</Button>}
      </form>

      <div className="mt-4 space-y-2">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading comments…</p>}
        {q.isError && <p className="text-sm text-destructive">Couldn't load comments. <button className="underline" onClick={() => q.refetch()}>Retry</button></p>}
        {!q.isLoading && !q.isError && rows.length === 0 && <p className="text-sm text-muted-foreground">No comments found.</p>}

        {rows.map((c) => (
          <div key={c.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.username}</span>
                {c.parent_id && <span className="inline-flex items-center gap-1 text-primary"><CornerDownRight className="h-3 w-3" /> reply</span>}
                <span>· {timeAgo(c.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.content}</p>
            </div>
            <Button size="sm" variant="ghost" className="shrink-0 text-destructive" onClick={() => doDelete(c.id)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
