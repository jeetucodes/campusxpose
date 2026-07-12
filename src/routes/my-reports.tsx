import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  FileCheck,
  FileText,
  Upload,
  X,
  ArrowLeft,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIdentity } from "@/stores/identity";
import { submitProofForPost } from "@/lib/content.functions";
import { ProofUploader } from "@/components/ProofUploader";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/my-reports")({
  head: () => ({
    meta: [
      { title: "My Reports — CampusXpose" },
      {
        name: "description",
        content:
          "View and manage all the anonymous reports you have submitted on CampusXpose.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyReportsPage,
});

function MyReportsPage() {
  const { hashedId, isReady } = useIdentity();
  const submitProof = useServerFn(submitProofForPost);

  const [proofTarget, setProofTarget] = useState<string | null>(null);
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const myPostsQ = useQuery({
    queryKey: ["my-posts", hashedId],
    enabled: !!hashedId && isReady,
    queryFn: async () => {
      if (!hashedId) return [];
      const { data } = await supabase
        .from("posts")
        .select("id, content, category, status, created_at, college_id")
        .eq("anonymous_user_hash", hashedId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const myPosts = myPostsQ.data ?? [];
  const heldPosts = myPosts.filter((p: any) => p.status === "hold");
  const publishedPosts = myPosts.filter((p: any) => p.status !== "hold");

  const openProofDialog = (postId: string) => {
    setProofTarget(postId);
    setPendingUrls([]);
  };

  const handleSubmitProof = async () => {
    if (!hashedId || !proofTarget || pendingUrls.length === 0) return;
    setSubmitting(true);
    try {
      await submitProof({
        data: { postId: proofTarget, hashedId, evidenceUrls: pendingUrls },
      });
      toast.success("Proof submitted! Your report is now published. 🎉");
      setProofTarget(null);
      setPendingUrls([]);
      myPostsQ.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit proof. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Back button */}
      <Link
        to="/profile"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <ClipboardList className="h-7 w-7 text-primary shrink-0" />
        <h1 className="font-display text-3xl font-bold">My Reports</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        All the anonymous reports you've submitted on CampusXpose.
      </p>

      {/* Loading */}
      {myPostsQ.isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!myPostsQ.isLoading && myPosts.length === 0 && (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border bg-surface py-16 text-center"
          style={{ borderRadius: "20px 7px 22px 7px / 7px 22px 7px 20px" }}
        >
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <div>
            <p className="font-semibold text-foreground">No reports yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You haven't submitted any reports yet.
            </p>
          </div>
          <Button asChild size="sm" className="mt-2">
            <Link to="/report">Submit your first report</Link>
          </Button>
        </div>
      )}

      {/* Held posts — proof required */}
      {heldPosts.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-warning bg-warning/10 p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-warning">
            <AlertTriangle className="h-5 w-5" />
            {heldPosts.length} report{heldPosts.length > 1 ? "s" : ""} on hold
            — proof required
          </div>
          <p className="text-sm text-muted-foreground">
            Our AI found these reports contain serious allegations that require
            evidence before publishing. Upload proof and your report will go
            live immediately.
          </p>
          <div className="space-y-3">
            {heldPosts.map((p: any) => (
              <div
                key={p.id}
                className="rounded-lg border-2 border-warning/40 bg-white p-4 shadow-sm"
              >
                <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap">
                  {p.content}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(p.created_at)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-warning text-warning hover:bg-warning/10 gap-1.5"
                    onClick={() => openProofDialog(p.id)}
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Proof to Publish
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Published posts */}
      {publishedPosts.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-base font-bold text-muted-foreground uppercase tracking-wide mb-3">
            Published ({publishedPosts.length})
          </h2>
          {publishedPosts.map((p: any) => (
            <div
              key={p.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
              style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
            >
              <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground line-clamp-2 whitespace-pre-wrap">
                  {p.content}
                </p>
                <span className="mt-1 text-xs text-muted-foreground">
                  {timeAgo(p.created_at)}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                Published
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Proof upload dialog */}
      <Dialog
        open={!!proofTarget}
        onOpenChange={(v) => {
          if (!v) setProofTarget(null);
        }}
      >
        <DialogContent
          className="border-2 border-border bg-white sm:max-w-md"
          style={{ borderRadius: "20px 7px 22px 7px / 7px 22px 7px 20px" }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Upload Proof
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Upload at least one piece of evidence (screenshot, document, photo)
            to support your allegation. Once uploaded, your report will be
            published immediately.
          </p>

          <ProofUploader
            onUploaded={(url) => setPendingUrls((p) => [...p, url])}
          />

          {pendingUrls.length > 0 && (
            <div className="mt-3 space-y-2">
              {pendingUrls.map((url, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 px-3 py-2"
                >
                  <FileCheck className="h-4 w-4 text-success" />
                  <span className="text-xs font-medium text-success flex-1 truncate">
                    File {i + 1} uploaded ✓
                  </span>
                  <button
                    onClick={() =>
                      setPendingUrls((p) => p.filter((_, idx) => idx !== i))
                    }
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setProofTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={pendingUrls.length === 0 || submitting}
              onClick={handleSubmitProof}
            >
              {submitting ? "Publishing…" : "Submit & Publish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
