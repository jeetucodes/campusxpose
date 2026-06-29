import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Zap, MessageCircle, ArrowUp, ArrowDown, Star, TrendingUp, TrendingDown, Minus,
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
import { UserSymbol } from "@/components/UserSymbol";
import { PostComments } from "@/components/PostComments";
import { useVerifiedUsernames } from "@/hooks/useVerified";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export const Route = createFileRoute("/colleges/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("colleges")
      .select("name, city, state")
      .eq("id", params.id)
      .maybeSingle();
    return { college: data };
  },
  head: ({ params, loaderData }) => {
    const c = loaderData?.college;
    const canonical = `https://campusxpose.online/colleges/${params.id}`;
    const title = c?.name
      ? `${c.name} — Reviews & Reports | CampusXpose`.slice(0, 60)
      : "College Reviews & Reports | CampusXpose";
    const location = c ? [c.city, c.state].filter(Boolean).join(", ") : "";
    const description = c?.name
      ? `Anonymous student reviews, ratings and incident reports for ${c.name}${location ? `, ${location}` : ""}. Read the real campus story.`.slice(0, 160)
      : "Anonymous student reviews, ratings and incident reports for Indian colleges on CampusXpose.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
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

  const incidents = incidentsQ.data ?? [];
  const posts = postsQ.data ?? [];

  const { hashedId } = useIdentity();
  const myVotesQ = useQuery({
    queryKey: ["my-votes", id, hashedId],
    queryFn: async () => {
      if (!hashedId) return {} as Record<string, "up" | "down">;
      const { data } = await supabase.from("post_votes").select("post_id, dir").eq("anonymous_user_hash", hashedId);
      const map: Record<string, "up" | "down"> = {};
      (data ?? []).forEach((v: any) => { map[v.post_id] = v.dir; });
      return map;
    },
    enabled: !!hashedId,
  });
  const myVotes = myVotesQ.data ?? {};

  const evidenceQ = useQuery({
    queryKey: ["verified-evidence", id, incidents.map((i) => i.id).join(","), posts.map((p) => p.id).join(",")],
    queryFn: async () => {
      const incidentIds = incidents.map((i) => i.id);
      const postIds = posts.map((p) => p.id);
      if (!incidentIds.length && !postIds.length) return [] as any[];
      const ors: string[] = [];
      if (incidentIds.length) ors.push(`incident_id.in.(${incidentIds.join(",")})`);
      if (postIds.length) ors.push(`post_id.in.(${postIds.join(",")})`);
      const { data } = await supabase
        .from("evidence")
        .select("*")
        .eq("is_verified", true)
        .or(ors.join(","))
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: incidentsQ.isFetched && postsQ.isFetched,
  });
  const evidence = evidenceQ.data ?? [];

  if (collegeQ.isLoading) {
    return <SiteShell hideFooter><div className="mx-auto max-w-4xl space-y-4 px-4 py-10"><Skeleton className="h-40 rounded-xl bg-surface" /><Skeleton className="h-60 rounded-xl bg-surface" /></div></SiteShell>;
  }
  if (!c) {
    return <SiteShell hideFooter><div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground"><p>College not found.</p><Button asChild className="mt-4 rounded-full"><Link to="/colleges">Back to Colleges</Link></Button></div></SiteShell>;
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


  return (
    <SiteShell hideFooter>
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
          <Button asChild variant="outline" className="mt-3 w-full rounded-full">
            <Link to="/community/$collegeId" params={{ collegeId: id }}><MessageCircle className="mr-1 h-4 w-4" /> Campus Students Chats</Link>
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
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-sm text-destructive">{incidents.length + posts.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {INCIDENT_CATEGORIES.map((cat) => {
              const list = incidents.filter((i) => i.category === cat.key);
              const catPosts = posts.filter((p) => (p.category ?? "general") === cat.key);
              const count = list.length + catPosts.length;
              const sev = list.length ? Math.max(...list.map((i) => i.severity ?? 1)) : 0;
              const open = openCat === cat.key;
              return (
                <div key={cat.key}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenCat(open ? null : cat.key)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenCat(open ? null : cat.key); } }}
                    style={{ borderRadius: "22px 7px 24px 7px / 7px 24px 7px 22px" }}
                    className={cn("sketch-card cursor-pointer p-4 text-left", open ? "border-[#2d5da1]" : "border-border")}
                  >
                    <div className="text-2xl">{cat.emoji}</div>
                    <div className="mt-1 text-sm font-medium">{cat.label}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-bold">{count}</span>
                      {sev > 0 && <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", severityColor(sev))}>S{sev}</span>}
                      <Trend t={list[0]?.trend} />
                    </div>
                  </div>
                  {open && (
                    <div className="mt-2 space-y-2">
                      {list.map((i) => (
                        <div key={i.id} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                          <div className="font-medium">{i.title}</div>
                          <div className="text-xs text-muted-foreground">{i.affected_count} affected · severity {i.severity}</div>
                        </div>
                      ))}
                      {catPosts.map((p) => (
                        <div key={p.id} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                          <div className="line-clamp-2">{p.content}</div>
                          <div className="text-xs text-muted-foreground">{p.username} · {timeAgo(p.created_at)}</div>
                        </div>
                      ))}
                      {count === 0 && <p className="text-sm text-muted-foreground">No reports in this category.</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

        {/* Verified evidence */}
        <section className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            Verified Evidence
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-sm text-success">{evidence.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {evidence.map((e) => (
              <a key={e.id} href={e.file_url} target="_blank" rel="noreferrer" className="group rounded-xl border border-border bg-surface p-2">
                {e.type === "image" ? (
                  <img src={e.file_url} alt="Verified evidence" loading="lazy" className="h-32 w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded-lg bg-surface-2 text-sm text-muted-foreground">{e.type} file</div>
                )}
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success">✓ Verified</div>
              </a>
            ))}
            {evidence.length === 0 && <p className="text-sm text-muted-foreground">No verified evidence yet.</p>}
          </div>
        </section>


        {/* Dark secrets feed */}
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Dark Secrets Feed</h2>
          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} userVote={myVotes[p.id] ?? null} onVoted={() => { postsQ.refetch(); myVotesQ.refetch(); }} />
            ))}
            {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet. Be the first to share the truth.</p>}
          </div>
        </section>
      </div>

      {/* Side chat icon */}
      <Link
        to="/community/$collegeId"
        params={{ collegeId: id }}
        className="fixed right-0 top-1/2 z-[60] -translate-y-1/2 rounded-l-xl bg-primary p-3 text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 hover:-translate-x-1 active:scale-95"
        title="Campus Students Chats"
      >
        <MessageCircle className="h-5 w-5" />
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

function PostCard({ post, userVote, onVoted }: { post: any; userVote: "up" | "down" | null; onVoted: () => void }) {
  const { hashedId } = useIdentity();
  const vote = useServerFn(votePost);
  const [voting, setVoting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    let active = true;
    supabase
      .from("post_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id)
      .then(({ count }) => { if (active) setCommentCount(count ?? 0); });
    return () => { active = false; };
  }, [post.id]);
  const doVote = async (dir: "up" | "down") => {
    if (!hashedId) return;
    setVoting(true);
    try {
      await vote({ data: { postId: post.id, dir, hashedId } });
      onVoted();
    } finally {
      setVoting(false);
    }
  };
  const upActive = userVote === "up";
  const downActive = userVote === "down";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <UserSymbol username={post.username} size="sm" />
        <span className="font-medium text-foreground">{post.username}</span>
        <span>· {timeAgo(post.created_at)}</span>
        <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 capitalize">{categoryLabel(post.category ?? "general")}</span>
      </div>
      <p className="mt-2 text-sm">{post.content}</p>
      <div className="mt-3 flex items-center gap-2">
        <button disabled={voting} onClick={() => doVote("up")} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs", upActive ? "bg-success/15 text-success" : "bg-surface-2 hover:text-success")}>
          <ArrowUp className="h-3.5 w-3.5" /> {post.upvotes}
        </button>
        <button disabled={voting} onClick={() => doVote("down")} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs", downActive ? "bg-destructive/15 text-destructive" : "bg-surface-2 hover:text-destructive")}>
          <ArrowDown className="h-3.5 w-3.5" /> {post.downvotes}
        </button>
        <button onClick={() => setCommentsOpen((o) => !o)} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs", commentsOpen ? "bg-primary/15 text-primary" : "bg-surface-2 hover:text-primary")}>
          <MessageCircle className="h-3.5 w-3.5" /> {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
        </button>
      </div>
      {commentsOpen && <PostComments postId={post.id} onCount={setCommentCount} />}
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
      const res = await rate({ data: { collegeId, hashedId, faculty: vals.faculty, placement: vals.placement, infrastructure: vals.infrastructure, campusLife: vals.campusLife, value: vals.value } });
      if (res && "alreadyRated" in res && res.alreadyRated) {
        toast.error("You've already rated this college.");
        onOpenChange(false);
        return;
      }
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
