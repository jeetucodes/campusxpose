import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminAddCollege, adminUpdateCollege, adminDeleteColleges, adminListCollegeRequests, adminApproveCollegeRequest, adminRejectCollegeRequest } from "@/lib/admin.functions";
import { COLLEGE_TYPES, INDIAN_STATES } from "@/lib/categories";
import { TypeMultiSelect } from "@/components/TypeMultiSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/colleges")({
  head: () => ({ meta: [{ title: "Admin · Colleges" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><CollegesAdmin /></AdminShell>,
});

type Col = any;
const PER_PAGE = 20;

function CollegesAdmin() {
  const { token } = useAdmin();
  const addFn = useServerFn(adminAddCollege);
  const updFn = useServerFn(adminUpdateCollege);
  const delFn = useServerFn(adminDeleteColleges);

  const q = useQuery({
    queryKey: ["admin-colleges"],
    queryFn: async () => (await supabase.from("colleges").select("*").order("name")).data ?? [],
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Col | null>(null);
  const [confirm, setConfirm] = useState<{ ids: string[]; names: string[] } | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const rows = useMemo(() => {
    let r: Col[] = q.data ?? [];
    if (search) r = r.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== "All") r = r.filter((c) => c.type === typeFilter);
    return r;
  }, [q.data, search, typeFilter]);
  const paged = rows.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doDelete = async () => {
    if (!confirm) return;
    if (confirm.ids.length === 1 && confirmText !== confirm.names[0]) { toast.error("Type the college name to confirm"); return; }
    try {
      await delFn({ data: { token: token!, ids: confirm.ids } });
      toast.success(`Deleted ${confirm.ids.length} college(s)`);
      setConfirm(null); setConfirmText(""); setSelected(new Set()); q.refetch();
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Colleges</h1>
        <Button className="rounded-full bg-success text-background hover:bg-success/90" onClick={() => { setEditing(null); setPanelOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Add College
        </Button>
      </div>

      <CollegeRequests token={token!} onApproved={() => q.refetch()} />

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or city" className="bg-surface pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 bg-surface"><SelectValue /></SelectTrigger>
          <SelectContent>{["All", ...COLLEGE_TYPES].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">
          {selected.size} selected
          <Button size="sm" variant="destructive" className="ml-auto rounded-full" onClick={() => setConfirm({ ids: [...selected], names: rows.filter((r) => selected.has(r.id)).map((r) => r.name) })}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete Selected
          </Button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-muted-foreground">
            <tr>
              <th className="p-3"><Checkbox checked={paged.length > 0 && paged.every((r) => selected.has(r.id))} onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); paged.forEach((r) => v ? n.add(r.id) : n.delete(r.id)); return n; })} /></th>
              <th className="p-3">Name</th><th className="p-3">City</th><th className="p-3">Type</th><th className="p-3">Rating</th><th className="p-3">Reviews</th><th className="p-3">Incidents</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3"><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} /></td>
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.city}</td>
                <td className="p-3">{((c as any).types?.length ? (c as any).types : [c.type]).join(", ")}</td>
                <td className="p-3">{(c.total_rating ?? 0).toFixed(1)}</td>
                <td className="p-3">{c.total_reviews}</td>
                <td className="p-3">{c.incident_count}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button className="rounded p-1 hover:bg-surface-2" onClick={() => { setEditing(c); setPanelOpen(true); }}><Pencil className="h-4 w-4" /></button>
                    <button className="rounded p-1 text-destructive hover:bg-destructive/10" onClick={() => setConfirm({ ids: [c.id], names: [c.name] })}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{rows.length} colleges</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <Button size="sm" variant="outline" disabled={(page + 1) * PER_PAGE >= rows.length} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <CollegePanel open={panelOpen} onOpenChange={setPanelOpen} editing={editing} onSave={async (vals) => {
        try {
          if (editing) await updFn({ data: { token: token!, id: editing.id, patch: vals } });
          else await addFn({ data: { token: token!, ...vals } as any });
          toast.success("Saved"); setPanelOpen(false); q.refetch();
        } catch { toast.error("Save failed"); }
      }} />

      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent className="border-border bg-surface">
          <DialogHeader><DialogTitle className="text-destructive">Delete {confirm?.ids.length} college(s)?</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground">
            This permanently deletes all incidents, posts, messages, evidence and ratings for: {confirm?.names.join(", ")}.
          </div>
          {confirm?.ids.length === 1 && (
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={`Type "${confirm.names[0]}" to confirm`} className="bg-surface-2" />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CollegePanel({ open, onOpenChange, editing, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Col | null; onSave: (v: any) => void }) {
  const [f, setF] = useState<any>({});
  const v = { name: "", city: "", state: "MP", type: "Engineering", established: "", description: "", latitude: "", longitude: "", ...(editing ?? {}), ...f };
  const types: string[] = v.types && v.types.length ? v.types : [v.type];
  const set = (k: string, val: any) => setF((p: any) => ({ ...p, [k]: val }));
  const save = () => {
    if (!v.name || !v.city) { toast.error("Name and city required"); return; }
    const selected = types.length ? types : [v.type];
    onSave({
      name: v.name, city: v.city, state: v.state, type: selected[0], types: selected,
      established: v.established ? Number(v.established) : null,
      description: v.description || null,
      latitude: v.latitude ? Number(v.latitude) : null,
      longitude: v.longitude ? Number(v.longitude) : null,
    });
    setF({});
  };
  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setF({}); }}>
      <SheetContent className="overflow-y-auto border-border bg-surface">
        <SheetHeader><SheetTitle>{editing ? "Edit College" : "Add College"}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <Field label="Name *"><Input value={v.name} onChange={(e) => set("name", e.target.value)} className="bg-surface-2" /></Field>
          <Field label="City *"><Input value={v.city} onChange={(e) => set("city", e.target.value)} className="bg-surface-2" /></Field>
          <Field label="State"><Select value={v.state} onValueChange={(x) => set("state", x)}><SelectTrigger className="bg-surface-2"><SelectValue /></SelectTrigger><SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Types (select one or more)"><TypeMultiSelect value={types} onChange={(next) => set("types", next)} /></Field>
          <Field label="Established"><Input type="number" value={v.established} onChange={(e) => set("established", e.target.value)} className="bg-surface-2" /></Field>
          <Field label="Description"><Textarea value={v.description} onChange={(e) => set("description", e.target.value)} className="bg-surface-2" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude"><Input value={v.latitude} onChange={(e) => set("latitude", e.target.value)} className="bg-surface-2" /></Field>
            <Field label="Longitude"><Input value={v.longitude} onChange={(e) => set("longitude", e.target.value)} className="bg-surface-2" /></Field>
          </div>
          <Button className="w-full rounded-full" onClick={save}>{editing ? "Update" : "Create"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-muted-foreground">{label}</label><div className="mt-1">{children}</div></div>;
}

function CollegeRequests({ token, onApproved }: { token: string; onApproved: () => void }) {
  const listFn = useServerFn(adminListCollegeRequests);
  const approveFn = useServerFn(adminApproveCollegeRequest);
  const rejectFn = useServerFn(adminRejectCollegeRequest);
  const [busy, setBusy] = useState<string | null>(null);

  const rq = useQuery({
    queryKey: ["admin-college-requests"],
    queryFn: async () => (await listFn({ data: { token } })).requests as any[],
  });

  const pending = (rq.data ?? []).filter((r) => r.status === "pending");
  if (rq.isLoading || pending.length === 0) return null;

  const act = async (id: string, approve: boolean) => {
    setBusy(id);
    try {
      if (approve) {
        await approveFn({ data: { token, id } });
        toast.success("College added");
        onApproved();
      } else {
        await rejectFn({ data: { token, id } });
        toast.success("Request rejected");
      }
      rq.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-warning/40 bg-warning/5 p-4">
      <h2 className="text-lg font-bold">Pending College Requests ({pending.length})</h2>
      <div className="mt-3 space-y-2">
        {pending.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <div className="min-w-48 flex-1">
              <div className="font-semibold">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.city}, {r.state} · {((r as any).types?.length ? (r as any).types : [r.type]).join(", ")}{r.established ? ` · est. ${r.established}` : ""}</div>
              {r.description && <div className="mt-1 text-xs text-muted-foreground">{r.description}</div>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-full bg-success text-background hover:bg-success/90" disabled={busy === r.id} onClick={() => act(r.id, true)}>Approve</Button>
              <Button size="sm" variant="destructive" className="rounded-full" disabled={busy === r.id} onClick={() => act(r.id, false)}>Reject</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

