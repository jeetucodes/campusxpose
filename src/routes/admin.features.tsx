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
  const admin = useAdmin();
  const [loading, setLoading] = useState(true);
  const [projectsEnabled, setProjectsEnabled] = useState(false);
  const [storeEnabled, setStoreEnabled] = useState(true);

  useEffect(() => {
    async function load() {
      if (!admin.token) return;
      try {
        const res = await adminGetFeatures({ data: { token: admin.token } });
        setProjectsEnabled(res.projectsEnabled);
        setStoreEnabled(res.storeEnabled);
      } catch (e) {
        toast.error("Failed to load feature flags");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [admin.token]);

  const toggleFeature = async (feature: "projects" | "store", enabled: boolean) => {
    if (!admin.token) return;
    try {
      if (feature === "projects") setProjectsEnabled(enabled);
      if (feature === "store") setStoreEnabled(enabled);
      
      const res = await adminSetFeature({
        data: { token: admin.token, feature, enabled },
      });
      if (res.ok) {
        toast.success(`${feature === "projects" ? "Projects" : "Store"} feature ${enabled ? "enabled" : "disabled"}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update feature");
      // Revert on error
      if (feature === "projects") setProjectsEnabled(!enabled);
      if (feature === "store") setStoreEnabled(!enabled);
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

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold">Student Projects</h3>
                <p className="text-sm text-muted-foreground">
                  Enable the student projects directory and showcase.
                </p>
              </div>
              <Switch
                checked={projectsEnabled}
                onCheckedChange={(checked) => toggleFeature("projects", checked)}
              />
            </div>
            
            <div className="flex items-center justify-between border-t pt-6">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold">CX Store on Home Page</h3>
                <p className="text-sm text-muted-foreground">
                  Show or hide the CX Store banner on the home page.
                </p>
              </div>
              <Switch
                checked={storeEnabled}
                onCheckedChange={(checked) => toggleFeature("store", checked)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
