import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminUpdateIncident, adminDeleteIncidents } from "@/lib/admin.functions";
import { statusColor, severityColor } from "@/lib/format";
import { categoryLabel } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/incidents")({
  head: () => ({ meta: [{ title: "Admin · Incidents" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><IncidentsAdmin /></AdminShell>,
});

function IncidentsAdmin() {
  const { token } = useAdmin();
  const upd = useServerFn(adminUpdateIncident);
  const del = useServerFn(adminDeleteIncidents);
  const colleges = useQuery({ queryKey: ["col-map"], queryFn: async () => (await supabase.from("colleges").select("id, name")).data ?? [] });
  const q = useQuery({ queryKey: ["admin-incidents"], queryFn: async () => (await supabase.from("incidents").select("*").order("first_seen", { ascending: false })).data ?? [] });
  const [status, setStatus] = useState("All");
  const nameOf = (id: string) => colleges.data?.find((c) => c.id === id)?.name ?? "—";
  const rows = (q.data ?? []).filter((i) => status === "All" || i.status === status);

  return (
    <div>
      <h1 className="text-2xl font-bold">Incidents</h1>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="mt-4 w-48 bg-surface"><SelectValue /></SelectTrigger>
        <SelectContent>{["All", "active", "investigating", "resolved", "dismissed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
      </Select>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-muted-foreground"><tr><th className="p-3">College</th><th className="p-3">Title</th><th className="p-3">Category</th><th className="p-3">Affected</th><th className="p-3">Severity</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="p-3">{nameOf(i.college_id)}</td>
                <td className="p-3 max-w-xs truncate">{i.title}</td>
                <td className="p-3">{categoryLabel(i.category)}</td>
                <td className="p-3">{i.affected_count}</td>
                <td className="p-3"><span className={cn("rounded-full border px-2 py-0.5 text-xs", severityColor(i.severity ?? 1))}>S{i.severity}</span></td>
                <td className="p-3">
                  <Select value={i.status ?? "active"} onValueChange={async (v) => { await upd({ data: { token: token!, id: i.id, patch: { status: v } } }); toast.success("Status updated"); q.refetch(); }}>
                    <SelectTrigger className={cn("h-7 w-36 border text-xs", statusColor(i.status ?? "active"))}><SelectValue /></SelectTrigger>
                    <SelectContent>{["active", "investigating", "resolved", "dismissed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-3"><Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await del({ data: { token: token!, ids: [i.id] } }); toast.success("Deleted"); q.refetch(); }}>Delete</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
