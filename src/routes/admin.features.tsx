import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ToggleRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAdmin } from "@/stores/admin";
import { adminGetFeatures, adminSetFeature } from "@/lib/admin.functions";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/features")({
  component: AdminFeatures,
});

function AdminFeatures() {
  const { token } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectsEnabled, setProjectsEnabled] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const { projectsEnabled } = await adminGetFeatures({ data: { token } });
        setProjectsEnabled(projectsEnabled);
      } catch (e: any) {
        toast.error(e.message ?? "Failed to load features");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const toggleProjects = async (checked: boolean) => {
    if (!token) return;
    setSaving(true);
    // Optimistic UI update
    const previous = projectsEnabled;
    setProjectsEnabled(checked);
    try {
      await adminSetFeature({ data: { token, feature: "projects", enabled: checked } });
      toast.success(checked ? "Projects enabled" : "Projects disabled");
    } catch (e: any) {
      setProjectsEnabled(previous);
      toast.error(e.message ?? "Failed to save feature setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Feature Flags</h1>
        <p className="mt-2 text-muted-foreground">
          Toggle experimental or optional features across the platform.
        </p>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-none tracking-tight mb-2">
                    Projects Section
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                    Enable or disable the campus projects portfolio feature. When disabled, the Projects tab will disappear for all users, and they won't be able to access the projects routes.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 pl-4">
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {projectsEnabled ? "ON" : "OFF"}
                </span>
                <Switch
                  checked={projectsEnabled}
                  onCheckedChange={toggleProjects}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
