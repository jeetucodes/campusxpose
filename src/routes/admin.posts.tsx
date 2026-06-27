import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminDeletePosts } from "@/lib/admin.functions";
import { analyzePost } from "@/lib/ai.functions";
import { categoryLabel } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/posts")({
  head: () => ({ meta: [{ title: "Admin · Posts" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><PostsAdmin /></AdminShell>,
});

function PostsAdmin() {
  const { token } = useAdmin();
  const del = useServerFn(adminDeletePosts);
  const ai = useServerFn(analyzePost);
  const colleges = useQuery({ queryKey: ["col-map"], queryFn: async () => (await supabase.from("colleges").select("id, name")).data ?? [] });
  const q = useQuery({ queryKey: ["admin-posts"], queryFn: async () => (await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [] });
  const [unanalyzed, setUnanalyzed] = useState(false);
  const nameOf = (id: string) => colleges.data?.find((c) => c.id === id)?.name ?? "—";
  const rows = (q.data ?? []).filter((p) => !unanalyzed || !p.ai_analyzed);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <label className="flex items-center gap-2 text-sm"><Switch checked={unanalyzed} onCheckedChange={setUnanalyzed} /> Unanalyzed only</label>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-muted-foreground"><tr><th className="p-3">User</th><th className="p-3">College</th><th className="p-3">Category</th><th className="p-3">Content</th><th className="p-3">Votes</th><th className="p-3">Analyzed</th><th className="p-3">When</th><th className="p-3">Actions</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{p.username}</td>
                <td className="p-3">{nameOf(p.college_id)}</td>
                <td className="p-3">{categoryLabel(p.category ?? "general")}</td>
                <td className="p-3 max-w-xs truncate">{p.content}</td>
                <td className="p-3">{p.upvotes}/{p.downvotes}</td>
                <td className="p-3">{p.ai_analyzed ? "✅" : "⏳"}</td>
                <td className="p-3 text-xs text-muted-foreground">{timeAgo(p.created_at)}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={async () => { try { await ai({ data: { postId: p.id } }); toast.success("Analyzed"); q.refetch(); } catch { toast.error("AI failed"); } }}>AI</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await del({ data: { token: token!, ids: [p.id] } }); toast.success("Deleted"); q.refetch(); }}>Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
