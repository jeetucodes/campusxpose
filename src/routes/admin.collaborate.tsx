import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, FolderOpen, Handshake, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminListCollabRequests, adminUpdateCollabRequest } from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/collaborate")({
  head: () => ({
    meta: [{ title: "Admin · Collaborate Requests" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <AdminShell>
      <CollaborateAdmin />
    </AdminShell>
  ),
});

type CollabRequest = {
  id: string;
  project_id: string;
  project_title: string;
  sender_ghost_id: string;
  sender_username: string;
  owner_username: string;
  message: string | null;
  skills: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

const STATUS_TABS = [
  { value: "pending", label: "Pending", icon: Clock },
  { value: "accepted", label: "Accepted", icon: CheckCircle2 },
  { value: "rejected", label: "Rejected", icon: XCircle },
  { value: "all", label: "All", icon: Handshake },
] as const;

function CollaborateAdmin() {
  const { token } = useAdmin();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "accepted" | "rejected" | "all">("pending");

  const listFn = useServerFn(adminListCollabRequests);
  const updateFn = useServerFn(adminUpdateCollabRequest);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["collab-requests", statusFilter, token],
    enabled: !!token,
    queryFn: () => listFn({ data: { token: token!, status: statusFilter } }),
  });

  const handleAction = async (requestId: string, action: "accepted" | "rejected") => {
    if (!token) return;
    setBusy(requestId);
    try {
      await updateFn({ data: { token, requestId, action } });
      toast.success(action === "accepted" ? "Request accepted! DM sent 💬" : "Request rejected.");
      await queryClient.invalidateQueries({ queryKey: ["collab-requests"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update request");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Handshake className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Collaborate Requests</h1>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              statusFilter === value
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:bg-surface-2",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (requests ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface py-16 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/40" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">
            No {statusFilter !== "all" ? statusFilter : ""} collaborate requests.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(requests as CollabRequest[] ?? []).map((req) => (
            <div
              key={req.id}
              className={cn(
                "rounded-xl border bg-surface p-4 transition-shadow",
                req.status === "pending"
                  ? "border-warning/40 bg-warning/5"
                  : req.status === "accepted"
                    ? "border-success/40 bg-success/5"
                    : "border-border",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Left: info */}
                <div className="space-y-2">
                  {/* Project */}
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-semibold text-foreground">{req.project_title}</span>
                    <span className="text-xs text-muted-foreground">
                      (owner: @{req.owner_username})
                    </span>
                  </div>

                  {/* Sender */}
                  <div className="text-sm">
                    <span className="font-medium text-foreground">From:</span>{" "}
                    <span className="font-mono text-primary">@{req.sender_username}</span>
                  </div>

                  {/* Message */}
                  {req.message && (
                    <div className="max-w-lg rounded-lg border border-border bg-white p-3 text-sm">
                      <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Why they want to collaborate:
                      </p>
                      <p className="text-foreground">{req.message}</p>
                    </div>
                  )}

                  {/* Skills */}
                  {req.skills && (
                    <div className="text-sm">
                      <span className="font-medium text-foreground">Skills:</span>{" "}
                      <span className="text-muted-foreground">{req.skills}</span>
                    </div>
                  )}

                  {/* Date + status */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {timeAgo(req.created_at)}
                    <span
                      className={cn(
                        "ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        req.status === "pending"
                          ? "bg-warning/20 text-warning"
                          : req.status === "accepted"
                            ? "bg-success/20 text-success"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {req.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Right: actions (only for pending) */}
                {req.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-success text-success hover:bg-success/10"
                      disabled={busy === req.id}
                      onClick={() => handleAction(req.id, "accepted")}
                    >
                      {busy === req.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-destructive text-destructive hover:bg-destructive/10"
                      disabled={busy === req.id}
                      onClick={() => handleAction(req.id, "rejected")}
                    >
                      {busy === req.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
