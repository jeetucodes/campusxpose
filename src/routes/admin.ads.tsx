import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, Pencil, Loader2, ExternalLink } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import {
  adminListAds,
  adminSaveAd,
  adminDeleteAd,
  adminSetAdsEnabled,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/ads")({
  head: () => ({ meta: [{ title: "Admin · Ads" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><AdsAdmin /></AdminShell>,
});

type Ad = {
  id?: string;
  title: string;
  kind: "banner" | "video";
  body: string | null;
  link_url: string | null;
  media_url: string | null;
  embed_url: string | null;
  cta_label: string | null;
  show_home: boolean;
  show_global: boolean;
  show_college: boolean;
  active: boolean;
  sort_order: number;
};

const EMPTY: Ad = {
  title: "", kind: "banner", body: "", link_url: "", media_url: "", embed_url: "",
  cta_label: "", show_home: false, show_global: false, show_college: false,
  active: true, sort_order: 0,
};

function AdsAdmin() {
  const { token } = useAdmin();
  const list = useServerFn(adminListAds);
  const save = useServerFn(adminSaveAd);
  const del = useServerFn(adminDeleteAd);
  const setEnabled = useServerFn(adminSetAdsEnabled);

  const [ads, setAds] = useState<Ad[]>([]);
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await list({ data: { token } });
      setAds(r.ads as unknown as Ad[]);
      setEnabledState(r.enabled);
    } catch (e) { toast.error((e as Error)?.message ?? "Failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [token]);

  const toggleMaster = async (val: boolean) => {
    setEnabledState(val);
    try { await setEnabled({ data: { token: token!, enabled: val } }); toast.success(val ? "Ads turned ON site-wide" : "Ads turned OFF"); }
    catch (e) { setEnabledState(!val); toast.error((e as Error)?.message ?? "Failed"); }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    try {
      await save({ data: { token: token!, ...editing } });
      toast.success("Saved");
      setEditing(null);
      reload();
    } catch (e) { toast.error((e as Error)?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ad?")) return;
    try { await del({ data: { token: token!, id } }); toast.success("Deleted"); reload(); }
    catch (e) { toast.error((e as Error)?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Megaphone className="h-6 w-6 text-primary" /> Ads
        </h1>
        <Button className="rounded-full" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-1 h-4 w-4" /> New Ad
        </Button>
      </div>

      {/* Master switch */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="min-w-0">
          <div className="font-semibold">Show ads on the website</div>
          <p className="text-sm text-muted-foreground">
            Master switch. When off, no ad appears anywhere — home, global chat, or college chats.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggleMaster} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : ads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">No ads yet. Create one.</p>
      ) : (
        <div className="grid gap-3">
          {ads.map((ad) => (
            <div key={ad.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-start">
        {ad.media_url ? (
                <img src={ad.media_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground"><Megaphone className="h-5 w-5" /></div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{ad.title}</span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase">{ad.kind}</span>
                  {ad.active ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">Active</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Inactive</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                  {ad.show_home && <span className="rounded bg-surface-2 px-1.5 py-0.5">Home</span>}
                  {ad.show_global && <span className="rounded bg-surface-2 px-1.5 py-0.5">Global</span>}
                  {ad.show_college && <span className="rounded bg-surface-2 px-1.5 py-0.5">College</span>}
                </div>
                {ad.link_url && (
                  <a href={ad.link_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary">
                    {ad.link_url} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
              </div>
              <div className="flex shrink-0 gap-1 sm:self-start">
                <Button size="icon" variant="ghost" className="h-10 w-10" onClick={() => setEditing(ad)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive" onClick={() => handleDelete(ad.id!)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Ad" : "New Ad"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Promo headline" />
              </div>
              <div>
                <Label>Type</Label>
                <div className="mt-1 flex gap-2">
                  {(["banner", "video"] as const).map((k) => (
                    <Button key={k} type="button" size="sm" variant={editing.kind === k ? "default" : "outline"} className="rounded-full capitalize" onClick={() => setEditing({ ...editing, kind: k })}>{k}</Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="Shown when the ad is opened" />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={editing.media_url ?? ""} onChange={(e) => setEditing({ ...editing, media_url: e.target.value })} placeholder="https://...jpg" />
              </div>
              <div>
                <Label>Video / Embed URL (iframe)</Label>
                <Input value={editing.embed_url ?? ""} onChange={(e) => setEditing({ ...editing, embed_url: e.target.value })} placeholder="https://www.youtube.com/embed/..." />
                <p className="mt-1 text-xs text-muted-foreground">Use an embeddable link (e.g. YouTube /embed/ URL).</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Button link</Label>
                  <Input value={editing.link_url ?? ""} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>Button label</Label>
                  <Input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} placeholder="Learn more" />
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="text-sm font-medium">Where to show</div>
                {([["show_home", "Home page"], ["show_global", "Global chat"], ["show_college", "College chats"]] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm">{label}</span>
                    <Switch checked={editing[key]} onCheckedChange={(v) => setEditing({ ...editing, [key]: v })} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive ads never show.</p>
                </div>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
