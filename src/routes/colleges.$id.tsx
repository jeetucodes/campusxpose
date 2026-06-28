import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Zap, MessageCircle, ArrowUp, ArrowDown, Ghost, Star, Plus, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INCIDENT_CATEGORIES, categoryLabel } from "@/lib/categories";
import { ratingBarColor, severityColor, statusColor, timeAgo, ratingColor, inr } from "@/lib/format";
import { useIdentity } from "@/stores/identity";
import { submitRating, votePost } from "@/lib/content.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/colleges/$id")({
  component: CollegeDetail,
});

function CollegeDetail() {
  const { id } = Route.useParams();
  const router = useRouter();

  const collegeQ = useQuery({
    queryKey: ["college", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("colleges").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const incidentsQ = useQuery({
    queryKey: ["incidents", id],
    queryFn: async () => (await supabase.from("incidents").select("*").eq("college_id", id).order("affected_count", { ascending: false })).data ?? [],
  });
  const postsQ = useQuery({
    queryKey: ["posts", id],
    queryFn: async () => (await supabase.from("posts").select("*").eq("college_id", id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const ratingsQ = useQuery({
    queryKey: ["ratings", id],
    queryFn: async () => (await supabase.from("ratings").select("*").eq("college_id", id)).data ?? [],
  });

  useEffect(() => {
    const ch = supabase
      .channel(`posts-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: `college_id=eq.${id}` }, () => {
        postsQ.refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [ratingOpen, setRatingOpen] = useState(false);
  const [openCat, setOpenCat] = useState<string | null>(null);

  const c = collegeQ.data;
  if (collegeQ.isLoading) {
    return <SiteShell><div className="mx-auto max-w-4xl space-y-4 px-4 py-10"><Skeleton className="h-40 rounded-xl bg-surface" /><Skeleton className="h-60 rounded-xl bg-surface" /></div></SiteShell>;
  }
  if (!c) {
    return <SiteShell><div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground"><p>College not found.</p><Button asChild className="mt-4 rounded-full"><Link to="/colleges">Back to Colleges</Link></Button></div></SiteShell>;
  }

  const ratings = ratingsQ.data ?? [];
  const avg = (k: string) => ratings.length ? ratings.reduce((s, r) => s + ((r as any)[k] ?? 0), 0) / ratings.length : (c.total_rating ?? 0);
  const cats: { key: string; label: string }[] = [
    { key: "faculty_rating", label: "Faculty" },
    { key: "placement_rating", label: "Placements" },
    { key: "infrastructure_rating", label: "Infrastructure" },
    { key: "campus_life_rating", label: "Campus Life" },
    { key: "value_rating", label: "Value" },
  ];

  const incidents = incidentsQ.data ?? [];
  const posts = postsQ.data ?? [];

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{c.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{c.city}, {c.state} · {c.type} · Est. {c.established ?? "—"}</p>
            </div>
            <div className="text-right">
              <div className={cn("text-5xl font-extrabold", ratingColor(c.total_rating ?? 0))}>{(c.total_rating ?? 0).toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">overall</div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Stat n={posts.length} l="Total Reports" />
            <Stat n={incidents.filter((i) => i.status === "active").length} l="Active Incidents" />
            <Stat n={c.total_reviews ?? 0} l="Reviews" />
          </div>
          <Button asChild variant="destructive" className="mt-5 w-full rounded-full">
            <Link to="/report" search={{ college: id }}><Zap className="mr-1 h-4 w-4" /> Report Incident</Link>
          </Button>
        </div>

        {/* Ratings breakdown */}
        <section className="mt-8 rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Ratings Breakdown</h2>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setRatingOpen(true)}>
              <Star className="mr-1 h-4 w-4" /> Rate This College
            </Button>
          </div>
          <div className="mt-5 space-y-4">
            {cats.map((cat) => {
              const v = avg(cat.key);
              return (
                <div key={cat.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{cat.label}</span>
                    <span className="font-semibold">{v.toFixed(1)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${(v / 5) * 100}%` }} viewport={{ once: true }} className={cn("h-full rounded-full", ratingBarColor(v))} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{ratings.length} anonymous reviewers</p>
        </section>

        {/* Incident dashboard */}
        <section className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            Incident Reports
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-sm text-destructive">{incidents.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {INCIDENT_CATEGORIES.map((cat) => {
              const list = incidents.filter((i) => i.category === cat.key);
              const sev = list.length ? Math.max(...list.map((i) => i.severity ?? 1)) : 0;
              const open = openCat === cat.key;
              return (
                <button key={cat.key} onClick={() => setOpenCat(open ? null : cat.key)} style={{ borderRadius: "22px 7px 24px 7px / 7px 24px 7px 22px" }} className={cn("sketch-card p-4 text-left", open ? "border-[#2d5da1]" : "border-border")}>
                  <div className="text-2xl">{cat.emoji}</div>
                  <div className="mt-1 text-sm font-medium">{cat.label}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold">{list.length}</span>
                    {sev > 0 && <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", severityColor(sev))}>S{sev}</span>}
                    <Trend t={list[0]?.trend} />
                  </div>
                </button>
              );
            })}
          </div>
          {openCat && (
            <div className="mt-3 space-y-2">
              {incidents.filter((i) => i.category === openCat).map((i) => (
                <div key={i.id} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-muted-foreground">{i.affected_count} affected · severity {i.severity}</div>
                </div>
              ))}
              {incidents.filter((i) => i.category === openCat).length === 0 && <p className="text-sm text-muted-foreground">No incidents in this category.</p>}
            </div>
          )}
        </section>

        {/* Clustered incidents */}
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Top Clustered Incidents</h2>
          <div className="space-y-4">
            {incidents.slice(0, 5).map((i) => (
              <div key={i.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{i.title}</h3>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs capitalize", statusColor(i.status ?? "active"))}>{i.status}</span>
                </div>
                <p className="mt-1 text-sm text-accent">{i.affected_count} students reported the same issue</p>
                {i.ai_summary && <p className="mt-2 text-sm text-muted-foreground">{i.ai_summary}</p>}
                {i.ai_verdict && <p className="mt-2 rounded-lg bg-surface-2 p-2 text-xs text-warning">⚖️ {i.ai_verdict}</p>}
                {(i.total_amount ?? 0) > 0 && <p className="mt-2 text-sm font-medium">Total reported: {inr(i.total_amount ?? 0)}</p>}
              </div>
            ))}
            {incidents.length === 0 && <p className="text-sm text-muted-foreground">No incidents reported yet.</p>}
          </div>
        </section>

        {/* Dark secrets feed */}
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Dark Secrets Feed</h2>
          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onVoted={() => postsQ.refetch()} />
            ))}
            {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet. Be the first to share the truth.</p>}
          </div>
        </section>
      </div>

      {/* Floating community button */}
      <Link to="/community/$collegeId" params={{ collegeId: id }} className="fixed bottom-20 right-5 z-[60] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 md:bottom-5 md:z-30">
        <MessageCircle className="h-4 w-4" /> Clg Live Chats
      </Link>

      <RatingModal open={ratingOpen} onOpenChange={setRatingOpen} collegeId={id} onDone={() => { ratingsQ.refetch(); collegeQ.refetch(); router.invalidate(); }} />
    </SiteShell>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="text-xl font-bold">{n}</div>
      <div className="text-xs text-muted-foreground">{l}</div>
    </div>
  );
}
function Trend({ t }: { t?: string | null }) {
  if (t === "rising") return <TrendingUp className="h-3.5 w-3.5 text-destructive" />;
  if (t === "declining") return <TrendingDown className="h-3.5 w-3.5 text-success" />;
  return <Minus className="h-3.5 w-3.5 text-warning" />;
}

function PostCard({ post, onVoted }: { post: any; onVoted: () => void }) {
  const vote = useServerFn(votePost);
  const [voting, setVoting] = useState(false);
  const doVote = async (dir: "up" | "down") => {
    setVoting(true);
    try { await vote({ data: { postId: post.id, dir } }); onVoted(); } finally { setVoting(false); }
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Ghost className="h-4 w-4 text-primary" />
        <span className="font-medium text-foreground">{post.username}</span>
        <span>· {timeAgo(post.created_at)}</span>
        <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 capitalize">{categoryLabel(post.category ?? "general")}</span>
      </div>
      <p className="mt-2 text-sm">{post.content}</p>
      <div className="mt-3 flex items-center gap-2">
        <button disabled={voting} onClick={() => doVote("up")} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs hover:text-success">
          <ArrowUp className="h-3.5 w-3.5" /> {post.upvotes}
        </button>
        <button disabled={voting} onClick={() => doVote("down")} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs hover:text-destructive">
          <ArrowDown className="h-3.5 w-3.5" /> {post.downvotes}
        </button>
        <button disabled={voting} onClick={() => doVote("up")} className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs text-primary">
          <Plus className="h-3 w-3" /> Same happened to me
        </button>
      </div>
    </div>
  );
}

function RatingModal({ open, onOpenChange, collegeId, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; collegeId: string; onDone: () => void }) {
  const { hashedId } = useIdentity();
  const rate = useServerFn(submitRating);
  const fields = [
    { key: "faculty", label: "Faculty" },
    { key: "placement", label: "Placements" },
    { key: "infrastructure", label: "Infrastructure" },
    { key: "campusLife", label: "Campus Life" },
    { key: "value", label: "Value" },
  ] as const;
  const [vals, setVals] = useState<Record<string, number>>({ faculty: 0, placement: 0, infrastructure: 0, campusLife: 0, value: 0 });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!hashedId) return;
    if (Object.values(vals).some((v) => v < 1)) { toast.error("Please rate all categories"); return; }
    setBusy(true);
    try {
      await rate({ data: { collegeId, hashedId, faculty: vals.faculty, placement: vals.placement, infrastructure: vals.infrastructure, campusLife: vals.campusLife, value: vals.value } });
      toast.success("Thanks! Your anonymous rating was submitted.");
      onOpenChange(false);
      onDone();
    } catch { toast.error("Could not submit rating"); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-surface">
        <DialogHeader><DialogTitle>Rate This College</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center justify-between">
              <span className="text-sm">{f.label}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} onClick={() => setVals((p) => ({ ...p, [f.key]: i }))}>
                    <Star className={cn("h-6 w-6", i <= vals[f.key] ? "fill-warning text-warning" : "text-border")} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Button disabled={busy} onClick={submit} className="w-full rounded-full">Submit Anonymously</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
