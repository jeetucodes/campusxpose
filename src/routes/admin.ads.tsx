import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Megaphone, Plus, Trash2, Pencil, Loader2,
  ImageIcon, VideoIcon, Upload, X,
} from "lucide-react";
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

const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY as string;

async function uploadToImgBB(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "ImgBB upload failed");
  return json.data.url as string;
}

function ImageUploader({ onUrl }: { onUrl: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToImgBB(file);
      onUrl(url);
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error((err as Error).message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary">
      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
      {uploading ? "Uploading…" : "Upload photo"}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
    </label>
  );
}

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
  show_games: boolean;
  active: boolean;
  sort_order: number;
};

const EMPTY: Ad = {
  title: "", kind: "banner", body: "", link_url: "", media_url: "", embed_url: "",
  cta_label: "", show_home: false, show_global: false, show_college: false, show_games: false,
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
    try {
      await del({ data: { token: token!, id } });
      toast.success("Deleted");
      reload();
    } catch (e) { toast.error((e as Error)?.message ?? "Failed"); }
  };

  const handleToggleActive = async (ad: Ad) => {
    const updated = { ...ad, active: !ad.active };
    // Optimistically update local state
    setAds((prev) => prev.map((a) => (a.id === ad.id ? updated : a)));
    try {
      await save({ data: { token: token!, ...updated } });
      toast.success(updated.active ? "Ad turned ON" : "Ad turned OFF");
    } catch (e) {
      // Revert on failure
      setAds((prev) => prev.map((a) => (a.id === ad.id ? ad : a)));
      toast.error((e as Error)?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Megaphone className="h-5 w-5 text-primary sm:h-6 sm:w-6" /> Ads
        </h1>
        <Button className="rounded-full" size="sm" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">New Ad</span>
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
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">No ads yet. Click "New Ad" to create one.</p>
      ) : (
        <div className="grid gap-3">
          {ads.map((ad) => (
            <div key={ad.id} className="rounded-xl border border-border bg-surface p-3">
              {/* Top row: thumbnail + info */}
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                {ad.media_url ? (
                  <img src={ad.media_url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                ) : ad.kind === "video" ? (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                    <VideoIcon className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold truncate max-w-[140px] sm:max-w-none">{ad.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                      ad.kind === "video" ? "bg-blue-500/15 text-blue-600" : "bg-green-500/15 text-green-600"
                    }`}>{ad.kind === "video" ? "Video" : "Banner"}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    {ad.show_home && <span className="rounded bg-surface-2 px-1.5 py-0.5">Home</span>}
                    {ad.show_global && <span className="rounded bg-surface-2 px-1.5 py-0.5">Global</span>}
                    {ad.show_college && <span className="rounded bg-surface-2 px-1.5 py-0.5">College</span>}
                    {ad.show_games && <span className="rounded bg-[#bbf7d0] text-black px-1.5 py-0.5 font-bold">Games 🕹️</span>}
                  </div>
                </div>
              </div>

              {/* Bottom row: toggle + actions */}
              <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
                {/* Active toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ad.active}
                    onCheckedChange={() => handleToggleActive(ad)}
                    className="scale-90"
                  />
                  <span className={`text-xs font-medium ${ad.active ? "text-primary" : "text-muted-foreground"}`}>
                    {ad.active ? "Active" : "Inactive"}
                  </span>
                </div>
                {/* Edit + Delete */}
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(ad)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(ad.id!)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="flex h-[100dvh] w-full flex-col overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 sm:px-6 sm:pt-6">
            <DialogTitle>{editing?.id ? "Edit Ad" : "New Ad"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {editing && (
              <div className="space-y-4">

              {/* Title */}
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Promo headline" />
              </div>

              {/* Type toggle — pill style */}
              <div className="space-y-1">
                <Label>Ad Type</Label>
                <div className="mt-1 grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-surface-2 p-1">
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, kind: "banner" })}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                      editing.kind === "banner" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ImageIcon className="h-4 w-4" /> Image Banner
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, kind: "video" })}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                      editing.kind === "video" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <VideoIcon className="h-4 w-4" /> Video
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="Short description shown in the ad" />
              </div>

              {/* BANNER fields */}
              {editing.kind === "banner" && (
                <div className="space-y-3 rounded-xl border border-border p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Banner Image</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editing.media_url ?? ""}
                        onChange={(e) => setEditing({ ...editing, media_url: e.target.value })}
                        placeholder="Paste image URL or upload below"
                        className="flex-1"
                      />
                      {editing.media_url?.trim() && (
                        <button type="button" onClick={() => setEditing({ ...editing, media_url: "" })} className="shrink-0 text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <ImageUploader onUrl={(url) => setEditing({ ...editing, media_url: url })} />
                    {editing.media_url?.trim() && (
                      <div className="overflow-hidden rounded-lg border border-border">
                        <img src={editing.media_url} alt="Banner preview" className="max-h-40 w-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Click-through URL</Label>
                    <Input value={editing.link_url ?? ""} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} placeholder="https://…" />
                  </div>
                </div>
              )}

              {/* VIDEO fields */}
              {editing.kind === "video" && (
                <div className="space-y-3 rounded-xl border border-border p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Video</div>
                  <div className="space-y-1">
                    <Label className="text-xs">Embed URL (YouTube /embed/ etc.)</Label>
                    <Input value={editing.embed_url ?? ""} onChange={(e) => setEditing({ ...editing, embed_url: e.target.value })} placeholder="https://www.youtube.com/embed/…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cover / Thumbnail Image</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={editing.media_url ?? ""}
                        onChange={(e) => setEditing({ ...editing, media_url: e.target.value })}
                        placeholder="Paste image URL or upload below"
                        className="flex-1"
                      />
                      {editing.media_url?.trim() && (
                        <button type="button" onClick={() => setEditing({ ...editing, media_url: "" })} className="shrink-0 text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <ImageUploader onUrl={(url) => setEditing({ ...editing, media_url: url })} />
                    {editing.media_url?.trim() && (
                      <div className="overflow-hidden rounded-lg border border-border">
                        <img src={editing.media_url} alt="Cover preview" className="max-h-40 w-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Button link (optional)</Label>
                    <Input value={editing.link_url ?? ""} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} placeholder="https://…" />
                  </div>
                </div>
              )}

              {/* CTA label */}
              <div className="space-y-1">
                <Label>Button label</Label>
                <Input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} placeholder="Learn more" />
              </div>

              {/* Placements */}
              <div className="space-y-2 rounded-xl border border-border p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Show on</div>
                {([["show_home", "Home page"], ["show_global", "Global chat"], ["show_college", "College chats"], ["show_games", "Games & Hint Rewards 🕹️"]] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm">{label}</span>
                    <Switch checked={editing[key]} onCheckedChange={(v) => setEditing({ ...editing, [key]: v })} />
                  </div>
                ))}
              </div>

              {/* Active */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive ads never show.</p>
                </div>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>

              {/* Sort order */}
              <div className="space-y-1">
                <Label>Sort order</Label>
                <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} />
              </div>
            </div>
            )}
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-4 py-3 sm:px-6">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="flex-1 sm:flex-none" onClick={handleSave} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
