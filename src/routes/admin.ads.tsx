import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ImageIcon,
  VideoIcon,
  Upload,
  X,
  Clock,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import {
  adminListAds,
  adminSaveAd,
  adminDeleteAd,
  adminSetAdsEnabled,
  adminSetGlobalAdTimer,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
      toast.success("Image uploaded successfully!");
    } catch (err) {
      toast.error((err as Error).message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary">
      {uploading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Upload className="h-3.5 w-3.5" />
      )}
      {uploading ? "Uploading…" : "Upload photo"}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />
    </label>
  );
}

export const Route = createFileRoute("/admin/ads")({
  head: () => ({
    meta: [{ title: "Admin · Ads Management" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <AdminShell>
      <AdsAdmin />
    </AdminShell>
  ),
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
  timer_seconds?: number | null;
};

const EMPTY: Ad = {
  title: "",
  kind: "banner",
  body: "",
  link_url: "",
  media_url: "",
  embed_url: "",
  cta_label: "",
  show_home: false,
  show_global: false,
  show_college: false,
  show_games: false,
  active: true,
  sort_order: 0,
  timer_seconds: null,
};

function AdsAdmin() {
  const { token } = useAdmin();
  const list = useServerFn(adminListAds);
  const save = useServerFn(adminSaveAd);
  const del = useServerFn(adminDeleteAd);
  const setEnabled = useServerFn(adminSetAdsEnabled);
  const setGlobalTimer = useServerFn(adminSetGlobalAdTimer);

  const [ads, setAds] = useState<Ad[]>([]);
  const [enabled, setEnabledState] = useState(false);
  const [globalTimerSec, setGlobalTimerSec] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingTimer, setSavingTimer] = useState(false);

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await list({ data: { token } });
      setAds(r.ads as unknown as Ad[]);
      setEnabledState(r.enabled);
      setGlobalTimerSec(r.globalTimerSeconds || 3);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to load ads data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload(); /* eslint-disable-next-line */
  }, [token]);

  const toggleMaster = async (val: boolean) => {
    setEnabledState(val);
    try {
      await setEnabled({ data: { token: token!, enabled: val } });
      toast.success(val ? "Ads turned ON site-wide" : "Ads turned OFF site-wide");
    } catch (e) {
      setEnabledState(!val);
      toast.error((e as Error)?.message ?? "Failed to update master switch");
    }
  };

  const handleUpdateGlobalTimer = async (seconds: number) => {
    if (seconds < 1 || seconds > 300) {
      toast.error("Timer must be between 1 and 300 seconds");
      return;
    }
    setGlobalTimerSec(seconds);
    setSavingTimer(true);
    try {
      await setGlobalTimer({ data: { token: token!, timerSeconds: seconds } });
      toast.success(`Global Ad Timer set to ${seconds}s`);
      reload();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to update ad timer");
    } finally {
      setSavingTimer(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      await save({
        data: {
          token: token!,
          ...editing,
          timer_seconds: editing.timer_seconds ? Number(editing.timer_seconds) : null,
        },
      });
      toast.success("Ad saved successfully!");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to save ad");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;
    try {
      await del({ data: { token: token!, id } });
      toast.success("Ad deleted");
      reload();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to delete ad");
    }
  };

  const handleToggleActive = async (ad: Ad) => {
    const updated = { ...ad, active: !ad.active };
    setAds((prev) => prev.map((a) => (a.id === ad.id ? updated : a)));
    try {
      await save({ data: { token: token!, ...updated } });
      toast.success(updated.active ? "Ad turned ON" : "Ad turned OFF");
    } catch (e) {
      setAds((prev) => prev.map((a) => (a.id === ad.id ? ad : a)));
      toast.error((e as Error)?.message ?? "Failed to update ad state");
    }
  };

  const activeCount = ads.filter((a) => a.active).length;
  const gamesCount = ads.filter((a) => a.active && a.show_games).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-surface to-primary/5 p-5 rounded-2xl border border-primary/20 shadow-sm">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight">
            <Megaphone className="h-6 w-6 text-primary animate-pulse" /> Ads & Monetization Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage site-wide promotions, in-game reward ads, video partners, and ad display timers.
          </p>
        </div>
        <Button
          onClick={() => setEditing({ ...EMPTY })}
          className="rounded-xl font-bold shadow-md hover:scale-105 transition-transform shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Ad Campaign
        </Button>
      </div>

      {/* Quick Analytics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-border p-4 rounded-xl space-y-1 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Ads
          </div>
          <div className="text-2xl font-black">{ads.length}</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl space-y-1 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Ads
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl space-y-1 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <span>🕹️</span> Games Ads
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {gamesCount}
          </div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-xl space-y-1 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-500" /> Default Timer
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {globalTimerSec}s
          </div>
        </div>
      </div>

      {/* Global Control Cards: Master Switch & Timer Setting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Master Switch Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="font-bold text-base">Site-Wide Ads Master Switch</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                When turned OFF, no ads will display anywhere across home, chats, or games.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={toggleMaster} className="scale-110" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Current Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                enabled
                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                  : "bg-destructive/15 text-destructive border border-destructive/30"
              }`}
            >
              {enabled ? "🟢 Ads LIVE Site-Wide" : "🔴 Ads Disabled"}
            </span>
          </div>
        </div>

        {/* Global Ad Timer Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="font-bold text-base">Default Ad Timer (Seconds)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              How many seconds users must watch reward ads before the close button & reward claim
              unlock.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[3, 5, 10, 15, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleUpdateGlobalTimer(sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    globalTimerSec === sec
                      ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                      : "bg-surface-2 hover:bg-surface border-border text-foreground"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* Custom timer input */}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Input
                  type="number"
                  min={1}
                  max={300}
                  value={globalTimerSec}
                  onChange={(e) => setGlobalTimerSec(Number(e.target.value) || 3)}
                  className="pr-10 font-bold"
                  placeholder="Set seconds"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  sec
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => handleUpdateGlobalTimer(globalTimerSec)}
                disabled={savingTimer}
                className="font-bold"
              >
                {savingTimer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Timer"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Ads List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Active & Scheduled Campaigns
          </h2>
          <span className="text-xs text-muted-foreground font-medium">{ads.length} total ads</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 bg-surface rounded-2xl border border-border">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : ads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center space-y-3">
            <Megaphone className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground font-medium">
              No ads created yet. Click "New Ad Campaign" to create your first ad.
            </p>
            <Button
              onClick={() => setEditing({ ...EMPTY })}
              size="sm"
              className="rounded-xl font-bold"
            >
              <Plus className="h-4 w-4 mr-1" /> New Ad
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className={`rounded-2xl border bg-surface p-4 transition-all hover:shadow-md ${
                  ad.active ? "border-border" : "border-border/60 opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Media + Details */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Media Thumbnail */}
                    <div className="relative shrink-0">
                      {ad.media_url ? (
                        <img
                          src={ad.media_url}
                          alt=""
                          className="h-14 w-14 rounded-xl object-cover border border-border shadow-sm bg-muted"
                        />
                      ) : ad.kind === "video" ? (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
                          <VideoIcon className="h-6 w-6" />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-2 border border-border text-muted-foreground">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}

                      {/* Video / Banner badge */}
                      <span
                        className={`absolute -bottom-1 -right-1 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase shadow-xs ${
                          ad.kind === "video"
                            ? "bg-blue-600 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {ad.kind === "video" ? "Video" : "Banner"}
                      </span>
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground truncate">
                          {ad.title}
                        </span>
                        {/* Timer Badge */}
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Clock className="h-3 w-3" />
                          {ad.timer_seconds
                            ? `${ad.timer_seconds}s timer`
                            : `${globalTimerSec}s (default)`}
                        </span>
                      </div>

                      {ad.body && (
                        <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                          {ad.body}
                        </p>
                      )}

                      {/* Placement badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase mr-1">
                          Placements:
                        </span>
                        {ad.show_home && (
                          <span className="rounded-md bg-surface-2 border border-border px-2 py-0.5 text-[10px] font-medium">
                            Home Page
                          </span>
                        )}
                        {ad.show_global && (
                          <span className="rounded-md bg-surface-2 border border-border px-2 py-0.5 text-[10px] font-medium">
                            Global Chat
                          </span>
                        )}
                        {ad.show_college && (
                          <span className="rounded-md bg-surface-2 border border-border px-2 py-0.5 text-[10px] font-medium">
                            College Chats
                          </span>
                        )}
                        {ad.show_games && (
                          <span className="rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                            🕹️ Games & Rewards
                          </span>
                        )}
                        {ad.link_url && (
                          <a
                            href={ad.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline ml-1"
                          >
                            Link <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Active Toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                    <div className="flex items-center gap-2">
                      <Switch checked={ad.active} onCheckedChange={() => handleToggleActive(ad)} />
                      <span
                        className={`text-xs font-bold ${ad.active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                      >
                        {ad.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => setEditing(ad)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(ad.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / New Ad Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="flex h-[100dvh] w-full flex-col overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:max-w-xl sm:rounded-3xl">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Megaphone className="h-5 w-5 text-primary" />
              {editing?.id ? "Edit Ad Campaign" : "New Ad Campaign"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-4">
            {editing && (
              <>
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="font-bold">Ad Headline / Title *</Label>
                  <Input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="e.g., Campus Festival Promo 🚀"
                    className="font-medium"
                  />
                </div>

                {/* Type Selection */}
                <div className="space-y-1.5">
                  <Label className="font-bold">Ad Format</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface-2 p-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, kind: "banner" })}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
                        editing.kind === "banner"
                          ? "bg-background shadow-sm text-primary border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ImageIcon className="h-4 w-4" /> Image Banner
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, kind: "video" })}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
                        editing.kind === "video"
                          ? "bg-background shadow-sm text-primary border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <VideoIcon className="h-4 w-4" /> Video Ad
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="font-bold">Ad Body / Description</Label>
                  <Textarea
                    rows={2}
                    value={editing.body ?? ""}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                    placeholder="Short engaging description for the audience..."
                    className="text-sm leading-relaxed"
                  />
                </div>

                {/* Custom Timer Input for this Ad */}
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                      <Clock className="h-4 w-4" /> Ad Display Timer (Seconds)
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Default: {globalTimerSec}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={300}
                      value={editing.timer_seconds ?? ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          timer_seconds: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder={`Custom seconds (Leave blank to use default ${globalTimerSec}s)`}
                      className="font-semibold"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Specify a custom watch duration in seconds for this ad. If left blank, it will
                    use the global default of {globalTimerSec} seconds.
                  </p>
                </div>

                {/* BANNER media fields */}
                {editing.kind === "banner" && (
                  <div className="space-y-3 rounded-2xl border border-border p-4 bg-surface-2/50">
                    <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      Banner Media
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editing.media_url ?? ""}
                          onChange={(e) => setEditing({ ...editing, media_url: e.target.value })}
                          placeholder="Paste image URL or upload below"
                          className="flex-1"
                        />
                        {editing.media_url?.trim() && (
                          <button
                            type="button"
                            onClick={() => setEditing({ ...editing, media_url: "" })}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <ImageUploader onUrl={(url) => setEditing({ ...editing, media_url: url })} />
                      {editing.media_url?.trim() && (
                        <div className="overflow-hidden rounded-xl border border-border max-h-48 bg-black/5 flex items-center justify-center p-1">
                          <img
                            src={editing.media_url}
                            alt="Preview"
                            className="max-h-44 object-contain rounded-lg"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 pt-1">
                      <Label className="text-xs font-bold">Target Link URL</Label>
                      <Input
                        value={editing.link_url ?? ""}
                        onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
                        placeholder="https://example.com/promo"
                      />
                    </div>
                  </div>
                )}

                {/* VIDEO media fields */}
                {editing.kind === "video" && (
                  <div className="space-y-3 rounded-2xl border border-border p-4 bg-surface-2/50">
                    <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      Video Embed & Thumbnail
                    </Label>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Video Embed / Direct MP4 URL</Label>
                      <Input
                        value={editing.embed_url ?? editing.media_url ?? ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            embed_url: e.target.value,
                            media_url: e.target.value,
                          })
                        }
                        placeholder="https://www.youtube.com/embed/... or direct .mp4 link"
                      />
                    </div>
                    <div className="space-y-2 pt-1">
                      <Label className="text-xs font-bold">Cover Photo / Thumbnail Image</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={editing.media_url ?? ""}
                          onChange={(e) => setEditing({ ...editing, media_url: e.target.value })}
                          placeholder="Thumbnail image URL"
                          className="flex-1"
                        />
                      </div>
                      <ImageUploader onUrl={(url) => setEditing({ ...editing, media_url: url })} />
                    </div>
                    <div className="space-y-1 pt-1">
                      <Label className="text-xs font-bold">Action Button Link (Optional)</Label>
                      <Input
                        value={editing.link_url ?? ""}
                        onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}

                {/* CTA label */}
                <div className="space-y-1.5">
                  <Label className="font-bold">Button CTA Label</Label>
                  <Input
                    value={editing.cta_label ?? ""}
                    onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })}
                    placeholder="e.g., Learn More, Claim Perks"
                  />
                </div>

                {/* Placements Selection */}
                <div className="space-y-3 rounded-2xl border border-border p-4 bg-surface">
                  <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Display Locations
                  </Label>
                  <div className="space-y-2">
                    {(
                      [
                        ["show_home", "Home Page Banner"],
                        ["show_global", "Global Chat Banner"],
                        ["show_college", "College Chats Banner"],
                      ] as const
                    ).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
                      >
                        <span className="text-sm font-semibold">{label}</span>
                        <Switch
                          checked={editing[key]}
                          onCheckedChange={(v) => setEditing({ ...editing, [key]: v })}
                        />
                      </div>
                    ))}

                    {/* Highlighted Games Toggle */}
                    <div className="mt-2 flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🕹️</span>
                        <div>
                          <div className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                            Games & Hint Rewards
                          </div>
                          <div className="text-[11px] font-medium text-muted-foreground">
                            Show when user requests Hints or Extra Lives
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={editing.show_games}
                        onCheckedChange={(v) => setEditing({ ...editing, show_games: v })}
                      />
                    </div>
                  </div>
                </div>

                {/* Active & Sort Order */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface">
                    <div>
                      <Label className="font-bold">Active</Label>
                      <p className="text-[10px] text-muted-foreground">Show in circulation</p>
                    </div>
                    <Switch
                      checked={editing.active}
                      onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                    <Label className="font-bold text-xs">Sort Order</Label>
                    <Input
                      type="number"
                      value={editing.sort_order}
                      onChange={(e) =>
                        setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })
                      }
                      className="h-8 font-bold text-xs"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-5 py-4 sm:px-6 gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl font-bold"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl font-bold shadow-md"
              onClick={handleSave}
              disabled={busy}
            >
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
