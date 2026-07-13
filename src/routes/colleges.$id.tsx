import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Zap, MessageCircle, ArrowUp, ArrowDown, Star, TrendingUp, TrendingDown, Minus, Globe, Banknote, MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import { INCIDENT_CATEGORIES, categoryLabel } from "@/lib/categories";
import { ratingBarColor, severityColor, statusColor, timeAgo, ratingColor, inr } from "@/lib/format";
import { useIdentity } from "@/stores/identity";
import { submitRating, votePost } from "@/lib/content.functions";
import { cn } from "@/lib/utils";
import { UserSymbol } from "@/components/UserSymbol";
import { PostComments } from "@/components/PostComments";
import { useVerifiedUsernames } from "@/hooks/useVerified";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Linkify } from "@/components/Linkify";

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
  const verified = useVerifiedUsernames();
  const queryClient = useQueryClient();

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
    queryFn: async () =>
      (
        await supabase
          .from("posts")
          .select("*")
          .eq("college_id", id)
          .eq("status" as any, "published")
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
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
        <div className="border-2 border-ink bg-white p-6 shadow-ink-soft" style={{ borderRadius: "18px 6px 20px 6px / 6px 20px 6px 18px" }}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="font-display text-3xl md:text-4xl font-black text-ink tracking-tight leading-tight">{c.name}</h1>
              
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
                <span className="flex items-center gap-1 bg-surface px-2 py-1 rounded-md border border-ink/10"><MapPin className="h-3 w-3" /> {c.city}, {c.state}</span>
                <span className="bg-surface px-2 py-1 rounded-md border border-ink/10">{Array.isArray((c as any).types) && (c as any).types.length ? (c as any).types.join(", ") : [c.type].join(", ")}</span>
                <span className="bg-surface px-2 py-1 rounded-md border border-ink/10">Est. {c.established ?? "—"}</span>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {(c as any).website && (
                  <Button asChild variant="outline" size="sm" className="border-2 border-ink shadow-ink-soft font-bold rounded-lg hover:-translate-y-0.5 transition-transform">
                    <a href={(c as any).website.startsWith('http') ? (c as any).website : `https://${(c as any).website}`} target="_blank" rel="noreferrer">
                      <Globe className="mr-2 h-4 w-4" /> Official Website
                    </a>
                  </Button>
                )}

              </div>
              
              {(c as any).description && (
                <div className="mt-5 text-sm md:text-base text-ink/80 leading-relaxed font-medium">
                  {(c as any).description}
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-center md:items-end w-full md:w-auto shrink-0 bg-surface-2 p-4 rounded-xl border-2 border-ink shadow-ink-soft text-center min-w-[120px]">
              <div className="text-xs font-black uppercase tracking-widest text-ink/60 mb-1">Overall</div>
              <div className={cn("font-display text-5xl font-black", ratingColor(Number(c.total_rating ?? 0)))}>
                {Number(c.total_rating ?? 0).toFixed(1)}
              </div>
              <div className="flex items-center justify-center mt-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500 mr-1" />
                <span className="text-xs font-bold text-ink/70">{c.total_reviews ?? 0} reviews</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat n={posts.length} l="Total Reports" />
            <Stat n={incidents.filter((i) => i.status === "active").length} l="Active Incidents" />
            <div className="hidden md:block"><Stat n={c.total_reviews ?? 0} l="Reviews" /></div>
          </div>
          
          <div className="mt-6 flex flex-col md:flex-row gap-3">
            <Button asChild className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 shadow-ink-soft border-2 border-ink" style={{ borderRadius: "12px 4px 10px 4px" }}>
              <Link to="/report" search={{ college: id }}><Zap className="mr-2 h-5 w-5 fill-current" /> Report Incident</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 border-2 border-ink hover:-rotate-1 transition-transform" style={{ borderRadius: "4px 12px 4px 10px" }}>
              <Link to="/community/$collegeId" params={{ collegeId: id }}><MessageCircle className="mr-2 h-5 w-5" /> Campus Students Chats</Link>
            </Button>
          </div>
        </div>

        {/* Ratings breakdown */}
        <section className="mt-8 border-2 border-ink bg-white p-6 shadow-ink-soft" style={{ borderRadius: "6px 18px 6px 20px / 20px 6px 18px 6px" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Ratings Breakdown</h2>
            <Button size="sm" variant="outline" className="w-full sm:w-auto border-2 border-ink bg-postit text-ink shadow-ink-soft hover:-rotate-2 transition-transform" style={{ borderRadius: "12px 4px 10px 4px" }} onClick={() => setRatingOpen(true)}>
              <Star className="mr-1 h-4 w-4 fill-ink" /> Rate This College
            </Button>
          </div>
          <div className="mt-5 space-y-4">
            {cats.map((cat) => {
              const v = avg(cat.key);
              return (
                <div key={cat.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{cat.label}</span>
                    <span className="font-semibold">{Number(v).toFixed(1)}</span>
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

        <section className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
            Incident Reports
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-sm font-bold text-destructive shadow-sm">{incidents.length + posts.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {INCIDENT_CATEGORIES.map((cat) => {
              const list = incidents.filter((i) => i.category === cat.key);
              const catPosts = posts.filter((p) => (p.category ?? "general") === cat.key);
              const count = list.length + catPosts.length;
              const sev = list.length ? Math.max(...list.map((i) => i.severity ?? 1)) : 0;
              const open = openCat === cat.key;
              return (
                <div
                  key={cat.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenCat(open ? null : cat.key)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenCat(open ? null : cat.key); } }}
                  style={{ borderRadius: "22px 7px 24px 7px / 7px 24px 7px 22px" }}
                  className={cn("sketch-card cursor-pointer p-4 text-left border-2 shadow-ink-soft transition-transform hover:-translate-y-1", open ? "border-accent bg-accent/10" : "border-ink bg-white")}
                >
                  <div className="text-2xl">{cat.emoji}</div>
                  <div className="mt-1 text-sm font-medium">{cat.label}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold">{count}</span>
                    {sev > 0 && <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", severityColor(sev))}>S{sev}</span>}
                    <Trend t={list[0]?.trend} />
                  </div>
                </div>
              );
            })}
          </div>

          <Dialog open={!!openCat} onOpenChange={(v) => !v && setOpenCat(null)}>
            <DialogContent className="max-h-[85vh] overflow-y-auto border-2 border-ink bg-white p-6 shadow-ink sm:max-w-[600px]" style={{ borderRadius: "16px 6px 18px 4px / 6px 16px 4px 18px" }}>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-bold">
                  {openCat && INCIDENT_CATEGORIES.find((c) => c.key === openCat)?.emoji}{" "}
                  {openCat && INCIDENT_CATEGORIES.find((c) => c.key === openCat)?.label} Reports
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 space-y-3">
                {openCat && incidents.filter((i) => i.category === openCat).map((i) => (
                  <div key={i.id} className="border-2 border-ink bg-white p-4 shadow-ink-soft" style={{ borderRadius: "12px 4px 10px 4px" }}>
                    <div className="font-semibold">{i.title}</div>
                    <div className="mt-1 text-xs font-medium text-muted-foreground">{i.affected_count} affected · severity {i.severity}</div>
                  </div>
                ))}
                {openCat && posts.filter((p) => (p.category ?? "general") === openCat).map((p) => (
                  <div key={p.id} className="border-2 border-ink bg-white p-4 shadow-ink-soft" style={{ borderRadius: "4px 12px 4px 10px" }}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed"><Linkify text={p.content} /></div>
                    <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      {p.username}{p.username && verified.has(p.username) && <VerifiedBadge className="h-3.5 w-3.5" />} · {timeAgo(p.created_at)}
                    </div>
                  </div>
                ))}
                {openCat && incidents.filter((i) => i.category === openCat).length + posts.filter((p) => (p.category ?? "general") === openCat).length === 0 && (
                  <p className="rounded-lg border-2 border-dashed border-ink bg-surface-2 p-4 text-center text-sm font-medium text-muted-foreground">
                    No reports in this category.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </section>


        {/* Clustered incidents */}
        <section className="mt-8">
          <h2 className="mb-4 font-display text-xl font-bold">Top Clustered Incidents</h2>
          <div className="space-y-4">
            {incidents.slice(0, 5).map((i) => (
              <div key={i.id} className="border-2 border-ink bg-white p-5 shadow-ink-soft" style={{ borderRadius: "10px 16px 14px 10px / 16px 10px 16px 14px" }}>
                <div className="flex flex-col sm:flex-row sm:items-center items-start justify-between gap-2 sm:gap-3">
                  <h3 className="font-semibold">{i.title}</h3>
                  <span className={cn("shrink-0 rounded-full border-2 border-ink px-2 py-0.5 text-xs capitalize shadow-ink-soft", statusColor(i.status ?? "active"))}>{i.status}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-accent">{i.affected_count} students reported the same issue</p>
                {i.ai_summary && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{i.ai_summary}</p>}
                {i.ai_verdict && <p className="mt-3 rounded-lg border border-dashed border-warning bg-warning/10 p-2 text-xs font-medium text-warning">⚖️ {i.ai_verdict}</p>}
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
              <PostCard key={p.id} post={p} userVote={myVotes[p.id] ?? null} onVoted={() => { postsQ.refetch(); myVotesQ.refetch(); }} evidence={evidence.filter(e => e.post_id === p.id)} />
            ))}
            {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet. Be the first to share the truth.</p>}
          </div>
        </section>
      </div>

      {/* Side chat icon */}
      {!ratingOpen && !openCat && (
        <Link
          to="/community/$collegeId"
          params={{ collegeId: id }}
          className="fixed right-0 top-[60%] sm:top-1/2 z-[60] -translate-y-1/2 border-y-2 border-l-2 border-ink bg-accent p-3 text-accent-foreground shadow-ink transition-transform duration-200 hover:-translate-x-1 active:scale-95"
          style={{ borderRadius: "16px 0 0 16px" }}
          title="Campus Students Chats"
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2.5} />
        </Link>
      )}


      <RatingModal open={ratingOpen} onOpenChange={setRatingOpen} collegeId={id} onDone={() => { ratingsQ.refetch(); collegeQ.refetch(); router.invalidate(); }} />
      
    </SiteShell>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-ink bg-accent/5 p-3" style={{ borderRadius: "12px 6px 12px 6px / 6px 12px 6px 12px" }}>
      <div className="font-display text-2xl font-bold text-accent">{n}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{l}</div>
    </div>
  );
}
function Trend({ t }: { t?: string | null }) {
  if (t === "rising") return <TrendingUp className="h-3.5 w-3.5 text-destructive" />;
  if (t === "declining") return <TrendingDown className="h-3.5 w-3.5 text-success" />;
  return <Minus className="h-3.5 w-3.5 text-warning" />;
}

function PostCard({ post, userVote, onVoted, evidence = [] }: { post: any; userVote: "up" | "down" | null; onVoted: () => void; evidence?: any[] }) {
  const { hashedId } = useIdentity();
  const verified = useVerifiedUsernames();
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
  
  const queryClient = useQueryClient();
  const doVote = async (dir: "up" | "down") => {
    if (!hashedId) return;

    const isRemoving = userVote === dir;
    const newVote = isRemoving ? null : dir;

    // Snapshot
    const prevPosts = queryClient.getQueryData(["posts", post.college_id]);
    const prevMyVotes = queryClient.getQueryData(["my-votes", post.college_id, hashedId]);

    // Optimistic Update
    queryClient.setQueryData(["my-votes", post.college_id, hashedId], (old: any) => {
      if (!old) return old;
      return { ...old, [post.id]: newVote };
    });

    queryClient.setQueryData(["posts", post.college_id], (old: any) => {
      if (!old) return old;
      return old.map((p: any) => {
        if (p.id !== post.id) return p;
        let upChange = 0;
        let downChange = 0;
        if (userVote === "up") upChange -= 1;
        if (userVote === "down") downChange -= 1;
        if (newVote === "up") upChange += 1;
        if (newVote === "down") downChange += 1;
        return { ...p, upvotes: p.upvotes + upChange, downvotes: p.downvotes + downChange };
      });
    });

    setVoting(true);
    try {
      await vote({ data: { postId: post.id, dir, hashedId } });
      onVoted();
    } catch {
      // Revert on failure
      if (prevPosts) queryClient.setQueryData(["posts", post.college_id], prevPosts);
      if (prevMyVotes) queryClient.setQueryData(["my-votes", post.college_id, hashedId], prevMyVotes);
      toast.error("Failed to vote");
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
        <span className="inline-flex items-center gap-1 font-medium text-foreground">{post.username}{post.username && verified.has(post.username) && <VerifiedBadge />}</span>
        <span>· {timeAgo(post.created_at)}</span>
        <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 capitalize">{categoryLabel(post.category ?? "general")}</span>
      </div>
      <p className="mt-2 text-sm whitespace-pre-wrap break-words">
        <Linkify text={post.content} />
      </p>
      {evidence.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {evidence.map((e) => (
            <a key={e.id} href={e.file_url} target="_blank" rel="noreferrer" className="block">
              {e.type === "image" ? (
                <img src={e.file_url} loading="lazy" className="h-40 w-full rounded-lg object-cover border border-border" />
              ) : (
                <div className="flex h-16 w-full items-center justify-center rounded-lg bg-surface-2 border border-border text-xs text-muted-foreground">{e.type} file</div>
              )}
            </a>
          ))}
        </div>
      )}
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
  const [alreadyRatedOpen, setAlreadyRatedOpen] = useState(false);

  const submit = async () => {
    if (!hashedId) return;
    if (Object.values(vals).some((v) => v < 1)) { toast.error("Please rate all categories"); return; }
    setBusy(true);
    try {
      const res = await rate({ data: { collegeId, hashedId, faculty: vals.faculty, placement: vals.placement, infrastructure: vals.infrastructure, campusLife: vals.campusLife, value: vals.value } });
      if (res && "alreadyRated" in res && res.alreadyRated) {
        setAlreadyRatedOpen(true);
        onOpenChange(false);
        return;
      }
      toast.success("Thanks! Your anonymous rating was submitted.");
      onOpenChange(false);
      onDone();
    } catch { toast.error("Could not submit rating"); } finally { setBusy(false); }

  };

  return (
    <>
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
    
    <AlertDialog open={alreadyRatedOpen} onOpenChange={setAlreadyRatedOpen}>
      <AlertDialogContent className="border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white max-w-sm" style={{ borderRadius: "16px 5px 14px 5px / 5px 14px 5px 16px" }}>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display font-bold text-xl flex items-center gap-2">
            <span className="text-2xl">🚫</span> Already Rated
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/80 font-medium">
            You've already rated this college! We only allow one rating per user to keep things fair and accurate.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="bg-accent text-white font-bold hover:bg-accent/90 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all w-full" style={{ borderRadius: "10px" }}>
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
