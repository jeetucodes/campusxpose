import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Star, Tag, FolderOpen, Filter, TrendingUp, Clock, Search, Bug, Zap, Layout } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { listProjects } from "@/lib/projects.functions";
import { useFeatures } from "@/hooks/useFeatures";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/Footer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — CampusXpose" },
      {
        name: "description",
        content:
          "Discover student projects from across India. Rate, collaborate, and build together anonymously.",
      },
    ],
  }),
  component: ProjectsPage,
});

const ALL_TAGS = ["Web Dev", "Android", "iOS", "AI/ML", "Design", "Hardware", "Other"];

type Project = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  tags: string[] | null;
  looking_for_collaborators: boolean;
  owner_username: string;
  created_at: string;
  avgRating: number;
  avgRatingUi: number;
  avgRatingFunc: number;
  avgRatingConcept: number;
  avgRatingBugs: number;
  ratingCount: number;
};

function StarDisplay({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" strokeWidth={1.5} />
      <span className="font-display font-bold text-foreground ml-0.5">
        {rating > 0 ? rating.toFixed(1) : "—"}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-xs font-sans text-muted-foreground ml-1">({count})</span>
      )}
    </div>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const tilt = index % 2 === 0 ? "rotate-[0.5deg]" : "-rotate-[0.5deg]";
  
  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className={cn(
        "group sketch-card flex h-full flex-col overflow-hidden bg-white shadow-ink transition-transform hover:-translate-y-1 hover:shadow-ink-lg",
        tilt
      )}
      style={{ borderRadius: "20px 8px 18px 8px / 8px 18px 8px 20px" }}
    >
      {/* Image Container */}
      <div className="relative aspect-video w-full overflow-hidden border-b-2 border-ink bg-accent/5">
        {project.image_url ? (
          <img
            src={project.image_url}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FolderOpen className="h-12 w-12 text-ink/30" strokeWidth={1} />
          </div>
        )}
        
        {/* Collab Badge */}
        {project.looking_for_collaborators && (
          <div className="absolute right-3 top-3">
            <span className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-postit px-2.5 py-1 text-xs font-bold text-ink shadow-ink-soft wobbly-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ink"></span>
              </span>
              Collab Open
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="line-clamp-2 font-display text-xl font-bold text-foreground group-hover:text-accent transition-colors">
          {project.title}
        </h2>

        {project.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground font-sans">
            {project.description}
          </p>
        )}

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md border border-dashed border-ink/40 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
            >
              {tag}
            </span>
          ))}
          {project.tags && project.tags.length > 3 && (
            <span className="inline-flex items-center rounded-md border border-dashed border-ink/30 bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              +{project.tags.length - 3}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between border-t border-dashed border-ink/20 pt-4">
            <StarDisplay rating={project.avgRating} count={project.ratingCount} />
            <span className="text-xs font-mono font-bold bg-surface-2 px-2 py-1 rounded border border-ink/15 text-foreground">
              @{project.owner_username}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<"newest" | "rating">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const fetchProjects = useServerFn(listProjects);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects({ data: { tag: activeTag, sort } });
      setProjects(data as Project[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag, sort]);

  return (
    <SiteShell hideFooter>
      {/* Hand-drawn Hero Header */}
      <div className="relative border-b-2 border-ink bg-white overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="mx-auto max-w-5xl px-4 py-12 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="font-display text-4xl font-black text-foreground sm:text-5xl relative inline-block">
              🛠️ Discover Projects
              <span className="absolute -bottom-2 left-0 right-0 h-2 bg-accent/40 -rotate-1 rounded-sm wobbly-sm" />
            </h1>
            <p className="mt-4 text-base text-muted-foreground font-sans max-w-xl leading-relaxed font-medium">
              Explore innovative ideas built by students. Rate UI, functionality, concept and help catch bugs!
            </p>
          </div>
          <div className="shrink-0 mt-4 md:mt-0">
            <Button asChild size="lg" className="border-2 border-ink bg-accent text-accent-foreground font-display font-bold shadow-ink wobbly-md hover:shadow-ink-lg hover:-translate-y-1 transition-all px-6">
              <Link to="/projects/new" className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Submit Project
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-20 border-b-2 border-ink bg-paper/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 border-2 border-ink bg-white px-4 py-2 text-sm font-bold shadow-ink-soft hover:-translate-y-0.5 transition-transform",
              )}
              style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }}
            >
              <Filter className="h-4 w-4" />
              {filtersOpen ? "Hide Filters" : "Filter & Sort"}
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted-foreground font-display">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
              {(activeTag || sort !== "newest") && (
                <button
                  onClick={() => { setActiveTag(undefined); setSort("newest"); }}
                  className="text-xs font-bold text-accent underline underline-offset-2 ml-3 hover:text-ink"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Expandable Filters */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-dashed border-ink/20 pt-4"
              >
                <div className="space-y-5 pb-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-display mb-2.5">Sort by</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSort("newest")}
                        className={cn(
                          "flex items-center gap-1.5 border-2 border-ink px-4 py-1.5 text-sm font-bold transition-transform duration-100 hover:-rotate-2 wobbly-sm",
                          sort === "newest"
                            ? "bg-foreground text-background shadow-ink-soft"
                            : "bg-white text-muted-foreground hover:text-foreground"
                        )}
                        style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                      >
                        <Clock className="h-4 w-4" /> Newest
                      </button>
                      <button
                        onClick={() => setSort("rating")}
                        className={cn(
                          "flex items-center gap-1.5 border-2 border-ink px-4 py-1.5 text-sm font-bold transition-transform duration-100 hover:-rotate-2 wobbly-sm",
                          sort === "rating"
                            ? "bg-foreground text-background shadow-ink-soft"
                            : "bg-white text-muted-foreground hover:text-foreground"
                        )}
                        style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                      >
                        <TrendingUp className="h-4 w-4" /> Top Rated
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-display mb-2.5">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveTag(undefined)}
                        className={cn(
                          "border-2 border-ink px-4 py-1.5 text-sm font-bold transition-transform duration-100 hover:-rotate-2 wobbly-sm",
                          !activeTag
                            ? "bg-accent text-accent-foreground shadow-ink-soft"
                            : "bg-white text-muted-foreground hover:text-foreground"
                        )}
                        style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                      >
                        All
                      </button>
                      {ALL_TAGS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(activeTag === tag ? undefined : tag)}
                          className={cn(
                            "border-2 border-ink px-4 py-1.5 text-sm font-bold transition-transform duration-100 hover:-rotate-2 wobbly-sm",
                            activeTag === tag
                              ? "bg-accent text-accent-foreground shadow-ink-soft"
                              : "bg-white text-muted-foreground hover:text-foreground"
                          )}
                          style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Grid */}
      <main className="mx-auto max-w-5xl px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col h-[340px] animate-pulse bg-white border-2 border-dashed border-ink/20 overflow-hidden"
                style={{ borderRadius: "20px 8px 18px 8px / 8px 18px 8px 20px" }}
              >
                <div className="h-44 bg-muted/40" />
                <div className="flex-1 p-5 space-y-4">
                  <div className="h-5 bg-muted/40 rounded w-3/4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted/40 rounded" />
                    <div className="h-4 bg-muted/40 rounded w-5/6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-12 text-center max-w-md mx-auto py-16 px-6 border-2 border-ink bg-white shadow-ink wobbly-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-postit shadow-ink-soft mb-6">
              <Search className="h-8 w-8 text-ink" />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground">No projects found</h3>
            <p className="mt-3 text-sm text-muted-foreground font-sans leading-relaxed">
              {activeTag ? `No projects tagged "${activeTag}" right now.` : "Be the first to share your project with the community and get feedback!"}
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild className="border-2 border-ink bg-accent text-accent-foreground font-bold shadow-ink wobbly-sm hover:shadow-ink-lg transition-transform hover:-translate-y-1">
                <Link to="/projects/new">
                  <Plus className="mr-2 h-4 w-4" /> Submit a Project
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ProjectCard project={p} index={i} />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </SiteShell>
  );
}
