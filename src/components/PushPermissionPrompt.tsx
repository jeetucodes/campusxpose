import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { useIdentity } from "@/stores/identity";
import {
  enablePush,
  isPushSupported,
  permissionState,
  PERMISSION_ASKED_KEY,
} from "@/lib/push-client";

/**
 * One-time, dismissible prompt asking the user to turn on push notifications.
 * Never shows in the Lovable preview iframe, when unsupported, or once the
 * user has already answered (granted/denied) or dismissed it.
 */
export function PushPermissionPrompt() {
  const { hashedId } = useIdentity();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (permissionState() !== "default") return;
    if (localStorage.getItem(PERMISSION_ASKED_KEY)) return;
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    localStorage.setItem(PERMISSION_ASKED_KEY, "1");
    setShow(false);
  }

  async function enable() {
    if (!hashedId) return;
    setBusy(true);
    try {
      const res = await enablePush(hashedId);
      if (res === "granted") toast.success("Notifications enabled");
      else if (res === "denied") toast("You can re-enable anytime from your profile menu");
    } catch {
      toast.error("Could not enable notifications");
    } finally {
      localStorage.setItem(PERMISSION_ASKED_KEY, "1");
      setBusy(false);
      setShow(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-sm md:bottom-4">
      <div
        className="flex items-start gap-3 border-2 border-ink bg-white p-4 shadow-ink"
        style={{ borderRadius: "20px 8px 22px 8px / 8px 22px 8px 20px" }}
      >
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div className="flex-1">
          <p className="font-display font-bold">Stay in the loop</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Get notified about replies, comments and DMs — anonymously, no email needed.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={enable}
              disabled={busy}
              className="border-2 border-ink bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground shadow-ink transition-transform hover:-rotate-1 disabled:opacity-60"
              style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
            >
              {busy ? "Enabling…" : "Enable"}
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
