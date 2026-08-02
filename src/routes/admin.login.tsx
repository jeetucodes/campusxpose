import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost, Lock, ShieldAlert, Timer } from "lucide-react";
import { adminLogin } from "@/lib/admin.functions";
import { useAdmin } from "@/stores/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Admin Login — CampusXpose" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLoginPage,
});

// ─── Rate-limit helpers (sessionStorage so refresh doesn't reset) ─────────────

const SS_ATTEMPTS = "adm_attempts";
const SS_LOCKED_UNTIL = "adm_locked_until";

// Delay schedule (seconds): attempt 3→10s, 4→30s, 5→60s, 6→120s, 7+→300s
const lockoutSeconds = (attempts: number) => {
  if (attempts < 3) return 0;
  const steps = [10, 30, 60, 120, 300];
  return steps[Math.min(attempts - 3, steps.length - 1)];
};

function getAttempts(): number {
  return parseInt(sessionStorage.getItem(SS_ATTEMPTS) ?? "0", 10);
}
function setAttempts(n: number) {
  sessionStorage.setItem(SS_ATTEMPTS, String(n));
}
function getLockedUntil(): number {
  return parseInt(sessionStorage.getItem(SS_LOCKED_UNTIL) ?? "0", 10);
}
function setLockedUntil(ms: number) {
  sessionStorage.setItem(SS_LOCKED_UNTIL, String(ms));
}
function clearRateLimit() {
  sessionStorage.removeItem(SS_ATTEMPTS);
  sessionStorage.removeItem(SS_LOCKED_UNTIL);
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(targetMs: number) {
  const calc = () => Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(calc);

  useEffect(() => {
    // Recalculate immediately when targetMs changes
    setRemaining(calc());

    if (targetMs <= Date.now()) return; // nothing to count down
    const t = setInterval(() => {
      const left = calc();
      setRemaining(left);
      if (left === 0) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [targetMs]); // re-run every time a new lockout is set

  return remaining;
}

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminLoginPage() {
  const login = useServerFn(adminLogin);
  const { setToken } = useAdmin();
  const navigate = useNavigate();

  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [lockedUntil, setLockedUntilState] = useState<number>(() => getLockedUntil());

  const remaining = useCountdown(lockedUntil);
  const isLocked = remaining > 0;

  // format mm:ss
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const submit = async () => {
    if (isLocked || busy || !pw.trim()) return;

    setBusy(true);
    setError(null);
    try {
      const res = await login({ data: { password: pw } });
      if (res.ok) {
        clearRateLimit();
        setToken(res.token);
        navigate({ to: "/admin/dashboard" });
        return;
      }

      // Wrong password — increment attempts and maybe lock
      const attempts = getAttempts() + 1;
      setAttempts(attempts);

      const delay = lockoutSeconds(attempts);
      if (delay > 0) {
        const until = Date.now() + delay * 1000;
        setLockedUntil(until);
        setLockedUntilState(until);
        setError(`Too many attempts. Wait ${fmt(delay)} before trying again.`);
      } else {
        const left = 3 - attempts;
        setError(
          left > 0
            ? `Wrong password. ${left} attempt${left > 1 ? "s" : ""} left before lockout.`
            : "Wrong password.",
        );
      }

      triggerShake();
      setPw("");
    } catch {
      setError("Something went wrong. Try again.");
      triggerShake();
    } finally {
      setBusy(false);
    }
  };

  const attempts = getAttempts();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-8 overflow-hidden">
      {/* Dot grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(#d1cec8 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <motion.div
        animate={shake ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div
          className="border-2 border-ink bg-white shadow-[6px_6px_0px_0px_var(--ink)]"
          style={{ borderRadius: "24px 8px 26px 8px / 8px 26px 8px 24px" }}
        >
          {/* Tape strips */}
          <div className="absolute -top-2 left-10 h-6 w-20 -rotate-2 rounded-sm bg-yellow-200 border border-yellow-300/80 z-10 pointer-events-none" />
          <div className="absolute -top-2 right-14 h-5 w-14 rotate-1 rounded-sm bg-blue-100 border border-blue-200/80 z-10 pointer-events-none" />

          {/* Top accent bar */}
          <div
            className="h-2 w-full bg-gradient-to-r from-accent via-primary to-accent"
            style={{ borderRadius: "22px 6px 0 0 / 6px 0 0 22px" }}
          />

          <div className="p-7 pt-6">
            {/* Header */}
            <div className="mb-7 flex flex-col items-center text-center">
              <div
                className="flex h-14 w-14 items-center justify-center border-2 border-ink bg-accent/10 shadow-[3px_3px_0_0_var(--ink)]"
                style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
              >
                <Ghost className="h-7 w-7 text-accent" />
              </div>
              <h1 className="mt-3 font-display text-2xl font-black tracking-tight">
                Campus<span className="text-accent">Xpose</span>
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="rounded-full border border-destructive/30 bg-destructive/8 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-destructive">
                  🔐 Admin Panel
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>

            {/* ── Lockout banner ── */}
            <AnimatePresence>
              {isLocked && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="mb-5 overflow-hidden border-2 border-destructive/50 bg-destructive/5"
                  style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                >
                  <div className="flex items-center gap-3 border-b border-destructive/20 bg-destructive/10 px-4 py-2.5">
                    <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-xs font-bold text-destructive uppercase tracking-wide">
                      Access Temporarily Blocked
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <p className="text-xs text-muted-foreground">Too many failed attempts</p>
                    <div className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-white px-3 py-1 shadow-sm">
                      <Timer className="h-3.5 w-3.5 text-destructive" />
                      <span className="font-mono text-sm font-bold tabular-nums text-destructive">
                        {fmt(remaining)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Attempt pips ── */}
            <AnimatePresence>
              {!isLocked && attempts > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 rounded-xl border border-border bg-surface-2/60 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Failed attempts
                    </span>
                    <span className="text-[10px] font-bold text-destructive">{attempts} / 3</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        className="h-2 flex-1 rounded-full origin-left"
                        style={{ backgroundColor: i < attempts ? "#ff4d4d" : "#e5e0d8" }}
                      />
                    ))}
                  </div>
                  {attempts >= 2 && (
                    <p className="mt-1.5 text-[10px] text-amber-600 font-medium">
                      ⚠️{" "}
                      {attempts === 2
                        ? "1 attempt left before lockout"
                        : `Next lockout: ${lockoutSeconds(attempts + 1)}s`}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Password field ── */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  disabled={isLocked}
                  autoFocus
                  className={[
                    "pl-9 pr-4 py-2.5 text-sm transition-all bg-surface-2/60",
                    "border-2 focus:border-ink focus:ring-0",
                    error && !isLocked ? "border-destructive" : "border-border",
                    isLocked ? "cursor-not-allowed opacity-50 select-none" : "",
                  ].join(" ")}
                  style={{ borderRadius: "10px 4px 12px 4px / 4px 12px 4px 10px" }}
                  placeholder={isLocked ? "Locked — wait for timer…" : "Enter admin password"}
                />
              </div>

              {/* Inline error */}
              <AnimatePresence>
                {error && !isLocked && (
                  <motion.p
                    key="err"
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs text-destructive font-medium pt-0.5"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* ── Submit button ── */}
            <Button
              onClick={submit}
              disabled={busy || isLocked || !pw.trim()}
              className="mt-5 w-full h-11 gap-2 text-sm font-bold shadow-[3px_3px_0_0_var(--ink)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60 disabled:translate-y-0 disabled:shadow-[3px_3px_0_0_var(--ink)]"
              style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }}
            >
              {busy ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="inline-block"
                  >
                    ⏳
                  </motion.span>{" "}
                  Checking…
                </>
              ) : isLocked ? (
                <>
                  <Timer className="h-4 w-4" /> Locked · {fmt(remaining)}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Login to Admin
                </>
              )}
            </Button>

            {/* Footer note */}
            <p className="mt-4 text-center text-[10px] text-muted-foreground">
              This panel is restricted to authorised administrators only.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
