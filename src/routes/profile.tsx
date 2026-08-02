import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  RefreshCw,
  Save,
  Shuffle,
  Copy,
  Key,
  LogIn,
  Trash2,
  ClipboardList,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  User,
  Lock,
  Download,
  Upload,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useIdentity } from "@/stores/identity";
import { USERNAME_KEY } from "@/lib/identity";
import { setMyAvatar, syncIdentity } from "@/lib/content.functions";
import { STYLES, buildAvatarUrl } from "@/lib/avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import {
  generateRecoveryCode,
  decodeRecoveryCode,
  evaluatePassphrase,
  type PassphraseStrengthResult,
} from "@/lib/crypto";
// PassphraseStrengthResult used by StrengthBar component

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Pick an Avatar | CampusXpose" },
      {
        name: "description",
        content:
          "Choose your anonymous DiceBear cartoon/anime avatar style and save it to your profile.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your Profile — Pick an Avatar" },
      {
        property: "og:description",
        content: "Choose your anonymous DiceBear cartoon/anime avatar.",
      },
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

// ─── Passphrase strength bar ──────────────────────────────────────────────────

function StrengthBar({ result }: { result: PassphraseStrengthResult }) {
  if (result.strength === "empty") return null;
  const bars = [1, 2, 3, 4, 5];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {bars.map((b) => (
          <div
            key={b}
            className="h-2 flex-1 rounded-full transition-all duration-500"
            style={{
              backgroundColor: b <= result.score ? result.color : "#e5e0d8",
              transform: b <= result.score ? "scaleY(1.2)" : "scaleY(1)",
            }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color: result.color }}>
        {result.label}
      </p>
    </div>
  );
}

// ─── Confirmation dialog for identity switch ──────────────────────────────────

function RestoreConfirmDialog({
  open,
  recoveredUsername,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  recoveredUsername: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="mx-4 w-full max-w-sm border-2 border-ink bg-paper p-6 shadow-ink-lg animate-in zoom-in-95 duration-200"
        style={{ borderRadius: "22px 8px 24px 8px / 8px 24px 8px 22px" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 shadow-ink-soft">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Switch Identity?</h3>
            <p className="text-xs text-muted-foreground">This will replace your current session</p>
          </div>
        </div>

        {/* Body */}
        <div
          className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 mb-4"
          style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
        >
          <p className="text-sm text-foreground">
            Your current anonymous identity stays on the server — you can switch back anytime using
            its recovery code.
          </p>
          {recoveredUsername && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Logging in as</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-white px-2.5 py-0.5 text-sm font-bold shadow-ink-soft">
                <User className="h-3 w-3" />@{recoveredUsername}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1 gap-2">
            {loading ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" /> Restoring…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" /> Yes, Restore
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "border-2 border-ink bg-white p-5 shadow-ink transition-all duration-200",
        className,
      )}
      style={{ borderRadius: "20px 7px 22px 7px / 7px 22px 7px 20px" }}
    >
      {children}
    </div>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────

function InputField({
  id,
  label,
  required,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  onKeyDown,
  suffix,
  mono,
  rows,
  hint,
  hintType = "neutral",
}: {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  onKeyDown?: React.KeyboardEventHandler;
  suffix?: React.ReactNode;
  mono?: boolean;
  rows?: number;
  hint?: React.ReactNode;
  hintType?: "neutral" | "error" | "warning" | "success";
}) {
  const hintColors = {
    neutral: "text-muted-foreground",
    error: "text-destructive",
    warning: "text-amber-600",
    success: "text-green-600",
  };

  const inputClass = cn(
    "w-full border border-border bg-surface-2/60 px-3 py-2.5 text-sm outline-none transition-all",
    "focus:border-ink focus:ring-2 focus:ring-ink/10 focus:bg-white",
    suffix ? "pr-10" : "",
    mono ? "font-mono" : "",
  );
  const radius = { borderRadius: "10px 4px 12px 4px / 4px 12px 4px 10px" };

  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        htmlFor={id}
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <div className="relative">
        {rows ? (
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={cn(inputClass, "resize-none")}
            style={radius}
            spellCheck={false}
            autoComplete={autoComplete}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputClass}
            style={radius}
            autoComplete={autoComplete}
            onKeyDown={onKeyDown}
          />
        )}
        {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2">{suffix}</span>}
      </div>
      {hint && (
        <p className={cn("mt-1.5 flex items-center gap-1 text-xs", hintColors[hintType])}>{hint}</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ProfilePage() {
  const {
    username,
    verified,
    avatarUrl,
    isReady,
    hashedId,
    secretKey,
    init,
    refresh,
    reset,
    login,
  } = useIdentity();
  const queryClient = useQueryClient();

  const [style, setStyle] = useState<string>(STYLES[0]);
  const [seed, setSeed] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // ── Backup state ──────────────────────────────────────────────────────────
  const [backupStep, setBackupStep] = useState<"idle" | "form" | "done">("idle");
  const [backupPass, setBackupPass] = useState("");
  const [backupPassConfirm, setBackupPassConfirm] = useState("");
  const [showBackupPass, setShowBackupPass] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const backupStrength = evaluatePassphrase(backupPass);
  const passphrasesMatch = backupPass === backupPassConfirm && backupPassConfirm.length > 0;
  const canGenerate = backupStrength.score >= 2 && passphrasesMatch && !generatingCode;

  // ── Restore state ─────────────────────────────────────────────────────────
  const [restoreCode, setRestoreCode] = useState("");
  const [restorePass, setRestorePass] = useState("");
  const [showRestorePass, setShowRestorePass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [pendingUsername, setPendingUsername] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [decoding, setDecoding] = useState(false);

  const doDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure? This will wipe your account, posts, and messages. You will be assigned a brand new identity.",
      )
    )
      return;
    await reset();
    toast.success("Account deleted and reset!");
  };

  // ── Backup handlers ───────────────────────────────────────────────────────

  const doGenerateCode = async () => {
    if (!secretKey || !username) return;
    if (!canGenerate) return;
    setGeneratingCode(true);
    try {
      // username is now embedded inside the encrypted code (CXv3 format)
      const code = await generateRecoveryCode(secretKey, username, backupPass);
      setGeneratedCode(code);
      setBackupStep("done");
      setBackupPass("");
      setBackupPassConfirm("");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to generate recovery code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCodeCopied(true);
    toast.success("Recovery code copied!");
    setTimeout(() => setCodeCopied(false), 3000);
  };

  // ── Restore handlers ──────────────────────────────────────────────────────

  const doDecodeAndConfirm = async () => {
    if (!restoreCode.trim() || !restorePass.trim()) return;
    setDecoding(true);
    try {
      // decodeRecoveryCode now returns { uid, username } — username is embedded
      // directly in the code (CXv3). For old CXv2 codes username will be null.
      const { uid, username: codeUsername } = await decodeRecoveryCode(
        restoreCode.trim(),
        restorePass,
      );

      if (uid === secretKey) {
        toast.success("You are already logged in with this account!");
        setRestoreCode("");
        setRestorePass("");
        return;
      }

      let recoveredUsername: string | null = codeUsername;

      // For old CXv2 codes the username wasn't stored — try the server as fallback.
      if (!recoveredUsername) {
        try {
          const { sha256 } = await import("@/lib/identity");
          const recoveredHashedId = await sha256(uid);
          const serverInfo = await syncIdentity({ data: { hashedId: recoveredHashedId } });
          recoveredUsername = serverInfo.username ?? null;
        } catch {
          // Non-fatal: show dialog without username if lookup fails.
        }
      }

      setPendingUid(uid);
      setPendingUsername(recoveredUsername);
      setShowConfirm(true);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to decode recovery code");
    } finally {
      setDecoding(false);
    }
  };

  const doConfirmRestore = async () => {
    if (!pendingUid) return;
    setRestoring(true);
    try {
      // Pre-seed the username into localStorage BEFORE login() is called.
      // loginWithKey() wipes USERNAME_KEY and loadOrCreateIdentity() would
      // otherwise generate a brand-new random name. By writing the server-
      // fetched username here, the recovered identity keeps its real username.
      if (pendingUsername) {
        localStorage.setItem(USERNAME_KEY, pendingUsername);
      }
      await login(pendingUid);
      toast.success("Account restored successfully!");
      setRestoreCode("");
      setRestorePass("");
      setShowConfirm(false);
      setPendingUid(null);
      setPendingUsername(null);
    } catch {
      toast.error("Failed to restore account");
    } finally {
      setRestoring(false);
    }
  };

  // ── Avatar / profile handlers ─────────────────────────────────────────────

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (username && !seed) setSeed(username);
  }, [username, seed]);

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
    <>
      <RestoreConfirmDialog
        open={showConfirm}
        recoveredUsername={pendingUsername}
        onConfirm={doConfirmRestore}
        onCancel={() => {
          setShowConfirm(false);
          setPendingUid(null);
          setPendingUsername(null);
        }}
        loading={restoring}
      />

      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Your Space
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight">Profile</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Customize your anonymous identity. Your avatar appears everywhere you post.
          </p>
        </div>

        {/* ── Identity Card ────────────────────────────────────────────── */}
        <div
          className="relative mb-8 overflow-hidden border-2 border-ink bg-white shadow-ink-lg"
          style={{ borderRadius: "24px 8px 26px 8px / 8px 26px 8px 24px" }}
        >
          {/* Decorative tape strips */}
          <div className="absolute -top-1 left-8 h-5 w-16 -rotate-1 rounded-sm bg-yellow-200/80 border border-yellow-300/60" />
          <div className="absolute -top-1 right-12 h-5 w-12 rotate-2 rounded-sm bg-blue-100/80 border border-blue-200/60" />

          <div className="p-6 pt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar with animated ring */}
              <div className="relative shrink-0">
                <div
                  className="absolute inset-0 rounded-full border-4 border-dashed border-primary/30 animate-spin"
                  style={{ animationDuration: "12s", borderRadius: "inherit" }}
                />
                <img
                  src={previewUrl}
                  alt="Your selected avatar"
                  className="relative h-28 w-28 border-3 border-ink bg-surface-2 object-cover shadow-ink"
                  style={{ borderRadius: "20px 8px 22px 8px / 8px 22px 8px 20px" }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-display text-2xl font-bold">
                    {isReady ? (username ?? "anonymous") : "…"}
                  </span>
                  {verified && <VerifiedBadge className="h-5 w-5" />}
                  <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {STYLE_LABELS[style] ?? style}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Anonymous identity · visible to everyone
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={saving}
                    className="gap-1.5 shadow-ink-soft"
                  >
                    {saving ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5 animate-spin" /> Saving…
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" /> Save Avatar
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setSeed(Math.random().toString(36).slice(2, 10))}
                  >
                    <Shuffle className="h-3.5 w-3.5" /> Shuffle
                  </Button>
                  {avatarUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground"
                      onClick={resetToDefault}
                      disabled={saving}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Reset
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Style Picker ─────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-display text-xl font-bold">Choose a Style</h2>
            <span className="ml-auto text-xs text-muted-foreground">{STYLES.length} styles</span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {STYLES.map((s) => {
              const active = s === style;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 border-2 p-3 text-center transition-all duration-200",
                    active
                      ? "border-ink bg-primary/5 shadow-ink scale-[1.03]"
                      : "border-border bg-white hover:border-ink hover:shadow-ink-soft hover:-translate-y-0.5",
                  )}
                  style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
                >
                  {active && (
                    <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-ink-soft">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <img
                    src={buildAvatarUrl(s, previewSeed)}
                    alt={STYLE_LABELS[s] ?? s}
                    loading="lazy"
                    className="h-16 w-16 border border-border bg-surface-2 object-cover transition-transform duration-200 group-hover:scale-105"
                    style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }}
                  />
                  <span
                    className={cn(
                      "text-[11px] font-medium transition-colors",
                      active
                        ? "text-primary font-bold"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {STYLE_LABELS[s] ?? s}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── My Reports ───────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-bold mb-3">My Reports</h2>
          <Link
            to="/my-reports"
            className="group flex items-center gap-4 border-2 border-border bg-white p-4 transition-all duration-200 hover:border-ink hover:shadow-ink hover:-translate-y-0.5"
            style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface-2 shadow-ink-soft transition-all group-hover:border-ink group-hover:bg-primary group-hover:text-white">
              <ClipboardList className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">View My Reports</p>
              <p className="text-xs text-muted-foreground">See all reports you've submitted</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
          </Link>
        </section>

        {/* ── Account Management ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold">Account Management</h2>
          </div>

          <div className="space-y-4">
            {/* ── 1. Backup — Generate Recovery Code ───────────────────── */}
            <SectionCard>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-green-400 bg-green-50 shadow-ink-soft">
                  <Download className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base leading-tight">Backup Account</h3>
                  <p className="text-xs text-muted-foreground">Generate a recovery code</p>
                </div>
                <span className="ml-auto rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Protect your anonymous account with a passphrase-encrypted code. Store it somewhere
                safe — it's the only way to recover your account on another device.
              </p>

              {backupStep === "idle" && (
                <Button
                  variant="outline"
                  className="gap-2 border-green-400 text-green-700 hover:bg-green-50 hover:border-green-600"
                  onClick={() => setBackupStep("form")}
                  disabled={!secretKey}
                  id="backup-start-btn"
                >
                  <Key className="h-4 w-4" /> Create Recovery Code
                </Button>
              )}

              {backupStep === "form" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white text-[10px] font-bold">
                      1
                    </span>
                    <span className="font-medium text-foreground">Set passphrase</span>
                    <ChevronRight className="h-3 w-3 mx-1" />
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-border text-[10px] font-bold text-muted-foreground">
                      2
                    </span>
                    <span>Copy code</span>
                  </div>

                  <InputField
                    id="backup-passphrase"
                    label="Passphrase"
                    required
                    type={showBackupPass ? "text" : "password"}
                    value={backupPass}
                    onChange={setBackupPass}
                    placeholder="Min. 8 characters — make it memorable"
                    autoComplete="new-password"
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowBackupPass(!showBackupPass)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showBackupPass ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                  />
                  <StrengthBar result={backupStrength} />

                  <InputField
                    id="backup-passphrase-confirm"
                    label="Confirm Passphrase"
                    required
                    type={showBackupPass ? "text" : "password"}
                    value={backupPassConfirm}
                    onChange={setBackupPassConfirm}
                    placeholder="Repeat your passphrase"
                    autoComplete="new-password"
                    onKeyDown={(e) => e.key === "Enter" && canGenerate && doGenerateCode()}
                    suffix={
                      backupPassConfirm.length > 0 ? (
                        passphrasesMatch ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )
                      ) : null
                    }
                    hint={
                      backupPassConfirm.length > 0 && !passphrasesMatch ? (
                        "Passphrases do not match"
                      ) : backupStrength.score < 2 && backupPass.length > 0 ? (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Use at least 8
                          characters with mixed letters and numbers
                        </>
                      ) : undefined
                    }
                    hintType={
                      backupPassConfirm.length > 0 && !passphrasesMatch ? "error" : "warning"
                    }
                  />

                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={doGenerateCode}
                      disabled={!canGenerate}
                      className="gap-2"
                      id="backup-generate-btn"
                    >
                      {generatingCode ? (
                        <>
                          <RotateCcw className="h-4 w-4 animate-spin" /> Generating…
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" /> Generate Code
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setBackupStep("idle");
                        setBackupPass("");
                        setBackupPassConfirm("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {backupStep === "done" && generatedCode && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-border text-[10px] font-bold opacity-40">
                      1
                    </span>
                    <span className="opacity-40">Set passphrase</span>
                    <ChevronRight className="h-3 w-3 mx-1 opacity-40" />
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-[10px] font-bold">
                      2
                    </span>
                    <span className="font-medium text-foreground">Copy your code</span>
                  </div>

                  <div
                    className="border-2 border-green-500 bg-green-50 p-4 shadow-ink-soft"
                    style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                        <span className="text-sm font-bold text-green-800">Your Recovery Code</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyCode}
                        className={cn(
                          "gap-1.5 shrink-0 transition-all border-green-400 text-green-700 hover:bg-green-100",
                          codeCopied && "border-green-600 bg-green-100 text-green-800",
                        )}
                        id="backup-copy-btn"
                      >
                        {codeCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <code
                      className="block break-all text-[11px] font-mono text-green-900 leading-relaxed bg-white/70 p-3 border border-green-200 select-all"
                      style={{ borderRadius: "8px 3px 10px 3px / 3px 10px 3px 8px" }}
                    >
                      {generatedCode}
                    </code>
                    <p className="mt-3 flex items-start gap-1.5 text-xs text-green-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                      Save this code AND your passphrase. Without both, you cannot recover your
                      account.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setBackupStep("form");
                        setGeneratedCode("");
                        setCodeCopied(false);
                      }}
                    >
                      <RotateCcw className="h-4 w-4" /> Regenerate
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setBackupStep("idle");
                        setGeneratedCode("");
                        setCodeCopied(false);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* ── 2. Restore — Login with Recovery Code ────────────────── */}
            <SectionCard>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-50 shadow-ink-soft">
                  <Upload className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base leading-tight">
                    Restore Account
                  </h3>
                  <p className="text-xs text-muted-foreground">Login with a recovery code</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Have a recovery code from another device? Paste it below along with your passphrase
                to restore that account.
              </p>

              <div className="space-y-3">
                <InputField
                  id="restore-code"
                  label="Recovery Code"
                  value={restoreCode}
                  onChange={setRestoreCode}
                  placeholder="Paste your CXv3.… (or CXv2.…) recovery code here"
                  rows={2}
                  mono
                  hint={
                    restoreCode.trim() &&
                    !restoreCode.trim().startsWith("CXv3.") &&
                    !restoreCode.trim().startsWith("CXv2.") ? (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Code should start with{" "}
                        <code className="font-mono bg-amber-100 px-1 rounded">CXv3.</code> — make
                        sure you copied it fully.
                      </>
                    ) : undefined
                  }
                  hintType="warning"
                />

                <InputField
                  id="restore-passphrase"
                  label="Passphrase"
                  type={showRestorePass ? "text" : "password"}
                  value={restorePass}
                  onChange={setRestorePass}
                  placeholder="The passphrase you set when creating the code"
                  autoComplete="current-password"
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    restoreCode.trim() &&
                    restorePass.trim() &&
                    doDecodeAndConfirm()
                  }
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowRestorePass(!showRestorePass)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showRestorePass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />

                <Button
                  onClick={doDecodeAndConfirm}
                  disabled={!restoreCode.trim() || !restorePass.trim() || decoding}
                  className="w-full gap-2 sm:w-auto"
                  id="restore-btn"
                >
                  {decoding ? (
                    <>
                      <RotateCcw className="h-4 w-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" /> Restore Account
                    </>
                  )}
                </Button>
              </div>
            </SectionCard>

            {/* ── 3. Delete Account ─────────────────────────────────────── */}
            <div
              className="border-2 border-destructive/40 bg-destructive/5 p-5 transition-all duration-200 hover:border-destructive/70"
              style={{ borderRadius: "20px 7px 22px 7px / 7px 22px 7px 20px" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-destructive/40 bg-destructive/10 shadow-ink-soft">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base leading-tight text-destructive">
                    Delete Account
                  </h3>
                  <p className="text-xs text-muted-foreground">Permanently wipe your identity</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Permanently wipe your account activity from the server and generate a brand new
                anonymous identity. This cannot be undone.
              </p>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={doDeleteAccount}
                id="delete-account-btn"
              >
                <Trash2 className="h-4 w-4" /> Delete My Account
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
