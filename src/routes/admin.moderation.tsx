import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminDeletePosts, adminListEvidence, adminVerifyEvidence, adminDeleteEvidence } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/moderation")({
  head: () => ({ meta: [{ title: "Admin · Moderation" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><Moderation /></AdminShell>,
});

function Moderation() {
  const { token } = useAdmin();
  const del = useServerFn(adminDeletePosts);
  const listEv = useServerFn(adminListEvidence);
  const verify = useServerFn(adminVerifyEvidence);
  const delEv = useServerFn(adminDeleteEvidence);

  const flagged = useQuery({ queryKey: ["flagged-posts"], queryFn: async () => (await supabase.from("posts").select("*").eq("is_incident", true).order("created_at", { ascending: false }).limit(50)).data ?? [] });
  const evidence = useQuery({ queryKey: ["admin-evidence"], enabled: !!token, queryFn: () => listEv({ data: { token: token! } }) });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Moderation</h1>

      <section>
        <h2 className="mb-3 font-semibold">Flagged Content Queue</h2>
        <div className="space-y-2">
          {(flagged.data ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 text-sm">
              <span className="font-medium">{p.username}</span>
              <span className="flex-1 truncate text-muted-foreground">{p.content}</span>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await del({ data: { token: token!, ids: [p.id] } }); toast.success("Deleted"); flagged.refetch(); }}>Delete</Button>
            </div>
          ))}
          {(flagged.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing flagged.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Evidence Review</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(evidence.data ?? []).map((e: any) => (
            <div key={e.id} className="rounded-xl border border-border bg-surface p-2">
              {e.type === "image"
                ? <img src={e.file_url} alt="evidence" className="h-32 w-full rounded-lg object-cover" />
                : <div className="grid h-32 place-items-center rounded-lg bg-surface-2 text-3xl">📄</div>}
              <div className="mt-2 flex gap-1">
                <Button size="sm" variant="ghost" className="flex-1 text-success" onClick={async () => { await verify({ data: { token: token!, id: e.id, verified: !e.is_verified } }); toast.success("Updated"); evidence.refetch(); }}>{e.is_verified ? "Verified" : "Verify"}</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await delEv({ data: { token: token!, id: e.id } }); toast.success("Removed"); evidence.refetch(); }}>Remove</Button>
              </div>
            </div>
          ))}
          {(evidence.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No evidence uploaded.</p>}
        </div>
      </section>
    </div>
  );
}
