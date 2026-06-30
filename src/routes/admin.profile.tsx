import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Save } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminGetOwnAvatar, adminSetOwnAvatar } from "@/lib/admin.functions";
import { ADMIN_AVATARS } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "Admin · Profile" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><AdminProfile /></AdminShell>,
});

function AdminProfile() {
  const { token } = useAdmin();
  const queryClient = useQueryClient();
  const getAvatar = useServerFn(adminGetOwnAvatar);
  const setAvatar = useServerFn(adminSetOwnAvatar);

  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["admin-own-avatar"],
    queryFn: () => getAvatar({ data: { token: token! } }),
    enabled: !!token,
  });

  useEffect(() => {
    if (q.data?.url) setSelected(q.data.url);
  }, [q.data?.url]);

  const current = selected ?? q.data?.url ?? ADMIN_AVATARS[0];

  const save = async () => {
    if (!token || !selected) return;
    setSaving(true);
    try {
      await setAvatar({ data: { token, url: selected } });
      toast.success("Admin avatar saved!");
      queryClient.invalidateQueries({ queryKey: ["admin-own-avatar"] });
      queryClient.invalidateQueries({ queryKey: ["avatar-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["verified-usernames"] });
    } catch {
      toast.error("Could not save avatar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Admin Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick an official avatar for the admin account. It shows wherever the admin appears (like DM replies) and is always verified.
      </p>

      {/* Preview */}
      <div className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-surface p-5">
        <img
          src={current}
          alt="Admin avatar"
          className="h-20 w-20 shrink-0 rounded-xl border border-border bg-surface-2 object-cover"
        />
        <div>
          <div className="inline-flex items-center gap-1 text-lg font-bold">
            admin <VerifiedBadge className="h-4 w-4" />
          </div>
          <p className="text-sm text-muted-foreground">Official account</p>
        </div>
      </div>

      {/* Choices */}
      <h2 className="mt-8 font-display text-lg font-bold">Choose an avatar</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {ADMIN_AVATARS.map((url) => {
          const active = url === current;
          return (
            <button
              key={url}
              type="button"
              onClick={() => setSelected(url)}
              className={cn(
                "relative flex items-center justify-center rounded-xl border-2 p-2 transition-colors",
                active ? "border-primary bg-primary/10" : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              {active && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <img src={url} alt="" loading="lazy" className="h-16 w-16 rounded-lg object-cover" />
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <Button onClick={save} disabled={saving || !selected} className="gap-1.5">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save avatar"}
        </Button>
      </div>
    </div>
  );
}
