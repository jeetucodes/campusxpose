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
  return (
    <div className="flex h-full flex-col p-6 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Feature Flags</h1>
        <p className="mt-2 text-muted-foreground">
          Toggle experimental or optional features across the platform.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="text-muted-foreground">No experimental features are currently available to toggle.</p>
      </div>
    </div>
  );
}
