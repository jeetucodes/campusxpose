import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, Save, Shuffle, Copy, Key, LogIn, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useIdentity } from "@/stores/identity";
import { setMyAvatar } from "@/lib/content.functions";
import { STYLES, buildAvatarUrl } from "@/lib/avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Pick an Avatar | CampusXpose" },
      { name: "description", content: "Choose your anonymous DiceBear cartoon/anime avatar style and save it to your profile." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your Profile — Pick an Avatar" },
      { property: "og:description", content: "Choose your anonymous DiceBear cartoon/anime avatar." },
    ],
  }),
  component: ProfilePage,
});

const STYLE_LABELS: Record<string, string> = {
  adventurer: "Adventurer",
  avataaars: "Avataaars",
  "big-smile": "Big Smile",
  lorelei: "Lorelei",
  micah: "Micah",
  "open-peeps": "Open Peeps",
  "fun-emoji": "Fun Emoji",
  notionists: "Notionists",
  personas: "Personas",
  miniavs: "Miniavs",
  "bottts-neutral": "Bottts",
  thumbs: "Thumbs",
};

function ProfilePage() {
  const { username, verified, avatarUrl, isReady, hashedId, secretKey, init, refresh, reset, login } = useIdentity();
  const queryClient = useQueryClient();

  const [style, setStyle] = useState<string>(STYLES[0]);
  const [seed, setSeed] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loginKey, setLoginKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const doDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This will wipe your account, posts, and messages. You will be assigned a brand new identity.")) return;
    await reset();
    toast.success("Account deleted and reset!");
  };

  const doLogin = async () => {
    if (!loginKey.trim()) return;
    if (loginKey.trim() === secretKey) {
       toast.error("You are already logged in with this key");
       return;
    }
    await login(loginKey.trim());
    toast.success("Logged in successfully!");
    setLoginKey("");
    setShowKey(false);
  };
  
  const copyKey = () => {
    if (secretKey) {
       navigator.clipboard.writeText(secretKey);
       toast.success("Recovery key copied to clipboard!");
    }
  };

  useEffect(() => {
    init();
  }, [init]);

  // Default the seed to the username so previews feel personal.
  useEffect(() => {
    if (username && !seed) setSeed(username);
  }, [username, seed]);

  // Pre-select the style currently saved on the server, if recognizable.
  useEffect(() => {
    if (!avatarUrl) return;
    const m = avatarUrl.match(/dicebear\.com\/9\.x\/([^/]+)\//);
    const savedStyle = m?.[1];
    if (savedStyle && STYLES.includes(savedStyle as (typeof STYLES)[number])) {
      setStyle(savedStyle);
    }
    try {
      const u = new URL(avatarUrl);
      const s = u.searchParams.get("seed");
      if (s) setSeed(s);
    } catch {
      // ignore malformed saved URL
    }
  }, [avatarUrl]);

  const previewSeed = seed || username || "anonymous";
  const previewUrl = useMemo(() => buildAvatarUrl(style, previewSeed), [style, previewSeed]);

  const save = async () => {
    if (!hashedId || !username) {
      toast.error("Identity not ready yet, try again in a moment");
      return;
    }
    setSaving(true);
    try {
      const res = await setMyAvatar({ data: { hashedId, username, url: previewUrl } });
      if (!res.ok) {
        toast.error("Could not save avatar");
        return;
      }
      toast.success("Avatar saved!");
      queryClient.invalidateQueries({ queryKey: ["avatar-overrides"] });
      await refresh();
    } catch {
      toast.error("Could not save avatar");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!hashedId || !username) return;
    setSaving(true);
    try {
      await setMyAvatar({ data: { hashedId, username, url: null } });
      toast.success("Reset to default avatar");
      queryClient.invalidateQueries({ queryKey: ["avatar-overrides"] });
      await refresh();
    } catch {
      toast.error("Could not reset avatar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Your Profile</h1>
      <p className="mt-1 text-muted-foreground">
        Pick a cartoon / anime avatar style. It saves to your anonymous identity and shows everywhere you appear.
      </p>

      {/* Current selection preview */}
      <div
        className="mt-6 flex items-center gap-4 border-2 border-ink bg-white p-5 shadow-ink"
        style={{ borderRadius: "20px 7px 22px 7px / 7px 22px 7px 20px" }}
      >
        <img
          src={previewUrl}
          alt="Your selected avatar"
          className="h-24 w-24 shrink-0 -rotate-2 overflow-hidden border-2 border-border bg-surface-2 object-cover shadow-ink-soft"
          style={{ borderRadius: "20px 8px 22px 8px / 8px 22px 8px 20px" }}
        />
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1 font-display text-xl font-bold">
            {isReady ? (username ?? "anonymous") : "..."}
            {verified && <VerifiedBadge className="h-4 w-4" />}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Style: <span className="font-medium text-foreground">{STYLE_LABELS[style] ?? style}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save avatar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() => setSeed(Math.random().toString(36).slice(2, 10))}
            >
              <Shuffle className="h-4 w-4" /> Shuffle
            </Button>
            {avatarUrl && (
              <Button size="sm" variant="outline" className="gap-1.5 text-muted-foreground" onClick={resetToDefault} disabled={saving}>
                <RefreshCw className="h-4 w-4" /> Reset to default
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Style grid */}
      <h2 className="mt-8 font-display text-lg font-bold">Choose a style</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {STYLES.map((s) => {
          const active = s === style;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              className={cn(
                "relative flex flex-col items-center gap-2 border-2 p-3 text-center transition-colors",
                active ? "border-accent bg-accent/10" : "border-border bg-white hover:bg-surface-2",
              )}
              style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
            >
              {active && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <img
                src={buildAvatarUrl(s, previewSeed)}
                alt={STYLE_LABELS[s] ?? s}
                loading="lazy"
                className="h-16 w-16 overflow-hidden border border-border bg-surface-2 object-cover"
                style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
              />
              <span className="text-xs font-medium">{STYLE_LABELS[s] ?? s}</span>
            </button>
          );
        })}
      </div>

      {/* Account Management */}
      <h2 className="mt-12 font-display text-lg font-bold text-destructive">Account Management</h2>
      <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-5 mb-8">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> Recovery Key (Login Hash)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Save this secret key. You can use it to login to this exact account from another device. 
              <strong> Do not share this with anyone!</strong>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input 
                type={showKey ? "text" : "password"} 
                readOnly 
                value={secretKey || ""} 
                className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm font-mono text-muted-foreground outline-none"
              />
              <Button variant="outline" size="sm" onClick={() => setShowKey(!showKey)}>
                {showKey ? "Hide" : "Show"}
              </Button>
              <Button variant="outline" size="sm" onClick={copyKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border-t border-destructive/10 pt-6">
            <h3 className="font-semibold flex items-center gap-2"><LogIn className="h-4 w-4" /> Login with Hash</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste a previously saved recovery key here to restore that account.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Paste recovery key..." 
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value)}
                className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <Button onClick={doLogin} disabled={!loginKey.trim()}>
                Login
              </Button>
            </div>
          </div>

          <div className="border-t border-destructive/10 pt-6">
            <h3 className="font-semibold flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete Account</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently wipe your account activity from the server and generate a new anonymous identity.
            </p>
            <Button variant="destructive" className="mt-3" onClick={doDeleteAccount}>
              Delete My Account
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
